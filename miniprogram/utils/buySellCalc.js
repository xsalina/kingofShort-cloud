// buySellCalc.js —— 已改成直接引用 number.js
// 不需要从页面传递 safeAdd 等函数

const {
  safeAdd,
  safeSubtract,
  safeMultiply,
  safeDivide,
} = require("./number.js");

function format(n) {
  return parseFloat(Number(n).toString());
}

const CONFIG = {
  steady: {
    buy: [
      { level: "A层", drop: [-5, -10], percent: 10 },
      { level: "B层", drop: [-10, -15], percent: 20 },
      { level: "C层", drop: [-15, -20], percent: 30 },
      { level: "D层", drop: [-20, -25], percent: 40 },
    ],
    sell: [
      { level: "A层", rise: [5, 8], percent: 10 },
      { level: "B层", rise: [8, 12], percent: 20 },
      { level: "C层", rise: [12, 18], percent: 30 },
      { level: "D层", rise: [18, 25], percent: 40 },
    ],
  },

  aggressive: {
    buy: [
      { level: "A层", drop: [-3, -6], percent: 10 },
      { level: "B层", drop: [-6, -10], percent: 20 },
      { level: "C层", drop: [-10, -15], percent: 30 },
      { level: "D层", drop: [-15, -20], percent: 40 },
    ],
    sell: [
      { level: "A层", rise: [3, 5], percent: 10 },
      { level: "B层", rise: [5, 8], percent: 20 },
      { level: "C层", rise: [8, 12], percent: 30 },
      { level: "D层", rise: [12, 18], percent: 40 },
    ],
  },
};

function buildBuyTable(cfg, P, cash, T) {
  let triggeredLevels = [];

  const table = cfg.buy.map((row) => {
    const minP = safeMultiply(P, safeAdd(1, row.drop[0] / 100),1);
    const maxP = safeMultiply(P, safeAdd(1, row.drop[1] / 100),1);
    // 买入层级触发修正版
    const triggered = T <= minP && T >= maxP;
    const buyAmount = safeMultiply(cash, row.percent / 100,1);
    const shares = T > 0 ? safeDivide(buyAmount, T, 1,1) : 0;

    const results = {
      level: row.level,
      percent: row.percent + "%",
      buyAmount: format(buyAmount),
      buyShares: format(shares),
      dropRange: `${row.drop[0]}% \n ~ \n ${row.drop[1]}%`,
      triggerRange: `${format(minP)} \n ~ \n ${format(maxP)}`,
      triggered,
      buySharesDetail: `${format(shares)}`,
    };
    if (triggered) triggeredLevels.push(results);
    return results;
  });
  const highest =
    triggeredLevels.length > 0
      ? triggeredLevels[triggeredLevels.length - 1]
      : null;

  return { table, highest };
}

function buildSellTable(cfg, P, hold, T) {
  let triggeredLevels = [];

  const table = cfg.sell.map((row) => {
    const minP = safeMultiply(P, safeAdd(1, row.rise[0] / 100),1);
    const maxP = safeMultiply(P, safeAdd(1, row.rise[1] / 100),1);
    const triggered = T > minP && T <= maxP;

    const sellShares = safeMultiply(hold, row.percent / 100, 1,1);
    const sellAmount = safeMultiply(sellShares, T,1);

    const results = {
      level: row.level,
      percent: row.percent + "%",
      sellShares: format(sellShares),
      sellAmount: format(sellAmount),
      riseRange: `${row.rise[0]}% \n ~ \n ${row.rise[1]}%`,
      triggerRange: `${format(minP)} \n ~ \n ${format(maxP)}`,
      triggered,
    };

    if (triggered) triggeredLevels.push(results);

    return results;
  });

  const highest =
    triggeredLevels.length > 0
      ? triggeredLevels[triggeredLevels.length - 1]
      : null;

  return { table, highest };
}

function buildTips(T, P, highestBuy, highestSell) {
  const diff = safeMultiply(safeDivide(safeSubtract(T, P), P), 100);

  let tips = "";

  if (diff > 0) {
    tips += `当前价格高于成本 ${format(diff)}%，`;
    if(!highestSell){
      tips += '可等待卖出层级触发后部分止盈'
    }
  } else {
    tips += `当前价格低于成本 ${format(Math.abs(diff))}%，`;
     if(!highestBuy){
      tips += '可在买入层级触发时逐步补仓'
    }
  }
 
  if (highestBuy)
    tips += `触发最高买入层级：${highestBuy.level} | ${highestBuy.buyShares}股 | 买入${highestBuy.buyAmount}`;
  if (highestSell)
    tips += `触发最高卖出层级：${highestSell.level} | ${highestSell.sellShares}股 | 收益${highestSell.sellAmount} `;

  return {
    tipsTextArray: [tips],
    diff,
  };
}

module.exports = {
  CONFIG,
  buildBuyTable,
  buildSellTable,
  buildTips,
};
