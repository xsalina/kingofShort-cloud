const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const Decimal = require('decimal.js')
const { successResponse, failResponse } = require('./utils')

exports.main = async (event) => {
  try {
    const { action, userId } = event
    if (!userId || !action) return failResponse({ message: "缺少参数 action 或 userId" })

    const now = db.serverDate()

    if (action === "buy") {
      const { stockId, stockName, market, currency, price, quantity, fee = 0 } = event
      if (!stockId || !stockName || !market || !currency || !price || !quantity) {
        return failResponse({ message: "缺少买入必要参数" })
      }

      // 精确计算 avgCost
      const totalCost = new Decimal(price).times(quantity).plus(fee)
      const avgCost = totalCost.div(quantity).toDecimalPlaces(3).toNumber()

      const newTrade = {
        userId,
        stockId,
        stockName,
        market,
        currency,
        price: Number(price),
        quantity: Number(quantity),
        remainingQuantity: Number(quantity),  // 剩余未卖数量
        fee: Number(fee),
        avgCost,
        status: "unSold",
        buyTime: now,
        totalProfit: 0,       // 累计收益
        lastSellTime: null,   // 最近卖出时间
        sellRecords: []       // 卖出记录列表
      }

      const res = await db.collection('trades').add({ data: newTrade })
      return successResponse({ message: "买入记录添加成功", data: { tradeId: res._id, ...newTrade } })

    } else if (action === "sell") {
      const { tradeId, sellQuantity, sellPrice, sellFee = 0 } = event
      if (!tradeId || !sellQuantity || !sellPrice) {
        return failResponse({ message: "缺少卖出必要参数" })
      }

      // 查询买入记录
      const tradeRes = await db.collection('trades').doc(tradeId).get()
      const trade = tradeRes.data
      if (!trade) return failResponse({ message: "买入记录不存在" })

      const remainingDecimal = new Decimal(trade.remainingQuantity)
      const sellQtyDecimal = new Decimal(sellQuantity)

      if (sellQtyDecimal.gt(remainingDecimal)) {
        return failResponse({ message: "卖出数量不能大于剩余数量" })
      }

      // 卖出后剩余数量
      const newRemaining = remainingDecimal.minus(sellQtyDecimal).toDecimalPlaces(3).toNumber()

      // 卖出收益
      const profit = new Decimal(sellPrice).minus(trade.avgCost).times(sellQtyDecimal).minus(sellFee).toDecimalPlaces(3).toNumber()

      // 更新累计收益
      const newTotalProfit = new Decimal(trade.totalProfit || 0).plus(profit).toDecimalPlaces(3).toNumber()

      // 更新状态
      let newStatus = "unSold"
      if (newRemaining === 0) newStatus = "sold"
      else if (newRemaining < trade.quantity) newStatus = "partial"

      // 卖出记录
      const sellRecord = {
        sellTime: now,
        sellPrice: Number(sellPrice),
        sellQuantity: Number(sellQuantity),
        sellFee: Number(sellFee),
        avgCost: trade.avgCost,
        profit
      }

      // 更新数据库
      await db.collection('trades').doc(tradeId).update({
        data: {
          remainingQuantity: newRemaining,
          totalProfit: newTotalProfit,
          lastSellTime: now,
          status: newStatus,
          sellRecords: _.push(sellRecord)
        }
      })

      return successResponse({
        message: "卖出成功",
        data: { tradeId, newRemaining, newStatus, totalProfit: newTotalProfit, lastSellTime: now, sellRecord }
      })

    } else {
      return failResponse({ message: "action 参数错误，只能是 buy 或 sell" })
    }

  } catch (e) {
    return failResponse({ message: "操作失败", data: e })
  }
}
