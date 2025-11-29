const wxCloud = require("../../utils/cloud.js");
const app = getApp();
Page({
  data: {
    monthProfit: null,
    totalProfit: null,
    transactions: [],
    loaded: false,
  },
  onLoad() {
    this.setData({
      userInfo: app.globalData.userInfo || null,
    });
  },
  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 0");
      this.getTabBar().setData({
        selected: 0,
      });
    }
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
      });
    }
    if (this.data.userInfo?.userId) {
      this.queryTradesList();
      this.queryTradesSummer();
    } else {
      this.setData({
        loaded: true,
      });
    }
  },
  goToAllRecords() {
    wx.navigateTo({
      url: "/subpackages/deal/list/index",
    });
  },
  queryTradesList() {
    wx.showLoading({ title: "加载数据中..." });
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "list",
          userId: this.data.userInfo?.userId,
          status: "", // 可选
          stockId: "", // 可选
          page: 1,
          pageSize: 10,
        },
      })
      .then((res) => {
        console.log("交易列表返回:", res);
        wx.hideLoading();
        this.setData({
          transactions: res?.result?.data?.tradesList,
          loaded: true,
        });
        console.log(res.result?.data?.trades);
      });
  },
  queryTradesSummer() {
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "summaryTotal",
          userId: this.data.userInfo?.userId,
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
