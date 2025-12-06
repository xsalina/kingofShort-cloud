const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;
const Decimal = require("decimal.js");
const { successResponse, failResponse } = require("./utils");

exports.main = async (event) => {
  try {
    const { action, userId, env } = event;

    const tradesListCollections =
      env === "prod" ? "tradesList" : "test_tradesList";

    if (!action) return failResponse({ message: "缺少参数 action " });
    if (["buy", "list", "summaryTotal"].includes(action) && !userId)
      return failResponse({ message: "缺少参数userId" });
    const now = db.serverDate();
    if (action === "buy") {
      const {
        stockId,
        stockName,
        market,
        currency,
        price,
        quantity,
        fee = 0,
        code,
      } = event;
      if (
        !stockId ||
        !stockName ||
        !market ||
        !currency ||
        !price ||
        !quantity
      ) {
        return failResponse({ message: "缺少买入必要参数" });
      }

      // 精确计算 avgCost
      const totalCost = new Decimal(price).times(quantity).plus(fee || 0);
      const avgCost = totalCost.div(quantity).toDecimalPlaces(3).toNumber();

      const newTrade = {
        userId,
        stockId,
        stockName,
        market,
        currency,
        price: Number(price),
        quantity: Number(quantity),
        remainingQuantity: Number(quantity), // 剩余未卖数量
        fee: Number(fee),
        avgCost,
        status: "unSold",
        buyTime: now,
        totalProfit: 0, // 累计收益
        lastSellTime: null, // 最近卖出时间
        sellRecords: [], // 卖出记录列表
        code,
      };

      const res = await db
        .collection(tradesListCollections)
        .add({ data: newTrade });
      return successResponse({
        message: "买入记录添加成功",
        data: { tradeId: res._id, ...newTrade },
      });
    } else if (action === "sell") {
      const { _id, sellQuantity, sellPrice, sellFee = 0 } = event;
      if (!_id || !sellQuantity || !sellPrice) {
        return failResponse({ message: "缺少卖出必要参数" });
      }

      // 查询买入记录
      const tradeRes = await db
        .collection(tradesListCollections)
        .doc(_id)
        .get();
      const trade = tradeRes.data;
      if (!trade) return failResponse({ message: "买入记录不存在" });

      const remainingDecimal = new Decimal(trade.remainingQuantity);
      const sellQtyDecimal = new Decimal(sellQuantity);

      if (sellQtyDecimal.gt(remainingDecimal)) {
        return failResponse({ message: "卖出数量不能大于剩余数量" });
      }

      // 卖出后剩余数量
      const newRemaining = remainingDecimal
        .minus(sellQtyDecimal)
        .toDecimalPlaces(3)
        .toNumber();

      // 卖出收益
      const profit = new Decimal(sellPrice)
        .minus(trade.avgCost)
        .times(sellQtyDecimal)
        .minus(sellFee)
        .toDecimalPlaces(3)
        .toNumber();

      // 更新累计收益
      const newTotalProfit = new Decimal(trade.totalProfit || 0)
        .plus(profit)
        .toDecimalPlaces(3)
        .toNumber();

      // 更新状态
      let newStatus = "unSold";
      if (newRemaining === 0) newStatus = "sold";
      else if (newRemaining < trade.quantity) newStatus = "partial";

      // 卖出记录
      const sellRecord = {
        sellTime: now,
        sellPrice: Number(sellPrice),
        sellQuantity: Number(sellQuantity),
        sellFee: Number(sellFee),
        avgCost: trade.avgCost,
        profit,
      };

      // 更新数据库
      await db
        .collection(tradesListCollections)
        .doc(_id)
        .update({
          data: {
            remainingQuantity: newRemaining,
            totalProfit: newTotalProfit,
            lastSellTime: now,
            status: newStatus,
            sellRecords: _.push(sellRecord),
          },
        });

      return successResponse({
        message: "卖出成功",
        data: {
          tradeId: _id,
          newRemaining,
          newStatus,
          totalProfit: newTotalProfit,
          lastSellTime: now,
          sellRecord,
        },
      });
    } else if (action === "list") {
      // -------- 查询交易列表 --------
      let { stockId, status, page = 1, pageSize = 10 } = event;

      const query = { userId };
      if (stockId) query.stockId = stockId;
      if (status) query.status = status;

      // 总数统计
      const totalRes = await db
        .collection(tradesListCollections)
        .where(query)
        .count();
      const total = totalRes.total;

      const skip = (page - 1) * pageSize;

      // 先按 buyTime 大致排序，后续手动再排序
      const res = await db
        .collection(tradesListCollections)
        .where(query)
        .orderBy("buyTime", "desc")
        .skip(skip)
        .limit(pageSize)
        .get();

      const list = res.data || [];

      // 计算每条记录的排序时间 B
      list.forEach((trade) => {
        let bt = trade.buyTime;
        let ls = trade.lastSellTime;

        // buyTime 处理
        if (bt) {
          bt = bt.toDate ? bt.toDate().getTime() : new Date(bt).getTime();
        } else {
          bt = 0;
        }

        // lastSellTime 处理
        if (ls) {
          ls = ls.toDate ? ls.toDate().getTime() : new Date(ls).getTime();
        } else {
          ls = 0;
        }

        // B = 两者较晚的那个时间
        trade.sortB = Math.max(bt, ls);
      });

      // 排序：sortB 越大（时间越晚）越前
      list.sort((a, b) => b.sortB - a.sortB);

      // 排 sellRecords
      list.forEach((trade) => {
        if (trade.sellRecords && trade.sellRecords.length > 0) {
          trade.sellRecords.sort((a, b) => {
            let tA = a.sellTime;
            let tB = b.sellTime;

            tA = tA.toDate ? tA.toDate() : new Date(tA);
            tB = tB.toDate ? tB.toDate() : new Date(tB);

            return tB - tA; // 越晚越前
          });
        }
      });

      return successResponse({
        data: { tradesList: list, total, page, pageSize },
      });
    } else if (action === "detail") {
      const { _id } = event;
      if (!_id) {
        return failResponse({ message: "id 必传" });
      }
      try {
        const res = await db.collection(tradesListCollections).doc(_id).get();
        const trade = res.data;
        if (!trade) return failResponse({ message: "未找到该交易记录" });

        // 对 sellRecords 按 sellTime 倒序
        if (trade.sellRecords && trade.sellRecords.length > 0) {
          trade.sellRecords.sort((a, b) => {
            let tA = a.sellTime;
            let tB = b.sellTime;
            if (tA.toDate) tA = tA.toDate();
            if (tB.toDate) tB = tB.toDate();
            return tB - tA; // 越晚的越前面
          });
        }

        return successResponse({
          data: trade,
        });
      } catch (err) {
        未找到该交易记录;
        return failResponse({ message: "查询失败", data: err });
      }
    } else if (action === "summaryTotal") {
      const nowDate = new Date();
      const startOfMonth = new Date(
        nowDate.getFullYear(),
        nowDate.getMonth(),
        1
      ); // 本月第一天

      const tradesRes = await db
        .collection(tradesListCollections)
        .where({ userId })
        .get();
      const trades = tradesRes.data;

      let totalProfitByCurrency = {};
      let monthProfitByCurrency = {};

      trades.forEach((trade) => {
        const currency = trade.currency || "UNKNOWN";

        totalProfitByCurrency[currency] =
          totalProfitByCurrency[currency] || new Decimal(0);
        monthProfitByCurrency[currency] =
          monthProfitByCurrency[currency] || new Decimal(0);

        // 有卖出记录才统计
        if (trade.sellRecords && trade.sellRecords.length > 0) {
          trade.sellRecords.forEach((sell) => {
            const profit = new Decimal(sell.profit || 0);
            totalProfitByCurrency[currency] =
              totalProfitByCurrency[currency].plus(profit);

            // 【关键】判断是否本月卖出
            let sellDate = sell.sellTime;
            if (sellDate && sellDate.toDate) sellDate = sellDate.toDate();

            if (sellDate >= startOfMonth) {
              monthProfitByCurrency[currency] =
                monthProfitByCurrency[currency].plus(profit);
            }
          });
        }
      });

      const totalProfit = {};
      const monthProfit = {};

      Object.keys(totalProfitByCurrency).forEach((key) => {
        totalProfit[key] = totalProfitByCurrency[key]
          .toDecimalPlaces(3)
          .toNumber();
        monthProfit[key] = monthProfitByCurrency[key]
          .toDecimalPlaces(3)
          .toNumber();
      });

      const totalProfitAll = Object.values(totalProfit)
        .reduce((acc, val) => new Decimal(acc).plus(val), new Decimal(0))
        .toDecimalPlaces(3)
        .toNumber();

      const monthProfitAll = Object.values(monthProfit)
        .reduce((acc, val) => new Decimal(acc).plus(val), new Decimal(0))
        .toDecimalPlaces(3)
        .toNumber();

      return successResponse({
        data: { totalProfit, monthProfit, totalProfitAll, monthProfitAll },
      });
    } else {
      return failResponse({
        message:
          "action 参数错误，只能是 buy / sell / summaryTotal / list / detail",
      });
    }
  } catch (e) {
    return failResponse({ message: "操作失败", data: e });
  }
};
