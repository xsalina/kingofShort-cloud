
const wxCloud = require("../../../utils/cloud.js");
const app = getApp();
Page({
  data: {
    stockList: [],

    marketOptions: [
      { label: "美股 ($)", market: "美股", currency: "$" },
      { label: "港股 (HK$)", market: "港股", currency: "HK$" },
      { label: "A股 (¥)", market: "A股", currency: "¥" },
    ],

    form: {
      name: "",
      market: "",
      currency: "",
    },

    editingIndex: -1,
    userInfo: null,
    disabled: false,
  },
  async onLoad() {
    const userInfo = await app.globalData.loginPromise;
    this.setData({ userInfo }); 
    this.queryTypeList(userInfo.userId);
  },

  // 名称输入
  onNameInput(e) {
    this.setData({
      "form.name": e.detail.value,
    });
  },

  // picker选择市场
  onMarketChange(e) {
    const index = e.detail.value;
    const item = this.data.marketOptions[index];

    this.setData({
      "form.market": item.market,
      "form.currency": item.currency,
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
    const index = e.currentTarget.dataset.index;
    const { _id } = this.data.stockList[index];
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
                stockId: _id,
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
  queryTypeList(userId) {
    wxCloud
      .call({
        name: "manageStockType",
        data: {
          userId: userId || this.data.userInfo?.userId,
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
    const { userInfo, form } = this.data;
    if(!form.name || !form.market || !form.currency){
      wx.showToast({ title: "请填写完整信息", icon: "none" });
      return; 
    }
    this.setData({ disabled: true });
    wxCloud
      .call({
        name: "manageStockType",
        data: {
          userId: userInfo?.userId,
          action: "add",
          ...form,
        },
      })
      .then((res) => {
        this.setData({ disabled: false });
        if (res.result.success) {
          wx.showToast({ title: res.result.message });
          this.queryTypeList();
          this.clearFormValue();
        }
      }).catch(() => {
        this.setData({ disabled: false });
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
