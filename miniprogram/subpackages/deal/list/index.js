const wxCloud = require("../../../utils/cloud");
const app = getApp();
Page({
  data: {
    tabs: [{
      label: "已卖", value: "sold"
    }, {
      label: "未卖", value: "unSold"
    }, {
      label: "部分卖", value: "partial"
    }],
    currentTabIndex: 0,
    page: 1,
    pageSize: 10,
    transactions: [],
    userInfo: null,
    loaded: false,

  },
  async onLoad() {
    const userInfo = await app.globalData.loginPromise;
    this.setData({ userInfo });
    this.queryTradesList();
  },
  switchTab(e) {
    this.setData({
      currentTabIndex: e.currentTarget.dataset.index,
      page: 1,
    }, () => {
      this.queryTradesList();
    });
  },
  queryTradesList() {
    wx.showLoading({ title: "加载数据中..." });
    this.setData({ loaded: false });
    const { userInfo, currentTabIndex, tabs, page, pageSize } = this.data;
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "list",
          userId: userInfo.userId,
          status: tabs[currentTabIndex].value, // 可选
          page,
          pageSize,
        },
      })
      .then((res) => {
        wx.hideLoading();
        this.setData({ transactions: res?.result?.data?.tradesList, loaded: true });
      });
  },
  onReachBottom() {
    const { page } = this.data;
    this.setData({ page: page + 1 }, () => {
      this.queryTradesList();
    });
  },

});
