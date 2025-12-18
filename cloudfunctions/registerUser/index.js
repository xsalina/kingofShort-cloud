// cloudfunctions/registerUser/index.js
const cloud = require("wx-server-sdk");
const { v4: uuidv4 } = require("uuid");

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { name, phone,env} = event;

  const usersCollections = env === 'prod' ? 'users' : 'test_users';
  const stockTypesCollections = env === 'prod' ? 'stockTypes' : 'test_stockTypes'

  if (!name || !phone) {
    return { success: false, message: "姓名和手机号不能为空" };
  }

  const now = db.serverDate();

  try {
    // 检查手机号是否已被注册
    const phoneRes = await db.collection(usersCollections).where({ phone }).get();
    if (phoneRes.data.length > 0) {
      return { success: false, message: "手机号已被注册" };
    }

    // 查询用户是否存在
    const userRes = await db.collection(usersCollections).where({ openid }).get();
    let userId = "";
    if (userRes.data.length > 0) {
      const user = userRes.data[0];
      userId = user.userId;
      // 更新信息和 lastLoginAt
      await db.collection(usersCollections).doc(user._id).update({
        data: { name, phone, lastLoginAt: now }
      });
      return { 
        success: true, 
        message: "用户已存在，信息已更新", 
        data: { userId, name, phone, openid }
      };
    } else {
      // 新用户
      userId = uuidv4();
      const newUser = {
        userId,
        openid,
        name,
        phone,
        createdAt: now,
        lastLoginAt: now,
        settings: {},
        data: {}
      };
      await db.collection(usersCollections).add({ data: newUser });

      // 默认股票类型
      const defaultStockTypes = [
        
        { name: "特斯拉",label: "美股 ($)", market: "美股", currency: "$", code: "USD",symbol:'gb_tsla' },
        { name: "英伟达",label: "美股 ($)", market: "美股", currency: "$", code: "USD",symbol:'gb_nvda' },
        { name: "纳指 100 ETF", label: "美股 ($)", market: "美股", currency: "$", code: "USD" ,symbol:'gb_qqq'},
      ];
      await Promise.all(defaultStockTypes.map(item =>
        db.collection(stockTypesCollections).add({
          data: {
            userId,
            ...item,
            isDeleted: false,
            createTime: db.serverDate()
          }
        })
      ));

      return {
        success: true,
        message: "注册成功",
        data: { userId, name, phone, openid }
      };
    }
  } catch (err) {
    return { success: false, message: "注册失败: " + err.message };
  }
};
