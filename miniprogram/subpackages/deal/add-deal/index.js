const app = getApp();
const wxCloud = require("../../../utils/cloud.js");
// ❌ 删掉顶部的 recorder 定义，防止变量污染
// const recorder = wx.getRecorderManager(); 

const {
  safeMultiply,
  safeAdd,
  safeSubtract,
  safeDivide,
} = require("../../../utils/number.js");

Page({
  data: {
    disabled: false,
    clickCursorImg: "/assets/images/clickCursor.png",
    stockOptions: [],
    selectedStockIndex: -1,
    selectedStockObj: null,
    price: "",
    qty: "",
    rate: "",
    buyfee: "",
    buyCost: 0,
    suggestedSellPrice: null,
    suggestedProfit: null,
    userInfo: null,
    isRecording: false, // 录音状态标记
    unRegisterTypes: [
      { name: "黄金", market: "A股", currency: "¥", code: "CNY" },
      { name: "特斯拉", market: "美股", currency: "$", code: "USD" },
      { name: "小米", market: "A股", currency: "¥", code: "CNY" },
      { name: "阿里巴巴", market: "A股", currency: "¥", code: "CNY" },
      { name: "腾讯", market: "A股", currency: "¥", code: "CNY" },
      { name: "苹果", market: "美股", currency: "$", code: "USD" },
      { name: "英伟达", market: "美股", currency: "$", code: "USD" },
      { name: "纳指 100 ETF", market: "美股", currency: "$", code: "USD" },
    ],
    keyboardHeight: 0,
  },

  async onLoad() {
    const userInfo = await app.refreshUserInfo();
    console.log("deal onLoad 用户信息:", app.globalData.userInfo);
    this.setData({ userInfo });
    this.queryTypeList();
    this.wxOnKeyboard();

    
    this.recorderManager = wx.getRecorderManager();

  // 1. 监听录音正式开始（防止手抖导致文件为空）
  this.recorderManager.onStart(() => {
    console.log('🎙️ 录音硬件已就绪，开始录制');
    this.setData({ isRecordingReady: true }); 
  });

  this.recorderManager.onStop(async (res) => {
    // 重置状态
    this.setData({ isRecordingReady: false });
    
    const { tempFilePath, duration } = res;
    console.log(`⏱️ 录音结束，时长: ${duration}ms`);

    // 👇 这里是关键修复：不管成功失败，先尝试关掉旧的 Loading（如果有的话）
  // 或者只在 return 前关掉
  if (duration < 1000) {
      wx.hideLoading(); // <--- 必须加上这一句！！
      wx.showToast({ title: '说话时间太短', icon: 'none' });
      return;
  }
    
    // 上传处理
    this.handleVoiceUpload(tempFilePath);
    });

  this.recorderManager.onError((err) => {
    console.error("录音报错:", err);
    this.setData({ isRecording: false, isRecordingReady: false });
  });
  },

  async onShow() {
    if (app.globalData.forceRefresh) {
      await this.refreshData();
      app.globalData.forceRefresh = false;
      this.setData({
        selectedStockIndex: -1,
        selectedStockObj: null,
      });
    }
    this.queryTypeList();
  },

  onShareAppMessage() {
    return {
      title: "短线必备工具，操作更轻松！",
      imageUrl: app.globalData.shareImageUrl,
    };
  },

  onUnload() {
    wx.offKeyboardHeightChange();
  },

  async refreshData() {
    wx.showLoading({ title: "更新中..." });
    const userInfo = await app.refreshUserInfo();
    wx.hideLoading();
    this.setData({ userInfo });
  },

  wxOnKeyboard() {
    wx.onKeyboardHeightChange((res) => {
      if (res.height !== this.data.keyboardHeight) {
        this.setData({ keyboardHeight: res.height });
      }
    });
  },

  onStockChange(e) {
    const { userInfo, stockOptions, unRegisterTypes } = this.data;
    const index = parseInt(e.detail.value);
    const stockObj = userInfo?.userId ? stockOptions[index] : unRegisterTypes[index];
    this.setData({
      selectedStockIndex: index,
      selectedStockObj: stockObj,
    });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.field;
    this.setData({ [key]: e.detail.value }, () => this.updateTargetSellPrice());
  },

  updateTargetSellPrice() {
    const { price, qty, rate, buyfee } = this.data;
    if (!price || !qty || !rate || rate <= 0) {
      this.setData({ suggestedSellPrice: null, suggestedProfit: null });
      return;
    }
    const buyCost = safeAdd(safeMultiply(price, qty), buyfee);
    const targetRate = (rate || 0) / 100;
    const targetTotal = safeMultiply(buyCost, safeAdd(1, targetRate));
    const sp = safeDivide(targetTotal, qty);
    const profit = safeSubtract(safeMultiply(sp, qty), buyCost);
    this.setData({
      suggestedSellPrice: parseFloat(sp),
      suggestedProfit: parseFloat(profit),
      buyCost: parseFloat(buyCost),
    });
  },

  goRegister() {
    wx.navigateTo({ url: "/pages/register/index" });
  },

  addTransaction() {
    const { price, qty, selectedStockObj, buyfee, userInfo } = this.data;
    if (!userInfo?.userId) return this.goRegister();
    if (!selectedStockObj) return wx.showToast({ title: "请选择股票名称", icon: "none" });
    if (!price || !qty) return wx.showToast({ title: "请输入价格和数量", icon: "none" });

    this.setData({ disabled: true });
    console.log("添加交易：", { price, qty, selectedStockObj, buyfee });
    wxCloud.call({
      name: "trade",
      data: {
        action: "buy",
        userId: this.data.userInfo.userId,
        stockId: selectedStockObj._id,
        stockName: selectedStockObj.name,
        market: selectedStockObj.market,
        currency: selectedStockObj.currency,
        price,
        quantity: qty,
        fee: buyfee,
        code: selectedStockObj.code,
      },
    }).then((res) => {
      this.setData({ disabled: false });
      if (res.result.success) {
        wx.showToast({ title: "添加交易成功", icon: "success" });
        wx.navigateBack();
      } else {
        wx.showToast({ title: res.result.message, icon: "none" });
      }
    }).catch((err) => {
      this.setData({ disabled: false });
      wx.showToast({ title: "添加交易失败", icon: "none" });
    });
  },

  onAddType() {
    wx.navigateTo({ url: "/subpackages/deal/add-type/index" });
  },

  queryTypeList() {
    if (!this.data.userInfo?.userId) return;
    wx.showLoading({ title: "加载中..." });
    wxCloud.call({
      name: "manageStockType",
      data: { userId: this.data.userInfo?.userId, action: "list" },
    }).then((res) => {
      wx.hideLoading();
      if (res.result.success) {
        this.setData({ stockOptions: res.result.data });
      }
    });
  },
// === 按下按钮 ===
handleTouchStart() {
    this.setData({ isRecording: true, isRecordingReady: false });
    wx.vibrateShort({ type: 'medium' });

    this.recorderManager.start({
      duration: 60000,
      format: 'mp3',       // 👈 改回 mp3
      sampleRate: 16000,   // 阿里标准
      numberOfChannels: 1, 
      encodeBitRate: 48000 
    });
  },
// === 松开按钮 ===
handleTouchEnd() {
  this.setData({ isRecording: false });

  // 👈 关键修改2：只有硬件真的 Start 了，才允许 Stop
  if (this.data.isRecordingReady) {
    this.recorderManager.stop();
  } else {
    console.warn("⚠️ 录音还没完全启动就松开了，延迟停止...");
    // 稍微等一下硬件，防止生成 0kb 文件
    setTimeout(() => {
      this.recorderManager.stop();
    }, 500);
  }
  
  wx.showLoading({ title: 'AI 分析中...' });
},

  // === 3. 处理录音：上传 + 调用云函数 ===
 // === 上传逻辑修正 ===
// === 上传逻辑修正 ===
  async handleVoiceUpload(filePath) {
    try {
      // 👈 后缀改回 .mp3
      const cloudPath = `voice_cache/record_${Date.now()}.mp3`; 
      
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePath,
      });

      console.log('上传成功，FileID:', uploadRes.fileID);

      // 2. 调用云函数
      const cloudRes = await wx.cloud.callFunction({
        name: 'voice_order',
        data: {
          fileID: uploadRes.fileID
        }
      });

      // 🛑 收到结果后，第一件事：关闭 Loading！
      wx.hideLoading();

      const result = cloudRes.result;
      console.log("云函数返回结果:", result);

      // 3. 判断业务逻辑是否成功
      if (result.success) {
        // === 成功逻辑 ===
        wx.vibrateShort({ type: 'light' });
        
        // 这里的 result.data 就是 AI 提取出来的 JSON 数据
        console.log("提取的数据:", result.data);

        // 你可以在这里把数据自动填入表单
        // 例如：
        /*
        this.setData({
           'form.name': result.data.name || '',
           'form.subjects': result.data.subjects || []
        });
        */

        wx.showModal({
          title: '识别成功',
          content: `原文：${result.text}`,
          showCancel: false
        });

      } else {
        // === 失败逻辑 (ASR is empty 就在这里处理) ===
        console.warn("识别业务失败:", result.msg);
        
        wx.showModal({
          title: '识别结果为空',
          content: result.msg || '可能是声音太小或环境太吵，请重试',
          showCancel: false
        });
      }

    } catch (err) {
      // === 系统级错误 (网络断了、云函数崩了) ===
      console.error("系统错误:", err);
      wx.hideLoading(); // 确保报错也能关掉 Loading
      wx.showModal({
        title: '系统错误',
        content: '请检查网络或控制台报错',
        showCancel: false
      });
    }
  },
});