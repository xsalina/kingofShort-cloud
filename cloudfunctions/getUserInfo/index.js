// cloudfunctions/getUserInfo/index.js
const cloud = require("wx-server-sdk");
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { env } = event;
  const usersCollections = env === 'prod' ? 'users' : 'test_users'
  try {
    const userRes = await db.collection(usersCollections).where({ openid }).get();
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      // 自动更新 lastLoginAt
      await db.collection(usersCollections).doc(user._id).update({
        data: { lastLoginAt: db.serverDate() }
      });
      return {
        success: true,
        data: {
          userId: user.userId,
          name: user.name,
          phone: user.phone,
          openid: user.openid,
          createdAt: user.createdAt,
          lastLoginAt: new Date()
        }
      };
    } else {
      return { success: false, message: "用户未注册" };
    }
  } catch (err) {
    return { success: false, message: "查询失败: " + err.message };
  }
};
