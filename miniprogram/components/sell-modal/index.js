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
    estimatedProfitText:0
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
        this.setData({ estimatedProfit: 0,estimatedProfitText:0 });
        return;
      }
      const { avgCost } = tx ;
      const pofit = safeSubtract(safeMultiply(safeSubtract(sellPrice,avgCost),sellQty),sellFee);
      const pofitValue = parseFloat(pofit)
      const estimatedProfitText = Math.abs(pofitValue)
      this.setData({ estimatedProfit:pofitValue,estimatedProfitText});
    },
    confirmSell() {
      const {sellPrice,sellQty,sellFee,estimatedProfit,tx} = this.data;
      if(sellQty > tx.remainingQuantity){
        return wx.showToast({title:`数量不能大于${tx.remainingQuantity}`,icon:'none'})
      }
      this.triggerEvent("sell", {
        sellPrice,
        sellQty,
        sellFee,
        estimatedProfit,
      });
      this.setData({ visible: false });
    },
    cancel() {
      this.setData({ visible: false });
      this.triggerEvent("cancel");
    },
  },
});
