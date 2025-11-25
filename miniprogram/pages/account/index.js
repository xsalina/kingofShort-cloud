Page({
    data: {
  },
  onShow() {
    if (typeof this.getTabBar === "function" && this.getTabBar()) {
      console.log("设置 tabBar 选中项为 1");
      this.getTabBar().setData({
        selected: 1,
      });
    }
  },
  goMyTrades() {
    wx.navigateTo({
      url: "/subpackages/deal/list/index",
    });
  },

  goAddStockType() {
    wx.navigateTo({
      url: "/subpackages/deal/add-type/index",
    });
  },
});
