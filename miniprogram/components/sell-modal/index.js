const {
  safeSubtract,
  safeMultiply,
  safeAdd,          
} = require("../../utils/number.js");
Component({
  properties: {
    visible: { type: Boolean, value: false },
    tx: {
      avgCost: Number,
      buyTime: String,
      currency: String,
      fee: Number,
      lastSellTime: String,
      price: Number,
      quantity: Number,
      remainingQuantity: Number,
      sellRecords: Array,
      status: String,
      stockId: String,
      stockName: String,
      totalProfit: Number,
      userId: String,
    },
  },
  data: {
    targetRate: 0,
    sellPrice: 0,
    sellQty: 0,
    sellFee: 0,
    estimatedProfit: 0,
  },
  observers: {
    // 监听 a、b、c 中任意一个发生变化就执行
    'sellPrice, sellQty, sellFee': function(sellPrice, sellQty, sellFee) {
      console.log("observer sellPrice, sellQty, sellFee:", { sellPrice, sellQty, sellFee });
      this.updateEstimatedProfit();
    }
  },
  methods: {
    onTargetRateInput(e) {
      this.setData({ targetRate: parseFloat(e.detail.value) || 0 });
    },
    onSellPriceInput(e) {
      this.setData({ sellPrice: parseFloat(e.detail.value) || 0 });
    },
    onSellQtyInput(e) {
      this.setData({ sellQty: parseFloat(e.detail.value) || 0 });
    },
    onSellFeeInput(e) {
      this.setData({ sellFee: parseFloat(e.detail.value) || 0 });
    },
    updateEstimatedProfit() {
      const { sellPrice, sellQty, sellFee,tx } = this.data;
      if (!sellPrice || !sellQty) {
        this.setData({ estimatedProfit: 0 });
        return;
      }
      const { avgCost } = tx ;
      const pofit = safeSubtract(safeMultiply(safeSubtract(sellPrice,avgCost),sellQty),sellFee);
      this.setData({ estimatedProfit: pofit});
    },
    confirmSell() {
      this.triggerEvent("sell", {
        sellPrice: this.data.sellPrice,
        sellQty: this.data.sellQty,
        sellFee: this.data.sellFee,
        estimatedProfit: this.data.estimatedProfit,
      });
      this.setData({ visible: false });
    },
    cancel() {
      this.setData({ visible: false });
      this.triggerEvent("cancel");
    },
  },
});
