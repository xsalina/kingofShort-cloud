// utils/stock.js

const SINA_BASE_URL = "https://hq.sinajs.cn/list=";

/**
 * 识别股票代码类型并格式化
 * @param {String} code - 例如 "TSLA", "600519", "00700"
 * @returns {String} - 格式化后的代码 (gb_tsla, sh600519, rt_hk00700)
 */
function formatSymbol(code) {
  code = code.toLowerCase();

  // 1. 如果包含小数点 (GC=F, 000001.SS)，做个简单清洗
  if (code.includes(".")) {
    // 简单的去后缀逻辑，具体看你传入的数据格式
    code = code.split(".")[0];
  }

  // 2. 判断类型
  // === 美股 (纯字母) ===
  if (/^[a-z]+$/.test(code)) {
    return `gb_${code}`;
  }

  // === A股 (6开头是沪市sh, 0/3开头是深市sz, 4/8是北交所bj) ===
  if (/^\d+$/.test(code)) {
    if (code.startsWith("6")) return `sh${code}`;
    if (code.startsWith("0") || code.startsWith("3")) return `sz${code}`;
    if (code.startsWith("8") || code.startsWith("4")) return `bj${code}`;
  }

  // === 港股 (5位数字) ===
  // 这里简单处理，如果前端专门传了 hk 前缀更好
  if (code.length === 5 && /^\d+$/.test(code)) {
    return `rt_hk${code}`;
  }

  // 默认直接返回，防止误判
  return code;
}

/**
 * 获取股票实时价格
 * @param {String} symbol - 股票代码
 */
function getStockPrice(symbol) {
  return new Promise((resolve, reject) => {
    const formattedCode = formatSymbol(symbol);
    const url = `${SINA_BASE_URL}${formattedCode}`;

    wx.request({
      url: url,
      method: "GET",
      // 新浪接口是 GBK 编码，微信小程序默认是 UTF-8
      // 但幸运的是，数字和英文不需要转码，中文名称可能会乱码
      // 如果非常在意中文名乱码，需要引入 encoding 库，或者只用它的价格数据
      success: (res) => {
        const responseText = res.data;
        // 格式: var hq_str_gb_tsla="Tesla,245.50,..."

        try {
          const match = responseText.match(/="(.+)"/);
          if (!match || !match[1]) {
            reject("未查询到数据");
            return;
          }

          const dataStr = match[1];
          const values = dataStr.split(",");
          let result = {};

          // 新浪接口：A股和美股的数组索引不一样，需要分别处理
          if (formattedCode.startsWith("gb_")) {
            // === 美股解析 ===
            // [0]名称 [1]现价 [2]涨跌幅% [3]昨收 [25]成交量...
            result = {
              name: values[0], // 美股名通常是英文，不会乱码
              price: parseFloat(values[1]),
              changePct: parseFloat(values[2]),
              type: "US",
            };
          } else if (formattedCode.startsWith("rt_hk")) {
            // === 港股解析 ===
            // [0]英文名 [1]中文名 [6]现价 [8]涨跌幅 ...
            result = {
              name: values[0],
              price: parseFloat(values[6]),
              changePct: parseFloat(values[8]),
              type: "HK",
            };
          } else {
            // === A股解析 (sh/sz) ===
            // [0]名称(可能乱码) [1]开盘 [2]昨收 [3]现价 ...
            // 计算涨跌幅: (现价-昨收)/昨收 * 100
            const current = parseFloat(values[3]);
            const prevClose = parseFloat(values[2]);
            const pct = ((current - prevClose) / prevClose) * 100;

            result = {
              name: symbol, // A股名字大概率乱码，建议直接用传入的 code 或者前端自己存名字
              price: current,
              changePct: pct.toFixed(2),
              type: "CN",
            };
          }

          resolve(result);
        } catch (e) {
          reject("解析失败");
        }
      },
      fail: (err) => {
        reject("网络请求失败");
      },
    });
  });
}

// utils/stockSearch.js
// utils/stockSearch.js

// utils/stockSearch.js

/**
 * 搜索股票 (使用东方财富接口，JSON+UTF8，极其稳定)
 * @param {String} keyword - 搜名称、代码、拼音
 */
function searchStock(keyword) {
  return new Promise((resolve, reject) => {
    wx.request({
      // 东方财富搜索接口
      url: "https://searchapi.eastmoney.com/api/suggest/get",
      data: {
        input: keyword,
        type: "14", // 14 代表搜索全部类型的股票
        token: "D43BF722C8E33BD5D065984DAC255663", // 这是一个通用的公开 Token
        count: 10,
      },
      method: "GET",
      success: (res) => {
        // 接口结构: res.data.QuotationCodeTable.Data (数组)
        const root = res.data.QuotationCodeTable;
        if (!root || !root.Data) {
          resolve([]);
          return;
        }

        const rawList = root.Data;

        // 数据清洗与格式转换
        const results = rawList.map((item) => {
          // item 结构: { Code: "TSLA", Name: "特斯拉", QuoteID: "105.TSLA", ... }

          const name = item.Name;
          const stockCode = item.Code;
          const quoteId = item.QuoteID || ""; // 关键字段，类似 "105.TSLA"

          let market = "A股";
          let sinaSymbol = "";
          let currency = "¥";
          let code = "CN";
          // --- 逻辑分支：根据 QuoteID 前缀判断市场 ---
          // 东方财富规则:
          // 105, 106, 107 -> 美股
          // 116 -> 港股
          // 1 -> 沪A (SH)
          // 0 -> 深A (SZ)
          // 8 -> 北交所

          if (
            quoteId.startsWith("105.") ||
            quoteId.startsWith("106.") ||
            quoteId.startsWith("107.")
          ) {
            // === 美股 ===
            currency = "$";
            code = "US";
            market = "美股";
            sinaSymbol = "gb_" + stockCode.toLowerCase(); // gb_tsla
          } else if (quoteId.startsWith("116.")) {
            // === 港股 ===
            currency = "HK$";
            code = "HK";
            market = "港股";
            sinaSymbol = "rt_hk" + stockCode; // rt_hk00700
          } else if (quoteId.startsWith("1.")) {
            // === 沪A ===
            currency = "¥";
            code = "CN";
            market = "A股";
            sinaSymbol = "sh" + stockCode;
          } else if (quoteId.startsWith("0.")) {
            // === 深A ===
            currency = "¥";
            code = "CN";
            market = "A股";
            sinaSymbol = "sz" + stockCode;
          } else if (quoteId.startsWith("8.") || quoteId.startsWith("4.")) {
            // === 北交所 ===
            currency = "¥";
            code = "CN";
            market = "A股";
            sinaSymbol = "bj" + stockCode;
          }

          // 过滤掉我们无法识别类型的数据（比如基金、债券等）
          if (sinaSymbol === "") return null;

          return {
            name: name, // "特斯拉"
            stockCode, // "TSLA"
            symbol: sinaSymbol, // "gb_tsla" (给新浪接口用的)
            market: market,
            currency,
            code,
          };
        });
        // 过滤掉 null 的数据
        const finalResults = results.filter((item) => item !== null);

        resolve(finalResults.slice(0, 10));
      },
      fail: (err) => {
        console.error("搜索失败", err);
        resolve([]);
      },
    });
  });
}

module.exports = {
  getStockPrice,
  searchStock,
};
