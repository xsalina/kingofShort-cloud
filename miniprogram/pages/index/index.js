
const app = getApp();
Page({
  data: {
    monthProfit:null,
    totalProfit:null,
    transactions: [],
  },
  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 0");
      this.getTabBar().setData({
        selected: 0,
      });
    }
    const userInfo = await app.globalData.loginPromise;
    this.setData({ userInfo });
    this.queryTradesList();
    this.queryTradesSummer();
  },
  goToAllRecords() {
    wx.navigateTo({
      url: "/subpackages/deal/list/index",
    });
  },
  queryTradesList() {
    wx.showLoading({ title: "加载数据中..." });
    wx.cloud
      .callFunction({
        name: "trade",
        data: {
          action: "list",
          userId: this.data.userInfo.userId,
          status: "", // 可选
          stockId: "", // 可选
          page: 1,
          pageSize: 10,
        },
      })
      .then((res) => {
        wx.hideLoading();
        if (res.result.success) {
          this.setData({ transactions: res.result.data.tradesList });
          console.log(res.result.data.trades);
        }
      });
  },
  queryTradesSummer() {
    wx.cloud
      .callFunction({
        name: "trade",
        data: {
          action: "summaryTotal",
          userId: this.data.userInfo.userId,
        },
      })
      .then((res) => {
        if (res.result.success) {
          const { monthProfit, totalProfit } = res.result.data;
          this.setData({
            monthProfit,
            totalProfit,
          });
        }
      });
  },
});
