const {
  CONFIG,
  buildBuyTable,
  buildSellTable,
  buildTips,
} = require("../../../utils/buySellCalc.js");

Page({
  data: {
    lastBuyPrice: "423.28",
    cash: "10286",
    hold: "5",
    todayPrice: "454.53",
    mode: "steady",
    buyTable: [],
    sellTable: [],
    tips: "",
    swiperIndex:0,
    tabTranslateX: 0 // 背景块位移：0% 或 100%
  },

  onLoad() {
    this.calc();
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    const tabTranslateX = mode === 'steady' ? 0 : 100;
    this.setData({ mode ,tabTranslateX}, () => this.calc());
    // 【新增】点击后自动滚动吸顶
    this.scrollToSticky();
  },
  // 【核心功能】让页面滚动到 Tab 栏的位置
  scrollToSticky() {
    // 1. 获取 Tab 栏当前相对于屏幕顶部的距离 (rect.top)
    wx.createSelectorQuery()
      .select('.tab-wrapper')
      .boundingClientRect((rect) => {
        // 如果 rect.top > 0，说明 Tab 还在下面，需要滚上来
        // 如果 rect.top <= 0，说明 Tab 已经吸顶了，不需要动
        
        // 只有当 Tab 距离顶部还有距离时（比如还在屏幕中间），才执行滚动
        // 加个 2px 的容错
        if (rect && rect.top > 2) {
          
          // 2. 获取当前页面已经滚了多少 (scrollTop)
          wx.createSelectorQuery().selectViewport().scrollOffset((res) => {
            
            // 目标位置 = 当前已滚动距离 + Tab距离视口的距离
            const targetScrollTop = res.scrollTop + rect.top;

            // 3. 执行平滑滚动
            wx.pageScrollTo({
              scrollTop: targetScrollTop,
              duration: 300 // 300ms 丝滑动画
            });
          }).exec();
        }
      })
      .exec();
  },

  runCalc(){
    this.calc()
  },

  inputChange(e) {
    const key = e.currentTarget.dataset.field;
    this.setData({ [key]: e.detail.value}, () => this.calc());
  },

  calc() {
    // if(!lastBuyPrice || !cash || !hold || !todayPrice)return
    const { lastBuyPrice, cash, hold, todayPrice, mode } = this.data;

    const cfg = CONFIG[mode];
    const { table: buyTable, highest: highestBuy } = buildBuyTable(
      cfg,
      lastBuyPrice,
      cash,
      todayPrice
    );

    const { table: sellTable, highest: highestSell } = buildSellTable(
      cfg,
      lastBuyPrice,
      hold,
      todayPrice
    );

    const {tipsTextArray,diff} = buildTips(todayPrice, lastBuyPrice, highestBuy, highestSell);

    this.setData({
      buyTable,
      sellTable,
      tips:tipsTextArray,
      swiperIndex: diff > 0 ? 1 : 0
    });
  },
});
