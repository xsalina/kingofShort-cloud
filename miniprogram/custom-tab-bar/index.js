const app = getApp();
Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/index/index",
        text: "首页",
        iconPath: "/assets/images/index1.png",
        selectedIconPath: "/assets/images/index2.png",
      },
      {
        pagePath: "/pages/account/index",
        text: "个人中心",
        iconPath: "/assets/images/account1.png",
        selectedIconPath: "/assets/images/account2.png",
      },
    ],
    isIPX: app.globalData.isIPX,
  },
  lifetimes: {
    attached() {},
  },

  pageLifetimes: {
    show() {},
  },

  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const path = this.data.list[index].pagePath;
      this.setData({
        selected: index,
      });
      wx.switchTab({ url: path });
    },
    onAddTransaction() {
      wx.navigateTo({
        url: "/subpackages/deal/add-deal/index",
      });
    },
  },
});
