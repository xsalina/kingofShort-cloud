Component({

  /**
   * 页面的初始数据
   */
  data: {
    monthProfit:0,
    totalProfit:0,

    transactionssss: [
  {
    stockName: "特斯拉",
    price: 398,
    qty: 5,
    currency: "$",
    buyTime: "2025-11-16 10:20",
    sold: true,
    sellPrice: 498,
    sellQty: 5,
    sellTime: "2025-11-16 14:30",
    profit: 500
  },
  {
    stockName: "英伟达",
    price: 310,
    qty: 2,
    currency: "$",
    buyTime: "2025-11-17 09:50",
    sold: false,
    profit: 0
  }
]
  },
  properties: {
    showTipProps: Boolean,
    title:String,
    content:String
  },
  observers: {
    showTipProps: function(showTipProps) {
      this.setData({
        showTip: showTipProps
      });
    }
  },
  methods: {
    onClose(){
      this.setData({
        showTip: !this.data.showTip
      });
    },
  }
});
