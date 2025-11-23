Page({
  data: {
    transaction: {
      id: 1,
      stockName: "特斯拉",
      currency: "$",
      buyPrice: 398.28,
      buyQty: 5,
      buyFee: 1.99,
      status: 'pending', // unsold / pending / partial / sold
      statusClass: 'tx-tag-pending',
      statusText: '挂单',
      sellList: [
        {sellPrice: 450, sellQty: 3, sellFee: 0.5, sellTime: '2025-11-16 14:30'},
        {sellPrice: 455, sellQty: 2, sellFee: 0.3, sellTime: '2025-11-17 10:00'}
      ]
    }
  },

  onLoad() {
    const tx = this.data.transaction;

    // 安全计算函数
    const factor = 1000000;
    function safeMultiply(a, b) { return Math.round(a*factor)*Math.round(b*factor)/(factor*factor); }
    function safeDivide(a, b) { if(b===0) return 0; return Math.round(a*factor)/Math.round(b*factor); }
    function safeAdd(a, b) { return (Math.round(a*factor)+Math.round(b*factor))/factor; }
    function safeSubtract(a, b) { return (Math.round(a*factor)-Math.round(b*factor))/factor; }

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

  // 挂单操作
  onSetPending() { wx.showToast({ title: '挂单成功', icon: 'success' }); },
  onCancelPending() { wx.showToast({ title: '已取消挂单', icon: 'none' }); },

  // 卖出操作
  onSell() { wx.showToast({ title: '卖出操作弹框或跳转', icon: 'none' }); }
});
