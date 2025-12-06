const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const {userId,env} = event;
  const tradesListCollections =
      env === "prod" ? "tradesList" : "test_tradesList";
  if (!userId) {
    return {
      code: 400,
      message: "缺少 userId",
    };
  }

  try {
    // ================================
    // 1. 查询交易总数
    // ================================
    const totalRes = await db
      .collection(tradesListCollections)
      .where({ userId })
      .count();

    const totalCount = totalRes.total || 0;

    // ================================
    // 2. 部分卖 + 已卖 数量统计
    // ================================
    let sellPercent = 0;
    if (totalCount > 0) {
      const sellRes = await db
        .collection(tradesListCollections)
        .where({
          userId,
          status: _.in(["partial", "sold"]),
        })
        .count();

      const sellCount = sellRes.total || 0;

      sellPercent = Number(((sellCount / totalCount) * 100).toFixed(2));
    }

    // ================================
    // 3. 查询最早的交易时间
    // ================================
    let firstTradeDays = 0;

    const firstRes = await db
      .collection(tradesListCollections)
      .where({ userId })
      .orderBy("buyTime", "asc")
      .limit(1)
      .get();

    if (firstRes.data.length > 0) {
      const firstTradeTime = firstRes.data[0].buyTime;
      const now = new Date();

      const diffMs = now - new Date(firstTradeTime);
      firstTradeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)); // 天数
    }

    return {
      code: 0,
      message: "统计成功",
      data: {
        totalCount,
        sellPercent,     // 已卖 + 部分卖 占比 %
        firstTradeDays,  // 第一笔交易到现在多少天
      },
    };

  } catch (err) {
    return {
      code: 500,
      message: "统计失败: " + err.message,
    };
  }
};
