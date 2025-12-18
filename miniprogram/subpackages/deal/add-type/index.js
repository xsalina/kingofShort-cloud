
const wxCloud = require("../../../utils/cloud.js");
const { searchStock } = require("../../../utils/stock.js");
const app = getApp();
Page({
  data: {
    stockList: [],

    marketOptions: [
      { label: "美股 ($)", market: "美股", currency: "$", code: "USD" },
      { label: "港股 (HK$)", market: "港股", currency: "HK$", code: "HKD" },
      { label: "A股 (¥)", market: "A股", currency: "¥", code: "CNY" }
    ],
    inputName: '',
    searchResults: [], // 存储搜索结果
    isSearching: false,
    selectedSymbol: '', // 【重要】存储接口用的标准 symbol (如 gb_tsla)
    form: {
      market: "",
      currency: "",
      code:''
    },

    editingIndex: -1,
    userInfo: null,
    isAdding: false,
  },
  async onLoad() {
    this.setData({ userInfo:app.globalData.userInfo});
    this.queryTypeList();
  },
  editStock(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.stockList[index];

    this.setData({
      form: { ...item },
      editingIndex: index,
    });
  },

  deleteStock(e) {
    const id = e.currentTarget.dataset.id;
    const { userInfo } = this.data;
    const that = this;
    wx.showModal({
      title: "提示",
      content: "确认删除该股票名称吗？",
      success(res) {
        if (res.confirm) {
          wxCloud
            .call({
              name: "manageStockType",
              data: {
                userId: userInfo?.userId,
                action: "delete",
                stockId: id,
              },
            })
            .then((res) => {
              if (res.result.success) {
                wx.showToast({ title: res.result.message });
                that.queryTypeList();
              }
            });
        }
      },
    });
  },
  queryTypeList() {
    wxCloud
      .call({
        name: "manageStockType",
        data: {
          userId: this.data.userInfo?.userId,
          action: "list",
        },
      })
      .then((res) => {
        console.log("queryTypeList res:", res);
        if (res.result.success) {
          this.setData({ stockList: res.result.data });
        } else {
          wx.showToast({ title: res.result.message, icon: "none" });
        }
      });
  },
  addType() {
    const { userInfo, form,inputName,selectedSymbol} = this.data;
    if(!inputName || !form.market || !form.currency || !selectedSymbol){
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return; 
    }
    this.setData({ isAdding: true });
    wxCloud
      .call({
        name: "manageStockType",
        data: {
          userId: userInfo?.userId,
          action: "add",
          ...form,
          name:inputName,
          symbol:selectedSymbol
        },
      })
      .then((res) => {
        this.setData({ isAdding: false });
        if (res.result.success) {
          wx.showToast({ title: res.result.message });
          this.queryTypeList();
          this.clearFormValue();
        }else{
          wx.showToast({ title: res.result.message, icon: "none" });
        }
      }).catch(() => {
        this.setData({ isAdding: false });
         wx.showToast({ title: "添加失败", icon: "none" });
      });
  },
  clearFormValue() {
    this.setData({
      form: {
        name: "",
        market: "",
        currency: "",
      },
      editingIndex: -1,
    });
    this.clearInput()
  },
  // 1. 输入实时搜索
  onInputSearch(e) {
    const keyword = e.detail.value;
    this.setData({ inputName: keyword });

    // 防抖：输入为空或太短时不搜
    if (!keyword || keyword.length < 2) {
      this.setData({ searchResults: [] });
      return;
    }

    this.setData({ isSearching: true });

    // 调用搜索工具
    searchStock(keyword).then(list => {
      this.setData({ 
        searchResults: list,
        isSearching: false
      });
    }).catch(() => {
      this.setData({ isSearching: false });
    });
  },
  // 3. 【核心】选中下拉列表的一项
  // 选中下拉列表的一项
  selectStock(e) {
    const item = e.currentTarget.dataset.item;
    // item 现在是: { name: "特斯拉", code: "TSLA", symbol: "gb_tsla", ... }

    let targetIndex = -1;
    if (item.market === 'US') targetIndex = 0;
    if (item.market === 'HK') targetIndex = 1;
    if (item.market === 'CN') targetIndex = 2;

    this.setData({
      // 【关键】输入框显示中文名，用户看着才舒服
      inputName: item.name,      
      
      selectedSymbol: item.symbol, 
      searchResults: [],
      editingIndex: targetIndex,
      form: {
        market: this.data.marketOptions[targetIndex].market,
        currency: this.data.marketOptions[targetIndex].currency,
        code:this.data.marketOptions[targetIndex].code,
      }
    });
  },

  // 2. 清空输入
  clearInput() {
    this.setData({ 
      inputName: '', 
      searchResults: [],
      selectedSymbol: '',
      editingIndex: -1 // 重置市场选择
    });
  },
});
