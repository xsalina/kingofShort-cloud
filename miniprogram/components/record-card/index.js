const { getStatusInfo } = require("../../utils/status");
const {
  safeSubtract,
  safeMultiply,
  safeAdd,
} = require("../../utils/number.js");
const { formatSmartTime } = require("../../utils/date.js");
Component({
  properties: {
    cardItem: {
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
    statusText: "",
    statusClass: "",
    // sellInfo: null,
    buyTimeText: "",
    sellTimeText: "",
    remianNumber: 0,
    totalProfitText:null,
  },
  observers: {
    cardItem(cardItem) {
      const newVal = cardItem.status;
      const { statusText, statusClass } = getStatusInfo(newVal);
      let remianNumber = 0;
      remianNumber = safeSubtract(
        cardItem.quantity,
        cardItem.remainingQuantity,
        0
      );
      this.setData({
        statusText,
        statusClass,
        remianNumber,
        buyTimeText: formatSmartTime(cardItem.buyTime),
        sellTimeText: formatSmartTime(cardItem.lastSellTime),
        totalProfitText:Math.abs(cardItem.totalProfit)
      });
    },
  },
  methods: {
    gotoDetail() {
      const { cardItem } = this.data;
      wx.navigateTo({
        url: `/subpackages/deal/deal-detail/index?itemId=${cardItem._id}`,
      });
    },
  },
});
