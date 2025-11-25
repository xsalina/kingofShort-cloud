Component({
  properties: {
    visible: { type: Boolean, value: false },
    tx: { type: Object, value: {} } // { price, remainingQty, costPerUnit }
  },
  data: {
    targetRate: 0,
    sellPrice: 0,
    sellQty: 0,
    sellFee: 0,
    estimatedProfit: 0
  },
  methods: {
    onTargetRateInput(e) {
      this.setData({ targetRate: parseFloat(e.detail.value)||0 }, this.updateEstimatedProfit);
    },
    onSellPriceInput(e) {
      this.setData({ sellPrice: parseFloat(e.detail.value)||0 }, this.updateEstimatedProfit);
    },
    onSellQtyInput(e) {
      this.setData({ sellQty: parseFloat(e.detail.value)||0 }, this.updateEstimatedProfit);
    },
    onSellFeeInput(e) {
      this.setData({ sellFee: parseFloat(e.detail.value)||0 }, this.updateEstimatedProfit);
    },
    updateEstimatedProfit() {
      const { sellPrice, sellQty, sellFee } = this.data;
      const { costPerUnit } = this.data.tx;
      const profit = (sellPrice * sellQty) - (costPerUnit * sellQty) - sellFee;
      this.setData({ estimatedProfit: profit.toFixed(2) });
    },
    confirmSell() {
      this.triggerEvent('sell', {
        sellPrice: this.data.sellPrice,
        sellQty: this.data.sellQty,
        sellFee: this.data.sellFee,
        estimatedProfit: this.data.estimatedProfit
      });
      this.setData({ visible: false });
    },
    cancel() {
      this.setData({ visible: false });
      this.triggerEvent('cancel');
    }
  }
})
