const { getStatusInfo } = require("../../../utils/status");
const { safeMultiply, safeAdd } = require("../../../utils/number.js");
const { formatSmartTime } = require("../../../utils/date.js");
const app = getApp();
Page({
  data: {
    isIPX: app.globalData.isIPX,
    itemId: null,
    statusText: null,
    statusClass: null,
    detailInfo: null,
    buyTotalMoney: 0,
    showSellModal: false,
  },
  formatSmartTime,
  onLoad(options) {
    const itemId = options.itemId;
    this.setData({ itemId });
    this.queryTradesDetail(itemId);
  },

  // 卖出操作
  openSell(tx) {
    this.setData({ showSellModal: true });
  },
  handleCancel() {
    console.log("取消卖出");
  },
  queryTradesDetail(itemId) {
    wx.cloud
      .callFunction({
        name: "trade",
        data: {
          action: "detail",
          _id: itemId,
        },
      })
      .then((res) => {
        if (res.result.success) {
          const trade = res.result.data;
          // 格式化买入时间和最近卖出时间
          trade.buyTimeText = formatSmartTime(trade.buyTime);
          // 格式化卖出记录里的 sellTime
          trade.sellRecords = (trade.sellRecords || []).map((sell) => ({
            ...sell,
            sellTimeText: formatSmartTime(sell.sellTime),
          }));

          const { statusText, statusClass } = getStatusInfo(trade.status);
          const buyTotalMoney = safeAdd(
            safeMultiply(trade.price, trade.quantity),
            trade.fee
          );
          this.setData({
            detailInfo: trade,
            statusText,
            statusClass,
            buyTotalMoney,
          });
        }
      });
  },
  handleSell(e) {
    const { sellFee, sellPrice, sellQty } = e.detail;
    const { detailInfo, itemId } = this.data;
    wx.cloud
      .callFunction({
        name: "trade",
        data: {
          action: "sell",
          _id: detailInfo._id,
          sellQuantity: sellQty,
          sellPrice,
          sellFee,
        },
      })
      .then((res) => {
        if (res.result.success) {
          wx.showToast({ title: "卖出成功", icon: "success" });
          this.setData({ showSellModal: false });
          this.queryTradesDetail(itemId);
        } else {
          wx.showToast({ title: "卖出失败", icon: "error" });
        }
      });
  },
});
