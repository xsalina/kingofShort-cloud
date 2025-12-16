// cloudfunctions/analyzeStock/index.js
const cloud = require("wx-server-sdk");
const axios = require("axios"); // 请求AI

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ================= 配置区域 =================
// ================= 配置区域 =================
let DEEPSEEK_API_KEY = process.env.DP_API_KEY; // 先尝试获取云端环境变量

// 如果云端变量没取到（说明是本地调试），尝试加载本地配置文件
if (!DEEPSEEK_API_KEY) {
  try {
    // 这里的 ./config.local 对应刚才新建的文件
    const localConfig = require('./config.local'); 
    DEEPSEEK_API_KEY = localConfig.DP_API_KEY;
    console.log("正在使用本地 config.local.js 中的 Key");
  } catch (e) {
    // 如果文件不存在（比如上传到云端后），这里会报错，但没关系，catch 住就行
    console.log("未找到本地配置文件，将仅依赖云端环境变量");
  }
}

// 最后检查一下
if (!DEEPSEEK_API_KEY) {
  console.error("❌ 严重错误: 未找到 API Key！请检查云端环境变量或本地配置。");
}

const BASE_URL = "https://api.deepseek.com/chat/completions";

// 股票代码映射
const SYMBOL_MAP = {
  "特斯拉": "TSLA",
  "英伟达": "NVDA",
  "苹果": "AAPL",     // <--- 记得加这个！
  "谷歌": "GOOGL",    // <--- 还有这个！
  "浙商黄金": "GC=F",
  "黄金": "GC=F"
};

// ================= 工具函数 =================

// 1. 简单的均线计算
function calculateMA(closes, period) {
  if (!closes || closes.length < period) return 0;
  // 取最后 period 个数据
  const slice = closes.slice(closes.length - period);
  // 求和
  const sum = slice.reduce(function (a, b) {
    return a + b;
  }, 0);
  return sum / period;
}

// 2. 简单的 RSI 计算
function calculateRSI(closes, period) {
  if (!closes || closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// 3. 手动请求雅虎接口 (替代 yahoo-finance2)
async function fetchYahooData(symbol) {
  // 雅虎财经的公开 API 接口
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    symbol +
    "?interval=1d&range=1mo";

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0", // 伪装浏览器防止被拦截
      },
    });
    console.log("api_Key", DEEPSEEK_API_KEY);
    console.log(11, "雅虎API返回数据:", response);
    // 繁琐的层级检查，为了兼容 Node 12 不能用 ?.
    if (
      response.data &&
      response.data.chart &&
      response.data.chart.result &&
      response.data.chart.result.length > 0
    ) {
      const result = response.data.chart.result[0];
      const quote = result.indicators.quote[0];

      if (quote && quote.close) {
        // 过滤掉 null 值 (有时休市会有 null)
        const cleanCloses = quote.close.filter(function (price) {
          return price !== null;
        });
        return cleanCloses;
      }
    }
    throw new Error("数据格式错误");
  } catch (err) {
    console.error("雅虎API请求失败:", err.message);
    throw err;
  }
}

// ================= 主函数 =================
exports.main = async (event, context) => {
  console.log("调试检查 Key:", process.env.DP_API_KEY); // 看看打印出来是不是 undefined
  const name = event.name;
  const symbol = SYMBOL_MAP[name];

  if (!symbol) {
    return { success: false, msg: "不支持的品种" };
  }

  try {
    // 1. 获取行情
    const closes = await fetchYahooData(symbol);

    if (!closes || closes.length < 5) {
      return { success: false, msg: "数据不足，可能是网络问题或休市" };
    }

    // 2. 计算指标
    const currentPrice = closes[closes.length - 1];
    const prevClose = closes[closes.length - 2];
    const changePct = ((currentPrice - prevClose) / prevClose) * 100;

    const ma5 = calculateMA(closes, 5);
    const rsi14 = calculateRSI(closes, 14);

    const isGold = symbol === "GC=F";
    const currency = isGold || symbol.indexOf(".") === -1 ? "USD" : "CNY";

    const dataDict = {
      名称: name,
      代码: symbol,
      当前价格: currentPrice.toFixed(2) + " " + currency,
      涨跌幅: changePct.toFixed(2) + "%",
      "5日均线": ma5.toFixed(2),
      RSI指标: rsi14.toFixed(2),
      备注: isGold ? "国际金价锚点" : "",
    };

    // 3. 请求 DeepSeek AI
    let roleDesc = "你是一名华尔街股票交易员。";
    let logicDesc = "关注个股趋势和均线支撑。";
    
    if (name.indexOf("黄金") !== -1) {
      roleDesc = "你是一名资深的大宗商品交易员，专注于黄金走势分析。";
      logicDesc = "黄金受美元指数和避险情绪影响大。RSI>75通常回调风险极大。";
    }

    // 【核心修改】在 System Prompt 里强制要求带上名字
    const systemPrompt = roleDesc + "\n" +
      "请根据传入的数据，预测今天的行情并给出操作建议（买入/卖出/观望）。\n" +
      "分析逻辑：\n" +
      "1. " + logicDesc + "\n" +
      "2. 如果价格在5日均线之上，视为强势。\n" +
      "3. 严格基于RSI指标判断超买超卖 (RSI>70超买, <30超卖)。\n" +
      "4. 回答的第一句话必须包含品种名称。\n" +
      // 【新增】强制分段的要求
      "5. 【重要】排版要求：请务必分段回答！不要写成一大段。建议按‘【当前分析】’、‘【风险提示】’、‘【操作建议】’分行描述。\n" + 
      "请用口语化的中文回答，不要使用Markdown格式，直接输出纯文本。";

    const userPrompt = "请分析这个品种的数据：\n" + JSON.stringify(dataDict);
    console.log("正在请求 DeepSeek..."); // 加个日志

    // 【核心修改】增加 timeout 和 headers
    const aiRes = await axios.post(
      BASE_URL,
      {
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      },
      {
        headers: {
          Authorization: "Bearer " + DEEPSEEK_API_KEY,
          "Content-Type": "application/json",
          Connection: "close", // 【关键】告诉服务器请求完就关掉连接，不要保持，减少报错
        },
        timeout: 30000, // 【关键】设置 30秒 超时，防止挂死
        // 忽略 SSL 证书错误（仅在本地调试时有用，防止代理干扰）
        httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
      }
    );

    console.log("DeepSeek 返回成功"); // 加个日志

    // 安全获取返回值
    let aiAdvice = "AI 暂时无法回答";
    if (aiRes.data && aiRes.data.choices && aiRes.data.choices.length > 0) {
      aiAdvice = aiRes.data.choices[0].message.content;
    }

    return {
      success: true,
      data: Object.assign({}, dataDict, { aiAdvice: aiAdvice }),
    };
  } catch (error) {
    console.error("❌ 详细错误日志:", error);
    
    let clientMsg = "运行错误: " + error.message;

    // 【新增】专门处理超时和断连错误
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      clientMsg = "连线华尔街专线繁忙，请稍后重试"; // 这里换成你喜欢的文案
    } 
    // 处理 DeepSeek 余额不足 (402/403)
    else if (error.response && (error.response.status === 402 || error.response.status === 403)) {
       clientMsg = "请稍后再试或AI 服务额度不足";
    }

    return { 
      success: false, 
      msg: clientMsg 
    };
  }
};
