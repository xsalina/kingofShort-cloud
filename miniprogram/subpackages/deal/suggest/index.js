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
