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
    todayPrice: "449.25",
    mode: "steady",
    buyTable: [],
    sellTable: [],
    tips: "",
  },

  onLoad() {
    this.calc();
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode }, () => this.calc());
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
    console.log(5468856,'计算')
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

    const tips = buildTips(todayPrice, lastBuyPrice, highestBuy, highestSell);

    this.setData({
      buyTable,
      sellTable,
      tips,
    });
  },
});
