const {
  safeSubtract,
  safeMultiply,
  safeAdd,
} = require("../../utils/number.js");
Component({
  properties: {
    show: { type: Boolean, value: false },
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
    sellPrice: "",
    sellQty: "",
    sellFee: "",
    estimatedProfit: "",
    estimatedProfitText: "",
    keyboardHeight: 0,
    // 【新增】提交中状态，用于按钮 loading 和防抖
    submitting: false
  },
  // 【核心修改】组件生命周期
  lifetimes: {
    attached() {
      // 1. 定义监听函数
      this.onKeyboardChange = (res) => {
        // res.height 是当前键盘高度
        // 只有当高度真正变化时才更新，避免不必要的渲染
        if (res.height !== this.data.keyboardHeight) {
          this.setData({ keyboardHeight: res.height });
        }
      };
      // 2. 开启监听
      wx.onKeyboardHeightChange(this.onKeyboardChange);
    },
    
    detached() {
      // 3. 组件销毁时取消监听，防止内存泄漏
      if (this.onKeyboardChange) {
        wx.offKeyboardHeightChange(this.onKeyboardChange);
      }
    }
  },
  observers: {
    // 监听 a、b、c 中任意一个发生变化就执行
    "sellPrice, sellQty, sellFee": function (sellPrice, sellQty, sellFee) {
      console.log("observer sellPrice, sellQty, sellFee:", {
        sellPrice,
        sellQty,
        sellFee,
      });
      this.updateEstimatedProfit();
    },
    show: function (show) {
      if (!show) {
        // 延迟清空，防止动画没结束就变空了，体验不好
        setTimeout(() => {
          this.setData({
            sellPrice: "",
            sellQty: "",
            sellFee: "",
            predictProfit: null,
            submitting: false // 关闭时重置按钮状态
          });
        }, 300);
      }
    },
  },
  methods: {
    // 输入监听与自动计算
    onInput(e) {
      const field = e.currentTarget.dataset.field;
      this.setData({ [field]: e.detail.value });
    },
    // 阻止冒泡
    stopPropagation() {},

    // 关闭弹窗
    onClose() {
      // 【新增】无论点击遮罩、X号还是取消按钮，第一件事就是收起键盘
      wx.hideKeyboard();
      this.triggerEvent("close");
    },
    updateEstimatedProfit() {
      const { sellPrice, sellQty, sellFee, tx } = this.data;
      if (!sellPrice || !sellQty) {
        this.setData({ estimatedProfit: 0, estimatedProfitText: 0 });
        return;
      }
      const { avgCost } = tx;
      const pofit = safeSubtract(
        safeMultiply(safeSubtract(sellPrice, avgCost), sellQty),
        sellFee
      );
      const pofitValue = parseFloat(pofit);
      const estimatedProfitText = Math.abs(pofitValue);
      this.setData({ estimatedProfit: pofitValue, estimatedProfitText });
    },
    confirmSell() {
      // 1. 防重复点击拦截
      if (this.data.submitting) return;
      const { sellPrice, sellQty, sellFee, estimatedProfit, tx } = this.data;
      if (sellQty > tx.remainingQuantity) {
        return wx.showToast({
          title: `数量不能大于${tx.remainingQuantity}`,
          icon: "none",
        });
      }
      // 2. 设置提交中状态 (显示转圈圈)
      this.setData({ submitting: true });
      
      // 收起键盘
      wx.hideKeyboard();
      this.triggerEvent("confirm", {
        sellPrice,
        sellQty,
        sellFee,
        estimatedProfit,
      });
    },
    cancel() {
      this.triggerEvent("cancel");
    },
  },
});
