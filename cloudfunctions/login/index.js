const cloud = require("wx-server-sdk");
const { v4: uuidv4 } = require("uuid");
const { successResponse, failResponse } = require("./utils.js");

// 初始化云开发，动态环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;


  const now = db.serverDate();
  let userId = "";
  let created = false;
  let userData = {};
  try {
    // 查询用户是否存在
    const userRes = await db.collection("users").where({ openid }).get();

    if (userRes.data.length > 0) {
      // 已存在 → 更新 lastLoginAt
      const user = userRes.data[0];
      userId = user.userId;
      await db
        .collection("users")
        .doc(user._id)
        .update({
          data: { lastLoginAt: now },
        });
      userData = {
        userId,
        openid: user.openid,
        createdAt: user.createdAt,
        lastLoginAt: now,
        settings: user.settings || {},
        data: user.data || {},
      };
    } else {
      // 新用户 → 创建 userId
      userId = uuidv4();
      created = true;
      userData = {
        userId,
        openid,
        createdAt: now,
        lastLoginAt: now,
        settings: {},
        data: {},
      };
      await db.collection("users").add({ data: userData });
      // === 这里就是你要求的：用户创建后自动插入默认股票类型 ===
      const defaultStockTypes = [
        { name: "特斯拉", market: "美股", currency: "$" },
        { name: "英伟达", market: "美股", currency: "$" },
        { name: "纳指 100 ETF", market: "美股", currency: "$" }
      ]
      const tasks = defaultStockTypes.map(item =>
        db.collection('stockTypes').add({
          data: {
            userId,
            ...item,
            isDeleted: false,
            createTime: db.serverDate()
          }
        })
      )
      await Promise.all(tasks)

    }

    return successResponse({
      data: { created, user: userData },
      message: "登录成功",
    });
  } catch (err) {
    return failResponse({ message: "登录失败: " + err.message, code: 1001 });
  }
};
