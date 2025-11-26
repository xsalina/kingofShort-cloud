// cloudfunctions/manageStockType/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const { successResponse, failResponse } = require('./utils') // utils.js 同级

exports.main = async (event) => {
  try {
    const { userId, action, stockId, name, market, currency } = event

    if (!userId) return failResponse({ message: "缺少 userId" })

    if (action === "list") {
      // 查询用户股票类型，过滤已删除
      const res = await db.collection('stockTypes')
        .where({ userId, isDeleted: false })
        .orderBy('createTime', 'asc')
        .get()
      return successResponse({ data: res.data })

    } else if (action === "delete") {
      if (!stockId) return failResponse({ message: "缺少 stockId" })

      // 查询股票类型是否存在
      const stockRes = await db.collection('stockTypes')
        .where({ _id: stockId, userId, isDeleted: false })
        .get()

      if (stockRes.data.length === 0) {
        return failResponse({ message: "股票类型不存在或已删除" })
      }

      // 软删除
      await db.collection('stockTypes').doc(stockId).update({
        data: {
          isDeleted: true,
          deleteTime: db.serverDate()
        }
      })

      return successResponse({ message: "删除成功" })

    } else if (action === "add") {
      // 添加股票类型
      if (!name || !market || !currency) {
        return failResponse({ message: "缺少股票名称、市场或货币" })
      }

      const newStock = {
        userId,
        name,
        market,
        currency,
        isDeleted: false,
        createTime: db.serverDate()
      }

      const res = await db.collection('stockTypes').add({
        data: newStock
      })

      return successResponse({ message: "添加成功", data: { stockId: res._id, ...newStock } })

    } else {
      return failResponse({ message: "未知操作类型" })
    }

  } catch (e) {
    return failResponse({ message: "操作失败", data: e })
  }
}
