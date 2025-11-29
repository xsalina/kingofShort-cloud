
const wxCloud = require("./cloud.js");
// cloud.call("register", { phone, name })
//   .then(res => { 
//     console.log(res);
//   });

const CLOUD_FUNCTION_NAME = 'getUserInfo'
/**
 * 无感登录函数
 * 1. 有缓存 → 返回缓存
 * 2. 无缓存 → 调用云函数获取 userData
 * 统一返回 success/fail 格式
 */
function silentLogin() {
  return new Promise((resolve, reject) => {
    wxCloud.call({ name: CLOUD_FUNCTION_NAME })
      .then(res => {
        const result = res.result
        if (result.success) {
          const user = result.data;
          resolve({ success: true, user })
        } else {
          resolve({ success: false, message: result.message, code: result.code })
        }
      })
      .catch(err => {
        resolve({ success: false, message: err.message })
      })
  })
}

module.exports = { silentLogin }
