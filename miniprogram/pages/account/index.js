const app = getApp();
Page({
  data: {
    userInfo: null,
    loaded: false,
  },
  async onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 1");
      this.getTabBar().setData({
        selected: 1,
      });
    }

    if (!app.globalData.userInfo || app.globalData.forceRefresh) {
      this.refreshData();
      app.globalData.forceRefresh = false;
    } else {
      this.setData({
        userInfo: app.globalData.userInfo,
        loaded: true,
      });
    }
  },
  // 刷新用户信息
  async refreshData() {
    this.setData({ loaded: false });
    const userInfo = await app.refreshUserInfo();
    this.setData({
      userInfo,
      loaded: true,
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
});
