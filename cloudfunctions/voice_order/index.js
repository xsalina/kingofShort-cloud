// cloudfunctions/voice_order/index.js
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

// ⚠️ 记得确认你的 Key 是否有效 (建议用环境变量 process.env.ALI_API_KEY)
const BAILIAN_API_KEY = process.env.ALI_API_KEY; 

// ⏳ 轮询等待函数
// ⏳ 轮询等待函数 (保持不变)
async function waitForTask(taskId) {
  const maxRetries = 60; 
  for (let i = 0; i < maxRetries; i++) {
    const response = await axios.get(
      `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      { headers: { 'Authorization': `Bearer ${BAILIAN_API_KEY}` } }
    );
    const status = response.data.output.task_status;
    if (status === 'SUCCEEDED') return response.data;
    if (status === 'FAILED') throw new Error(`阿里任务失败: ${JSON.stringify(response.data)}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('等待超时');
}

exports.main = async (event, context) => {
  const { fileID } = event;
  console.log("📂 收到录音 FileID:", fileID);

  try {
    // 1. 获取录音链接 (保留签名，不要 split!)
    const fileResult = await cloud.getTempFileURL({ fileList: [fileID] });
    const fileUrl = fileResult.fileList[0].tempFileURL;
    console.log("🔗 投喂链接:", fileUrl);

    // 2. 提交语音识别 (Paraformer)
    const submitResponse = await axios.post(
      'https://dashscope.aliyuncs.com/api/v1/services/audio/asr/transcription',
      {
        model: 'paraformer-v1',
        input: { file_urls: [fileUrl] },
        parameters: { language_hints: ['zh', 'en'] }
      },
      {
        headers: {
          'Authorization': `Bearer ${BAILIAN_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable' // 必须有这个
        }
      }
    );

    const taskId = submitResponse.data.output.task_id;
    
    // 3. 等待识别结果
    const taskResult = await waitForTask(taskId);
    
    // 4. 提取文字 (修复后的逻辑：去下载 transcription_url)
    let rawText = "";
    if (taskResult.output && taskResult.output.results) {
        const firstResult = taskResult.output.results[0];
        if (firstResult.transcription_url) {
            console.log("📥 正在下载识别结果...", firstResult.transcription_url);
            const transcriptionRes = await axios.get(firstResult.transcription_url);
            if (transcriptionRes.data.transcripts) {
                rawText = transcriptionRes.data.transcripts.map(t => t.text).join("");
            }
        } else if (firstResult.text) {
             rawText = firstResult.text;
        }
    }
    
    console.log("🗣️ 识别到的原文:", rawText);

    if (!rawText) {
        return { success: false, msg: '没有识别到语音内容', text: '' };
    }

    // 5. 🧠 核心大脑：调用大模型提取 JSON (Qwen-Turbo)
    console.log("🤖 正在进行语义分析...");
    const llmResponse = await axios.post(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        model: "qwen-turbo",
        messages: [
          {
            role: "system",
            content: `你是一个股票交易指令提取助手。
            1. 用户说："买入五百股腾讯控股，价格三百元"，提取为: [{"action":"buy", "stock":"腾讯控股", "qty":500, "price":300}]
            2. 如果用户只说了股票名如"特斯拉"，默认 action="buy", stock="特斯拉"。
            3. 如果用户说"卖出"，action="sell"。
            4. 必须返回纯 JSON 数组，不要包含 Markdown 格式（不要用 \`\`\`json 包裹）。
            5. 如果完全无关，返回 []。`
          },
          { role: "user", content: rawText }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${BAILIAN_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log('llmResponsed返回结果：',llmResponse)
    let jsonStr = llmResponse.data.choices[0].message.content;
    // 清理一下可能存在的 Markdown 符号
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    
    console.log("🧠 分析结果:", jsonStr);

    return {
      success: true,
      text: rawText,       // 原文
      data: JSON.parse(jsonStr) // 结构化数据
    };

  } catch (err) {
    console.error("❌ 错误:", err);
    return { 
      success: false, 
      msg: "系统繁忙",
      errorDetail: err.response ? err.response.data : err.message
    };
  }
}