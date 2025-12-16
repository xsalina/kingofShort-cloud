// cloudfunctions/analyzeStock/index.js
const cloud = require("wx-server-sdk");
const axios = require("axios");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ================= 配置区域 =================
let DEEPSEEK_API_KEY = process.env.DP_API_KEY;

// 本地调试兜底逻辑
if (!DEEPSEEK_API_KEY) {
  try {
    const localConfig = require("./config.local");
    DEEPSEEK_API_KEY = localConfig.DP_API_KEY;
    console.log("正在使用本地 config.local.js 中的 Key");
  } catch (e) {
    console.log("未找到本地配置文件，将仅依赖云端环境变量");
  }
}

if (!DEEPSEEK_API_KEY) {
  console.error("❌ 严重错误: 未找到 API Key！请检查云端环境变量或本地配置。");
}

const BASE_URL = "https://api.deepseek.com/chat/completions";

// 【修改点1】股票代码映射：删除了黄金
const SYMBOL_MAP = {
  "特斯拉": "TSLA",
  "英伟达": "NVDA",
  "苹果": "AAPL",
  "谷歌": "GOOGL"
};

// ================= 工具函数 =================

function calculateMA(closes, period) {
  if (!closes || closes.length < period) return 0;
  const slice = closes.slice(closes.length - period);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / period;
}

function calculateRSI(closes, period) {
  if (!closes || closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change; else losses += Math.abs(change);
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

// ================= 数据获取函数 (纯美股版) =================
async function fetchYahooData(symbol) {
  // 【修改点2】去掉了复杂的黄金判断和三级容灾，只保留新浪美股接口
  const lowerSymbol = symbol.toLowerCase();
  
  // 新浪美股接口
  const url = "https://stock.finance.sina.com.cn/usstock/api/jsonp_v2.php/var%20data=/US_MinKService.getDailyK?symbol=" + lowerSymbol + "&num=30";

  console.log(`正在请求美股真实数据(新浪): ${symbol}`);

  try {
    const response = await axios.get(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      timeout: 5000
    });

    // 解析新浪美股数据 (JSONP 格式清洗)
    const rawText = response.data;
    let jsonStr = "";
    
    // 提取括号内容
    const match = rawText.match(/\(([\s\S]*?)\)/);
    if (match && match[1]) {
      jsonStr = match[1];
    } else {
      jsonStr = rawText.split("=(")[1] || rawText; 
      jsonStr = jsonStr.split(");")[0];
    }

    const dataObj = JSON.parse(jsonStr);
    
    // 新浪美股格式: c 代表 close price
    if (Array.isArray(dataObj) && dataObj.length > 0) {
       return dataObj.map(item => parseFloat(item.c));
    }
    
    throw new Error("美股接口返回空数据");

  } catch (err) {
    console.error(`❌ 美股接口失败: ${err.message}`);
    throw new Error("美股行情获取超时，请重试");
  }
}

// ================= 主函数 =================
exports.main = async (event, context) => {
  const name = event.name;
  const symbol = SYMBOL_MAP[name];

  // 如果前端不小心传了"浙商黄金"，这里会拦截
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
    const ma10 = calculateMA(closes, 10);
    const rsi14 = calculateRSI(closes, 14);

    const dataDict = {
      名称: name,
      代码: symbol,
      当前价格: currentPrice.toFixed(2) + " USD", // 【修改点3】统一为 USD
      涨跌幅: changePct.toFixed(2) + "%",
      MA5: ma5.toFixed(2),
      MA10: ma10.toFixed(2),
      RSI指标: rsi14.toFixed(2)
      // 【修改点4】去掉了备注字段
    };

    // 3. 请求 DeepSeek AI
    // 【修改点5】去掉了黄金的 Prompt 判断逻辑，统一使用股票交易员身份
    const roleDesc = "你是一名华尔街股票交易员。";
    const logicDesc = "关注个股趋势和均线支撑。";

    const systemPrompt =
      roleDesc + "\n" +
      "请根据传入的数据，预测今天的行情并给出操作建议（买入/卖出/观望）。\n" +
      "分析逻辑：\n" +
      "1. " + logicDesc + "\n" +
      "2. 均线分析：\n" +
      "   - 若价格同时在 MA5 和 MA10 之上，为强势多头。\n" +
      "   - 若价格跌破 MA5 但在 MA10 之上，视为短期回调（支撑位看MA10）。\n" +
      "   - 若 MA5 下穿 MA10（死叉），警惕下跌趋势。\n" +
      "3. 严格基于RSI指标判断超买超卖 (RSI>70超买, <30超卖)。\n" +
      "4. 回答的第一句话必须包含品种名称。\n" +
      "5. 【重要】排版要求：请务必分段回答！不要写成一大段。建议按‘【当前分析】’、‘【风险提示】’、‘【操作建议】’分行描述。\n" +
      "请用口语化的中文回答，不要使用Markdown格式，直接输出纯文本。";

    const userPrompt = "请分析这个品种的数据：\n" + JSON.stringify(dataDict);
    
    console.log("正在请求 DeepSeek...");

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
          Connection: "close", 
        },
        timeout: 30000, 
        httpsAgent: new (require("https").Agent)({ rejectUnauthorized: false }),
      }
    );

    console.log("DeepSeek 返回成功");

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

    if (error.code === "ECONNRESET" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      clientMsg = "连线华尔街专线繁忙，请稍后重试"; 
    } else if (error.response && (error.response.status === 402 || error.response.status === 403)) {
      clientMsg = "请稍后重试或AI 服务额度不足";
    }

    return { success: false, msg: clientMsg };
  }
};