
const wxCloud = require("../../../utils/cloud.js");
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
  // picker选择市场
  onMarketChange(e) {
    console.log(345345,e)
    const {index} = e.currentTarget.dataset;
    const item = this.data.marketOptions[index];

    this.setData({
      "form.market": item.market,
      "form.currency": item.currency,
      "form.code": item.code,
      editingIndex:index
    });
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
    const { userInfo, form,inputName } = this.data;
    if(!inputName || !form.market || !form.currency){
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
  }
});
