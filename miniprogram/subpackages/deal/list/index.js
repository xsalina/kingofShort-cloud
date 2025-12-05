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
    hasMore:true,
  },
  async onLoad() {
    this.setData({ userInfo:app.globalData.userInfo});
    this.queryTradesList();
  },
  // 分享功能
  onShareAppMessage() {
    return {
      title: "短线必备工具，操作更轻松！",
      imageUrl:app.globalData.shareImageUrl
    };
  },
  switchTab(e) {
    this.setData({
      currentTabIndex: e.currentTarget.dataset.index,
      page: 1,
      hasMore:true,
      transactions:[]
    }, () => {
      this.queryTradesList();
    });
  },
  queryTradesList() {
    if(!this.data.hasMore)return;
    wx.showLoading({ title: "加载数据中..." });
    this.setData({ loaded: false });
    const { userInfo, currentTabIndex, tabs, page, pageSize,transactions } = this.data;
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
        const newList = res?.result?.data?.tradesList || []
        const list = transactions.concat(newList)
        const hasMore =  newList.length === this.data.pageSize;
        this.setData({ transactions: list, loaded: true ,hasMore });
      });
  },
  onReachBottom() {
    const { page } = this.data;
    this.setData({ page: page + 1 }, () => {
      this.queryTradesList();
    });
  },

});
