const CLOUD_FUNCTION_NAME = 'login'

// 读取本地缓存完整用户信息
function getCacheUser() {
  return wx.getStorageSync('user') || null
}

// 保存完整用户信息到本地缓存
function saveCacheUser(user) {
  wx.setStorageSync('user', user)
}

/**
 * 无感登录函数
 * 1. 有缓存 → 返回缓存
 * 2. 无缓存 → 调用云函数获取 userData
 * 统一返回 success/fail 格式
 */
function silentLogin() {
  return new Promise((resolve, reject) => {
    const cached = getCacheUser()
    if (cached) {
      resolve({ success: true, fromCache: true, user: cached })
      return
    }

    wx.cloud.callFunction({ name: CLOUD_FUNCTION_NAME })
      .then(res => {
        const result = res.result
        if (result.success) {
          const user = result.data.user
          saveCacheUser(user)
          resolve({ success: true, fromCache: false, user })
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
