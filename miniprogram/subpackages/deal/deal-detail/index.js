const wxCloud = require("../../../utils/cloud.js");
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
    showCoinEffect: false,
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
    this.setData({ showSellModal: false });
    console.log("取消卖出");
  },
  queryTradesDetail(itemId) {
    wxCloud
      .call({
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
          trade.totalProfitText = Math.abs(trade.totalProfit);
          // 格式化卖出记录里的 sellTime
          trade.sellRecords = (trade.sellRecords || []).map((sell) => ({
            ...sell,
            profitText: Math.abs(sell.profit),
            sellTimeText: formatSmartTime(sell.sellTime),
          }));

          const { detailText, statusClass } = getStatusInfo(trade.status);
          const buyTotalMoney = safeAdd(
            safeMultiply(trade.price, trade.quantity),
            trade.fee
          );
          this.setData({
            detailInfo: trade,
            detailText,
            statusClass,
            buyTotalMoney: parseFloat(buyTotalMoney),
          });
        }
      });
  },
  handleSell(e) {
    const { sellFee, sellPrice, sellQty, estimatedProfit } = e.detail;
    const { detailInfo, itemId } = this.data;
    wxCloud
      .call({
        name: "trade",
        data: {
          action: "sell",
          _id: detailInfo._id,
          sellQuantity: sellQty,
          sellPrice,
          sellFee:sellFee || 0,
        },
      })
      .then((res) => {
        if (res.result.success) {
          // 2. 只有正收益才显示金币特效 (亏钱就不庆祝了)
          if (estimatedProfit > 0) {
            this.setData({
              profitAmount: `+${detailInfo.currency}${estimatedProfit}`,
              showCoinEffect: true,
            });
            // 震动一下，增加手感
            wx.vibrateShort({ type: "medium" });
          } else {
            wx.showToast({ title: "卖出成功", icon: "success" });
          }
          this.setData({ showSellModal: false });
          this.queryTradesDetail(itemId);
        } else {
          wx.showToast({ title: "卖出失败", icon: "error" });
        }
      });
  },
  // 特效播放完毕的回调
  onEffectFinish() {
    this.setData({ showCoinEffect: false });
    // 可以在这里刷新页面数据，或者弹个Toast
    wx.showToast({ title: "收益已落袋", icon: "none" });
  },
});
