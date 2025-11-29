// utils/cloud.js
const getEnv = () => {
  const accountInfo = wx.getAccountInfoSync();

  // envVersion 有三种：
  // "develop"（开发版） 
  // "trial"（体验版） 
  // "release"（正式版）
  const envVersion = accountInfo.miniProgram.envVersion;

  return envVersion === "release" ? "prod" : "test";
};

const call = async ({name, data = {}}) => {
    console.log("调用云函数:", name, data);
  const env = getEnv();
  console.log(`[Cloud] 调用云函数: ${name}，环境: ${env}`, data);
  return wx.cloud.callFunction({
    name,
    data: {
      ...data,
      env, // 自动附带环境信息
    }
  });
};

module.exports = {
  call,
  getEnv,
};
