const wxCloud = require("../../utils/cloud.js");
const app = getApp();
Page({
  data: {
    monthProfit: null,
    totalProfit: null,
    transactions: [],
    loaded: false,
    isIpx: false,
  },
  async onLoad() {
    const userInfo = await app.refreshUserInfo();
    console.log("index onLoad 用户信息:", app.globalData.userInfo);
    this.setData({
      userInfo,
      isIpx: app.globalData.isIPX,
    });
    this.queryIndexData();
  },
  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 0");
      this.getTabBar().setData({
        selected: 0,
      });
    }
    console.log("index onShow 用户信息:", app.globalData.userInfo);
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
      });
    }
    this.queryIndexData();
  },
  // 分享功能
  onShareAppMessage() {
    return {
      title: "短线必备工具，操作更轻松！",
    };
  },
  queryIndexData() {
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
