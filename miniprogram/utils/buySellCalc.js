// buySellCalc.js —— 已改成直接引用 number.js
// 不需要从页面传递 safeAdd 等函数

const { safeAdd, safeSubtract, safeMultiply, safeDivide } = require("./number.js");

function format(n) {
  return parseFloat(Number(n).toString());
}

const CONFIG = {
  steady: {
    buy: [
      { level: "A层", drop: [-5, -10], percent: 10 },
      { level: "B层", drop: [-10, -15], percent: 20 },
      { level: "C层", drop: [-15, -20], percent: 30 },
      { level: "D层", drop: [-20, -25], percent: 40 }
    ],
    sell: [
      { level: "A层", rise: [5, 8], percent: 10 },
      { level: "B层", rise: [8, 12], percent: 20 },
      { level: "C层", rise: [12, 18], percent: 30 },
      { level: "D层", rise: [18, 25], percent: 40 }
    ]
  },

  aggressive: {
    buy: [
      { level: "A层", drop: [-3, -6], percent: 10 },
      { level: "B层", drop: [-6, -10], percent: 20 },
      { level: "C层", drop: [-10, -15], percent: 30 },
      { level: "D层", drop: [-15, -20], percent: 40 }
    ],
    sell: [
      { level: "A层", rise: [3, 5], percent: 10 },
      { level: "B层", rise: [5, 8], percent: 20 },
      { level: "C层", rise: [8, 12], percent: 30 },
      { level: "D层", rise: [12, 18], percent: 40 }
    ]
  }
};

function buildBuyTable(cfg, P, cash, T) {
  let triggeredLevels = [];

  const table = cfg.buy.map(row => {
    const minP = safeMultiply(P, safeAdd(1, row.drop[0] / 100));
    const maxP = safeMultiply(P, safeAdd(1, row.drop[1] / 100));

    const triggered = (T <= maxP && T > minP);

    if (triggered) triggeredLevels.push(row.level);

    const buyAmount = safeMultiply(cash, row.percent / 100);
    const shares = T > 0 ? safeDivide(buyAmount, T) : 0;

    return {
      level: row.level,
      percent: row.percent + "%",
      buyAmount: format(buyAmount),
      buyShares: format(shares),
      dropRange: `${row.drop[0]}% ~ ${row.drop[1]}%`,
      triggerRange: `${format(minP)} ~ ${format(maxP)}`,
      triggered
    };
  });

  const highest =
    triggeredLevels.length > 0 ? triggeredLevels[triggeredLevels.length - 1] : null;

  return { table, highest };
}

function buildSellTable(cfg, P, hold, T) {
  let triggeredLevels = [];

  const table = cfg.sell.map(row => {
    const minP = safeMultiply(P, safeAdd(1, row.rise[0] / 100));
    const maxP = safeMultiply(P, safeAdd(1, row.rise[1] / 100));

    const triggered = (T >= minP && T < maxP);

    if (triggered) triggeredLevels.push(row.level);

    const sellShares = safeMultiply(hold, row.percent / 100);
    const sellAmount = safeMultiply(sellShares, T);

    return {
      level: row.level,
      percent: row.percent + "%",
      sellShares: format(sellShares),
      sellAmount: format(sellAmount),
      riseRange: `${row.rise[0]}% ~ ${row.rise[1]}%`,
      triggerRange: `${format(minP)} ~ ${format(maxP)}`,
      triggered
    };
  });

  const highest =
    triggeredLevels.length > 0 ? triggeredLevels[triggeredLevels.length - 1] : null;

  return { table, highest };
}

function buildTips(T, P, highestBuy, highestSell) {
  const diff = safeMultiply(safeDivide(safeSubtract(T, P), P), 100);

  let tip = "";

  if (diff > 0) {
    tip += `当前价格高于成本 ${format(diff)}%，可等待卖出层级触发后部分止盈。`;
  } else {
    tip += `当前价格低于成本 ${format(Math.abs(diff))}%，可在买入层级触发时逐步补仓。`;
  }

  let extra = "";

  if (highestBuy) extra += `\n当前触发的最高买入层级：${highestBuy}（按该层级执行）。`;
  if (highestSell) extra += `\n当前触发的最高卖出层级：${highestSell}（按该层级执行）。`;

  return tip + extra;
}

module.exports = {
  CONFIG,
  buildBuyTable,
  buildSellTable,
  buildTips
};
