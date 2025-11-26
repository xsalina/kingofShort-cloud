const { safeMultiply, safeAdd, safeSubtract, safeDivide } = require('../../../utils/number.js');

const app = getApp();
Page({
  data: {
    isIPX: app.globalData.isIPX,
    transaction: {
      id: 1,
      stockName: "特斯拉",
      currency: "$",
      buyPrice: 398.28,
      buyQty: 5,
      buyFee: 1.99,
      status: 'partial', // unsold  / partial / sold
      statusClass: 'tx-tag-partial',
      statusText: '部分卖',
      sellList: [
        {sellPrice: 450, sellQty: 3, sellFee: 0.5, sellTime: '2025-11-16 14:30'},
        {sellPrice: 455, sellQty: 2, sellFee: 0.3, sellTime: '2025-11-17 10:00'}
      ]
    },
    showSellModal: false,
    selectedTx: {
      price:398.28,remainingQty: 2, buyFee:1.99, costPerUnit: 398.28,currency:'$'
    }
  },

  onLoad() {
    const tx = this.data.transaction;

    // 安全计算函数
    const factor = 1000000;
    // 计算买入总额 = 价格*数量 + 手续费
    tx.buyTotal = safeAdd(safeMultiply(tx.buyPrice, tx.buyQty), tx.buyFee);
    // 计算每笔卖出总额和收益
    tx.sellList = tx.sellList.map(item => {
      item.sellTotal = safeSubtract(safeMultiply(item.sellPrice, item.sellQty), item.sellFee);
      // 部分卖出收益按数量比例计算买入成本
      const proportionalBuyCost = safeMultiply(tx.buyTotal, safeDivide(item.sellQty, tx.buyQty));
      item.profit = safeSubtract(item.sellTotal, proportionalBuyCost);
      return item;
    });

    this.setData({ transaction: tx });
  },


  // 卖出操作
  openSell(tx) {
    this.setData({showSellModal: true });
  },
  handleSell(e) {
    console.log("卖出数据:", e.detail);
    // TODO: 处理卖出逻辑
  },
  handleCancel() {
    console.log("取消卖出");
  }
});
