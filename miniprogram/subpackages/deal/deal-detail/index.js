const wxCloud = require("../../../utils/cloud.js");
const { getStatusInfo } = require("../../../utils/status");
const {
  safeMultiply,
  safeAdd,
  safeSubtract,
} = require("../../../utils/number.js");
const { formatSmartTime } = require("../../../utils/date.js");
const { getStockPrice } = require("../../../utils/stock.js");
const tradingUtils = require("../../../utils/tradingTime.js");
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
    currentPrice: 0,
    futureEstimatedProfit: 0,
    futureEstimatedProfitText: "",
  },
  timer: null,
  formatSmartTime,
  onLoad(options) {
    const itemId = options.itemId;
    this.setData({ itemId });
    this.queryTradesDetail(itemId);
  },
  onShow() {
    this.startPolling();
  },
  onHide() {
    this.stopPolling();
  },
  /**
   * 生命周期函数--监听页面卸载
   * 比如点击左上角“返回”按钮退出当前页
   */
  onUnload() {
    this.stopPolling();
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
          this.setData(
            {
              detailInfo: trade,
              detailText,
              statusClass,
              buyTotalMoney: parseFloat(buyTotalMoney),
            },
            () => this.startPolling()
          );
        }
      })
      .catch((err) => {
        this.stopPolling();
        console.error("轮询报错:", err);
        // 可以在这里做一个容错：如果连续报错，就自动停止轮询，防止刷屏报错
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
          sellFee: sellFee || 0,
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
  // 跳转去策略推演
  goToStrategy() {
    // 假设你的详情页 data 里有这些字段
    const { symbol, remainingQuantity, avgCost, stockName, code } =
      this.data.detailInfo;
    // 携带参数跳转
    const params = {
      currentSymbol: symbol,
      stockName,
      stockCode: code,
      hold: remainingQuantity,
      lastBuyPrice: avgCost,
    };
    wx.navigateTo({
      url: `/subpackages/deal/suggest/index?params=${JSON.stringify(params)}`,
    });
  },
  // ---------------------------------------------------------
  // 核心修改：智能轮询控制
  // A股 (CNY) [09:30 - 11:30] - [13:00 - 15:00]

  // 港股 (HKD) [09:30 - 12:00] - [13:00 - 16:00]

  // 美股 (USD)

  // 夏令时 (3月中-11月初)：[21:30 - 04:00]

  // 冬令时 (11月初-3月中)：[22:30 - 05:00]
  // ---------------------------------------------------------
  startPolling() {
    // 1. 已清仓不查
    if (this.data.detailInfo.status === "sold") return;

    this.stopPolling();

    // 2. 立即查一次
    this.fetchRealTimePrice();

    // 3. 【核心】获取标准市场代码 (CN/US/HK)
    // 无论你存的是 'USD' 还是 'gb_tsla'，都由这个函数统一处理
    const standardMarket = this.getStandardMarket(this.data.detailInfo);

    // 4. 判断是否休市
    const isTrading = tradingUtils.isTradingTime(standardMarket);

    if (!isTrading) {
      console.log(
        `💤 ${standardMarket} 休市中 (货币:${this.data.detailInfo.market})，不启用定时器`
      );
      return;
    }

    console.log(`📈 ${standardMarket} 交易中，开启轮询...`);

    // 5. 开启定时器
    this.timer = setInterval(() => {
      // 双重检查
      if (tradingUtils.isTradingTime(standardMarket)) {
        this.fetchRealTimePrice();
      } else {
        console.log("🛑 收盘了，停止轮询");
        this.stopPolling();
      }
    }, 3000);
  },

  /**
   * 【新增】全能市场识别函数
   * 将 USD/HKD/CNY 或 symbol 转换为标准的 US/HK/CN
   */
  getStandardMarket(info) {
    // 1. 优先根据 market/currency 字段判断 (你现在的需求)
    // 注意：这里兼容了 info.market 存的是 'USD' 这种情况
    const marketVal = info.code;

    if (marketVal === "USD") return "US";
    if (marketVal === "HKD") return "HK";
    if (marketVal === "CNY") return "CN";

    // 2. 如果上面都没匹配到，作为兜底，根据 symbol 前缀判断
    const symbol = info.symbol || "";
    if (symbol.startsWith("gb_")) return "US";
    if (symbol.startsWith("rt_hk") || symbol.startsWith("hk")) return "HK";

    // 3. 实在不知道是什么，默认返回 CN (A股)
    return "CN";
  },

  // 停止轮询 (清空定时器)
  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer); // 核心清除 API
      this.timer = null; // 置空变量
      console.log("🛑 定时器已清除"); // 调试看日志用
    }
  },
  // 获取数据的具体逻辑
  fetchRealTimePrice() {
    const { detailInfo } = this.data;
    // 如果没有 symbol (比如老数据没关联)，直接不查，省流量
    if (!detailInfo?.symbol) return;

    getStockPrice(detailInfo.symbol)
      .then((data) => {
        console.log("获取成功:", data);
        const { price } = data;
        this.setData({
          currentPrice: price ? String(price) : "",
        });
        this.updateMarketData(price);
      })
      .catch((err) => {
        console.error("获取失败:", err);
        wx.showToast({ title: "行情获取失败", icon: "none" });
      })
      .finally(() => {
        wx.hideNavigationBarLoading();
      });
  },
  updateMarketData(price = 0) {
    const { detailInfo } = this.data;
    const futureEstimatedProfit = safeMultiply(
      safeSubtract(price, detailInfo.avgCost),
      detailInfo.remainingQuantity
    );
    this.setData({
      futureEstimatedProfit,
      futureEstimatedProfitText: Math.abs(futureEstimatedProfit),
    });
  },
});
