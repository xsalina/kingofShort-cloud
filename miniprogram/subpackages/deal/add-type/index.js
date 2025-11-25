Page({
  data: {
    stockList: [
      { name: "特斯拉", market: "美股", currency: "$" },
      { name: "苹果", market: "美股", currency: "$" }
    ],

    marketOptions: [
      { label: "美股 ($)", market: "美股", currency: "$" },
      { label: "港股 (HK$)", market: "港股", currency: "HK$" },
      { label: "A股 (¥)", market: "A股", currency: "¥" }
    ],

    form: {
      name: "",
      market: "",
      currency: ""
    },

    editingIndex: -1
  },

  // 名称输入
  onNameInput(e) {
    this.setData({
      "form.name": e.detail.value
    });
  },

  // picker选择市场
  onMarketChange(e) {
    const index = e.detail.value;
    const item = this.data.marketOptions[index];

    this.setData({
      "form.market": item.market,
      "form.currency": item.currency
    });
  },

  saveStock() {
    const { form, stockList, editingIndex } = this.data;

    if (!form.name || !form.market) return;

    if (editingIndex >= 0) {
      stockList[editingIndex] = { ...form };
    } else {
      stockList.push({ ...form });
    }

    this.setData({
      stockList,
      form: { name: "", market: "", currency: "" },
      editingIndex: -1
    });
  },

  editStock(e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.stockList[index];

    this.setData({
      form: { ...item },
      editingIndex: index
    });
  },

  deleteStock(e) {
    const index = e.currentTarget.dataset.index;
    const _this = this;

    wx.showModal({
      title: "提示",
      content: "确认删除该股票名称吗？",
      success(res) {
        if (res.confirm) {
          const list = _this.data.stockList;
          list.splice(index, 1);
          _this.setData({ stockList: list });
        }
      }
    });
  }
});
