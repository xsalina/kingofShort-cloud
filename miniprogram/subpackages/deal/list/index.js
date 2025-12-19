const wxCloud = require("../../../utils/cloud");
const app = getApp();
const HISTORY_KEY = "search_history";
Page({
  data: {
    tabs: [
      {
        label: "持有中",
        value: "unSold",
      },
      {
        label: "部分卖出",
        value: "partial",
      },
      {
        label: "已清仓",
        value: "sold",
      },
    ],
    currentTabIndex: 0,
    page: 1,
    pageSize: 10,
    transactions: [],
    userInfo: null,
    loaded: false,
    hasMore: true,
    searchKeyword: "",
    historyList: [], // 存储历史记录数组
    currentTabIndex: 0,
    swiperHeight: 600, // 给个默认高度，onload里会算
  },
  async onLoad() {
    this.setData({ userInfo: app.globalData.userInfo });
    this.queryTradesList();
  },
  // 分享功能
  // onShareAppMessage() {
  //   return {
  //     title: "短线必备工具，操作更轻松！",
  //     imageUrl: app.globalData.shareImageUrl,
  //   };
  // },
  onShow() {
    // 【新增】每次显示页面时，读取本地缓存
    this.loadHistory();
  },
  // 1. 仅仅是输入，不请求
  onInputKeyword(e) {
    this.setData({
      searchKeyword: e.detail.value,
    });
  },
  // 2. 点击搜索按钮 OR 键盘回车 -> 发起请求
  onSearch() {
    // 可以加个防抖或者空值判断
    const keyword = this.data.searchKeyword.trim();
    if (keyword) {
      // 【新增】保存搜索历史逻辑
      this.saveHistory(keyword);
    }
    this.resetData();
    this.queryTradesList();
  },
  // 3. 点击清除 -> 重置并查询
  onClear() {
    this.setData({ searchKeyword: "" });
    this.resetData();
    this.queryTradesList();
  },
  resetData() {
    this.setData({
      page: 1,
      hasMore: true,
      transactions: [],
    });
  },
  queryTradesList() {
    if (!this.data.hasMore) return;
    wx.showLoading({ title: "加载数据中..." });
    this.setData({ loaded: false });
    const {
      userInfo,
      currentTabIndex,
      tabs,
      page,
      pageSize,
      transactions,
      searchKeyword,
    } = this.data;
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "list",
          userId: userInfo.userId,
          status: tabs[currentTabIndex].value, // 可选
          stockName: searchKeyword,
          page,
          pageSize,
        },
      })
      .then((res) => {
        wx.hideLoading();
        const newList = res?.result?.data?.tradesList || [];
        const list = transactions.concat(newList);
        const hasMore = newList.length === this.data.pageSize;
        this.setData({ transactions: list, loaded: true, hasMore });
        setTimeout(() => {
          this.calcSwiperHeight();
        }, 100);
      });
  },
  onReachBottom() {
    const { page } = this.data;
    this.setData({ page: page + 1 }, () => {
      this.queryTradesList();
    });
  },

  // 1. 读取历史记录
  loadHistory() {
    const list = wx.getStorageSync(HISTORY_KEY) || [];
    this.setData({ historyList: list });
  },
  // 2. 点击清空历史
  onClearHistory() {
    wx.showModal({
      title: "提示",
      content: "确认清空历史搜索记录吗？",
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(HISTORY_KEY);
          this.setData({ historyList: [] });
        }
      },
    });
  },

  // 3. 点击某个历史标签 -> 自动填充并搜索
  onTapHistory(e) {
    const val = e.currentTarget.dataset.val;
    this.setData({ searchKeyword: val });
    this.onSearch(); // 触发搜索
  },
  // 【新增】保存历史记录的核心逻辑
  saveHistory(keyword) {
    let list = this.data.historyList;
    // A. 过滤掉重复的（如果你搜过这个词，先把它删掉，为了把它顶到最前面）
    list = list.filter((item) => item !== keyword);

    // B. 把新词加到最前面
    list.unshift(keyword);

    // C. 限制最大数量（比如只存 10 条）
    if (list.length > 8) {
      list = list.slice(0, 8);
    }
    // D. 更新视图和缓存
    this.setData({ historyList: list });
    wx.setStorageSync(HISTORY_KEY, list);
  },
  // 【新增】长按：删除单个历史
  onLongPressHistory(e) {
    const index = e.currentTarget.dataset.index;
    const val = e.currentTarget.dataset.val;
    wx.showModal({
      title: "提示",
      content: `确定删除 "${val}" 吗？`,
      success: (res) => {
        if (res.confirm) {
          this.deleteHistoryItem(index);
        }
      },
    });
  },
  // 【新增】执行删除单个逻辑
  deleteHistoryItem(index) {
    let list = this.data.historyList;

    // 1. 删除数组中对应索引的项
    list.splice(index, 1);

    // 2. 更新视图
    this.setData({ historyList: list });

    // 3. 更新缓存
    wx.setStorageSync(HISTORY_KEY, list);

    wx.showToast({ title: "已删除", icon: "none" });
  },
  // 1. 计算 Swiper 高度 (填满屏幕剩余空间)
  calcSwiperHeight() {
    const query = wx.createSelectorQuery();
    // 选择当前 Tab 下的内容容器
    const className = `.item-${this.data.currentTabIndex}`;

    query
      .select(className)
      .boundingClientRect((rect) => {
        if (rect) {
          // 获取列表高度，如果列表太短，至少给个 80vh 撑开
          let height = rect.height;
          // 加上底部 padding 的余量
          this.setData({ swiperHeight: height + 50 });
        }
      })
      .exec();
  },
  // 2. Tab 点击切换 (和以前一样)
  switchTab(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTabIndex === index) return;
    this.onChangeIndexList(index);
    // 不需要手动调接口，因为改变 currentTabIndex 会触发 Swiper 的 bindchange
    // 或者你可以手动调，但在 onSwiperChange 里防抖
  },
  onSwiperChange(e) {
    const index = e.detail.current;
    // 如果索引变了，就更新状态并加载数据
    if (this.data.currentTabIndex !== index || e.detail.source === "touch") {
      this.onChangeIndexList(index);
    }
  },
  onChangeIndexList(index) {
    this.setData(
      {
        currentTabIndex: index,
        page: 1,
        hasMore: true,
        transactions: [],
        loaded: false,
      },
      () => this.queryTradesList()
    );
  },
});
