const wxCloud = require("../../utils/cloud.js");
const app = getApp();
Page({
  data: {
    userInfo: null,
    loaded: false,
    stats: {},
  },
  onLoad() {
    this.setData({
      userInfo: app.globalData.userInfo || null,
      loaded: !!app.globalData.userInfo,
    });
    if (!app.globalData.userInfo) {
      this.refreshData();
      this.queryData();
    }
  },
  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 1");
      this.getTabBar().setData({
        selected: 1,
      });
    }
    if (app.globalData.forceRefresh) {
      this.refreshData();
      app.globalData.forceRefresh = false;
    }
  },
  // 分享功能
  onShareAppMessage() {
    return {
      title: "短线必备工具，操作更轻松！",
      imageUrl: app.globalData.shareImageUrl,
    };
  },
  // 刷新用户信息
  async refreshData() {
    wx.showLoading({ title: "更新中..." });
    const userInfo = await app.refreshUserInfo();
    wx.hideLoading();
    this.setData({
      userInfo,
      loaded: true,
    });
  },
  queryData() {
    wxCloud
      .call({
        name: "getUserStats",
        data: { userId: this.data.userInfo.userId },
      })
      .then((res) => {
        if (res.result.code === 0) {
          this.setData({ stats: res.result.data });
        }
        console.log("统计数据：", res.result);
      });
  },

  goRegister() {
    wx.navigateTo({
      url: "/pages/register/index",
    });
  },
  goMyTrades() {
    const { userInfo } = this.data;
    if (!userInfo?.userId) {
      wx.showToast({
        title: "请先注册 / 登录",
        icon: "none",
      });
      return;
    }
    wx.navigateTo({
      url: "/subpackages/deal/list/index",
    });
  },

  goAddStockType() {
    const { userInfo } = this.data;
    if (!userInfo?.userId) {
      wx.showToast({
        title: "请先注册 / 登录",
        icon: "none",
      });
      return;
    }
    wx.navigateTo({
      url: "/subpackages/deal/add-type/index",
    });
  },
  goSuggest() {
    wx.navigateTo({
      url: "/subpackages/deal/suggest/index",
    });
  },
});
