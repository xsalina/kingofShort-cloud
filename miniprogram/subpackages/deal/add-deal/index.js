const app = getApp();
const wxCloud = require("../../../utils/cloud.js");
const {
  safeMultiply,
  safeAdd,
  safeSubtract,
  safeDivide,
} = require("../../../utils/number.js");
const { searchStock } = require("../../../utils/stock.js");
Page({
  data: {
    disabled: false,
    clickCursorImg: "/assets/images/clickCursor.png",
    stockOptions: [],
    selectedStockIndex: -1,
    selectedStockObj: null,
    price: "",
    qty: "",
    rate: "",
    // 新增：买入手续费（用户输入）
    buyfee: "",
    buyCost: 0,
    suggestedSellPrice: null,
    suggestedProfit: null,
    userInfo: null,
    
    keyboardHeight: 0,

    // 输入框相关数据
    inputName: '',      // 输入框显示的文字
    searchResults: [],  // 搜索结果数组
    selectedStockObj: null, // 最终选中的对象
    
    // 定时器用于防抖 (防止每打一个字都发请求)
    searchTimer: null,
    // 【新增】标记当前聚焦的是否为搜索框
    isSearchFocus: false
  },
  async onLoad() {
    const userInfo = await app.refreshUserInfo();
    console.log("deal onLoad 用户信息:", app.globalData.userInfo);
    this.setData({
      userInfo,
    });
    // this.queryTypeList();
    this.wxOnKeyboard();
  },
  async onShow() {
    if (app.globalData.forceRefresh) {
      await this.refreshData();
      app.globalData.forceRefresh = false;
      this.setData({
        selectedStockIndex: -1,
        selectedStockObj: null,
      });
    }
    // this.queryTypeList();
  },
  // 分享功能
  onShareAppMessage() {
    return {
      title: "短线必备工具，操作更轻松！",
      imageUrl: app.globalData.shareImageUrl,
    };
  },
  onUnload() {
    wx.offKeyboardHeightChange();
  },
  // 刷新用户信息
  async refreshData() {
    wx.showLoading({ title: "更新中..." });
    const userInfo = await app.refreshUserInfo();
    wx.hideLoading();
    this.setData({
      userInfo,
    });
  },
  wxOnKeyboard() {
    // 监听键盘高度变化事件
    wx.onKeyboardHeightChange((res) => {
      // res.height 是当前键盘高度
      // 只有当高度真正变化时才更新，避免不必要的渲染
      if (res.height !== this.data.keyboardHeight) {
        this.setData({ keyboardHeight: res.height });
      }
    });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.field;
    this.setData({ [key]: e.detail.value }, () => this.updateTargetSellPrice());
  },
  /**
   * ★★★★★ 核心公式（已改为使用用户输入的 buyfee）
   * suggestedSellPrice = (买入总成本 × (1 + 目标收益率)) ÷ 数量
   */
  updateTargetSellPrice() {
    const { price, qty, rate, buyfee } = this.data;

    if (!price || !qty) {
      this.setData({ suggestedSellPrice: null, suggestedProfit: null });
      return;
    }
    // 总成本 = 买入价格×数量 + 用户输入手续费
    const buyCost = safeAdd(safeMultiply(price, qty), buyfee);
    // 目标总金额 = buyCost × (1 + 目标收益率)
    const targetRate = (rate || 10) / 100;
    const targetTotal = safeMultiply(buyCost, safeAdd(1, targetRate));
    // 建议卖出价 = 目标总金额 ÷ 数量
    const sp = safeDivide(targetTotal, qty);
    // 预期收益（不考虑卖出手续费）
    const profit = safeSubtract(safeMultiply(sp, qty), buyCost);
    this.setData({
      suggestedSellPrice: parseFloat(sp),
      suggestedProfit: parseFloat(profit),
      buyCost: parseFloat(buyCost),
    });
  },
  goRegister() {
    wx.navigateTo({
      url: "/pages/register/index",
    });
  },
  addTransaction() {
    const { price, qty, selectedStockObj, buyfee, userInfo } = this.data;
    if (!userInfo?.userId) return this.goRegister();
    if (!selectedStockObj)
      return wx.showToast({ title: "请选择股票名称", icon: "none" });
    if (!price || !qty)
      return wx.showToast({ title: "请输入价格和数量", icon: "none" });

    this.setData({ disabled: true });
    console.log("添加交易：", { price, qty, selectedStockObj, buyfee });
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "buy",
          userId: this.data.userInfo.userId,
          stockName: selectedStockObj.name,
          market: selectedStockObj.market,
          currency: selectedStockObj.currency,
          price,
          quantity: qty,
          fee: buyfee,
          code: selectedStockObj.code,
          symbol:selectedStockObj.symbol,
          stockCode:selectedStockObj.stockCode
        },
      })
      .then((res) => {
        this.setData({ disabled: false });
        if (res.result.success) {
          wx.showToast({ title: "添加交易成功", icon: "success" });
          wx.navigateBack();
        } else {
          wx.showToast({ title: res.result.message, icon: "none" });
        }
      })
      .catch((err) => {
        this.setData({ disabled: false });
        wx.showToast({ title: "添加交易失败", icon: "none" });
      });
  },

  onAddType() {
    wx.navigateTo({
      url: "/subpackages/deal/add-type/index",
    });
  },
  queryTypeList() {
    if (!this.data.userInfo?.userId) return;
    wx.showLoading({ title: "加载中..." });
    wxCloud
      .call({
        name: "manageStockType",
        data: {
          userId: this.data.userInfo?.userId,
          action: "list",
        },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({ stockOptions: res.result.data });
        } else {
          // wx.showToast({ title: res.result.message, icon: "none" });
        }
      });
  },
  // 1. 输入框输入事件
  onInputSearch(e) {
    const keyword = e.detail.value;
    this.setData({ inputName: keyword });

    if (!keyword) {
      this.setData({ searchResults: [] });
      return;
    }

    // 防抖处理：用户停止输入 500ms 后再搜索
    if (this.data.searchTimer) clearTimeout(this.data.searchTimer);
    
    this.data.searchTimer = setTimeout(() => {
      this.doSearch(keyword);
    }, 500);
  },
  // 执行搜索
  doSearch(keyword) {
    searchStock(keyword).then(results => {
      this.setData({ searchResults: results });
    }).catch(err => {
      console.error('搜索出错', err);
      this.setData({ searchResults: [] });
    });
  },
  // 2. 选中下拉列表某一项
  selectStock(e) {
    const item = e.currentTarget.dataset.item;
    
    console.log('用户选中了:', item);

    this.setData({
      inputName: item.name,       // 输入框显示中文名
      selectedStockObj: item,     // 存下完整的对象
      searchResults: [],          // 收起下拉列表
      
    });
  },
  // 3. 清空输入框
  clearInput() {
    this.setData({
      inputName: '',
      searchResults: [],
      selectedStockObj: null
    });
  },
  // 【新增】下方表单输入框聚焦时触发
  onFormFocus() {
    if (this.data.isSearchFocus) {
      this.setData({ isSearchFocus: false });
    }
  },
  // 【修改】搜索输入框聚焦时触发
  onInputFocus() {
    if (!this.data.isSearchFocus) {
      this.setData({ isSearchFocus: true });
    }
  },
});
