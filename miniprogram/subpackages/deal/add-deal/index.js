const app = getApp();
const {
  safeMultiply,
  safeAdd,
  safeSubtract,
  safeDivide,
} = require("../../../utils/number.js");
Page({
  data: {
    disabled:false,
    clickCursorImg: "/assets/images/clickCursor.png",
    stockOptions: [],
    selectedStockIndex: -1,
    selectedStockObj: null,
    price: 0,
    qty: 0,
    targetRate: 0,
    // 新增：买入手续费（用户输入）
    buyFeeInput: 0,
    suggestedSellPrice: null,
    suggestedProfit: null,
    userInfo: null,
  },

  async onLoad() {
    const userInfo = await app.globalData.loginPromise;
    this.setData({ userInfo });
    this.queryTypeList();
  },

  onStockChange(e) {
    const index = parseInt(e.detail.value);
    const stockObj = this.data.stockOptions[index];
    this.setData({
      selectedStockIndex: index,
      selectedStockObj: stockObj,
    });
    this.updateTargetSellPrice();
  },

  onPriceInput(e) {
    this.setData({ price: parseFloat(e.detail.value) || 0 });
    this.updateTargetSellPrice();
  },

  onQtyInput(e) {
    let numberQty = parseFloat(e.detail.value) || 0;
    this.setData({ qty: numberQty });
    this.updateTargetSellPrice();
  },

  // 用户输入 目标收益率（例如 10% → 0.1）
  onTargetRateInput(e) {
    this.setData({ targetRate: (parseFloat(e.detail.value) || 0) / 100 });
    this.updateTargetSellPrice();
  },

  // 新增：买入手续费输入
  onBuyFeeInput(e) {
    this.setData({
      buyFeeInput: parseFloat(e.detail.value) || 0,
    });
    this.updateTargetSellPrice();
  },

  /**
   * ★★★★★ 核心公式（已改为使用用户输入的 buyFeeInput）
   * suggestedSellPrice = (买入总成本 × (1 + 目标收益率)) ÷ 数量
   */
  updateTargetSellPrice() {
    const { price, qty, targetRate, buyFeeInput } = this.data;

    if (!price || !qty || !targetRate || targetRate <= 0) {
      this.setData({ suggestedSellPrice: null, suggestedProfit: null });
      return;
    }

    // 总成本 = 买入价格×数量 + 用户输入手续费
    const buyCost = safeAdd(safeMultiply(price, qty), buyFeeInput);

    // 目标总金额 = buyCost × (1 + 目标收益率)
    const targetTotal = safeMultiply(buyCost, safeAdd(1, targetRate));

    // 建议卖出价 = 目标总金额 ÷ 数量
    const sp = safeDivide(targetTotal, qty);

    // 预期收益（不考虑卖出手续费）
    const profit = safeSubtract(safeMultiply(sp, qty), buyCost);
    console.log("计算建议卖出价:", { buyCost, targetTotal, sp, profit });
    this.setData({
      suggestedSellPrice: sp,
      suggestedProfit: profit,
    });
  },

  addTransaction() {
    const { price, qty, selectedStockObj, buyFeeInput } = this.data;
    if (!selectedStockObj)
      return wx.showToast({ title: "请选择股票名称", icon: "none" });
    if (!price || !qty)
      return wx.showToast({ title: "请输入价格和数量", icon: "none" });
    this.setData({ disabled:true });
    console.log("添加交易：", { price, qty, selectedStockObj, buyFeeInput });
    wx.cloud.callFunction({
      name: "trade",
      data: {
        action: "buy",
        userId: this.data.userInfo.userId,
        stockId: selectedStockObj._id,
        stockName: selectedStockObj.name,
        market: selectedStockObj.market,
        currency: selectedStockObj.currency,
        price,
        quantity: qty,
        fee: buyFeeInput,
      },
    }).then((res) => {
      this.setData({ disabled:false });
      if (res.result.success) {
        wx.showToast({ title: "添加交易成功", icon: "success" });
        wx.navigateBack();
      } else {
        wx.showToast({ title: res.result.message, icon: "none" });
      }
    }).catch((err)=>{
      this.setData({ disabled:false });
      wx.showToast({ title: "添加交易失败", icon: "none" });
    });
  },

  onAddType() {
    wx.navigateTo({
      url: "/subpackages/deal/add-type/index",
    });
  },
  queryTypeList(userId) {
    wx.showLoading({ title: "加载中..." });
    wx.cloud
      .callFunction({
        name: "manageStockType",
        data: {
          userId: userId || this.data.userInfo?.userId,
          action: "list",
        },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({ stockOptions: res.result.data });
        } else {
          wx.showToast({ title: res.result.message, icon: "none" });
        }
      });
  },
});
