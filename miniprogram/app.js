// app.js
const globalData = require("/utils/globalData.js");
App({
  data: {
    globalData: {
      // userInfo: null, // 存储当前登录用户信息
    },
  },
  onLaunch: async function() {
    this.globalData = { ...globalData };
    await this.initCloundFun();
  },
  initCloundFun() {
    if (wx.cloud) {
      try {
        // 1️⃣ 你的云环境 ID（如果没用云开发，可以留空或注释）
        const ENV_ID = "cloud1-7gdq3emj774ac1dd"; // ⚠️ 如果启用云开发，这里填入你的云环境ID，例如 'cloud1-xxxxxx'

        if (ENV_ID && ENV_ID.trim() !== "") {
          // ✅ 正常初始化
          wx.cloud.init({
            env: ENV_ID,
            traceUser: true,
          });
          console.log("[Cloud] 已成功初始化环境：", ENV_ID);
        } else {
          // ⚠️ 没填 env 时仅提示，不报错
          console.warn("[Cloud] 未配置 env，跳过云开发初始化。");
        }
      } catch (e) {
        console.error("[Cloud] 初始化失败：", e);
      }
    } else {
      console.log("[Cloud] 当前基础库版本过低，不支持云能力。");
    }
  },
});
