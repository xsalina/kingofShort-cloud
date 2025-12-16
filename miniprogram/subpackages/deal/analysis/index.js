const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

Page({
  data: {
    loading: false,
    currentStock: '', // 当前选中的股票名称
    result: null,
    isUp: true
  },

  // 点击股票卡片
  async onAnalyze(e) {
    const name = e.currentTarget.dataset.name;

    // 1. 防止重复点击或加载中点击
    if (this.data.loading) return; 
    
    // 如果点击的是当前已显示的股票，且已经有结果了，就不动
    if (this.data.currentStock === name && this.data.result) return;

    // 2. 先进入加载状态
    this.setData({ 
      currentStock: name, 
      loading: true, 
      result: null // 清空旧结果，显示 Loading
    });

    try {
      // ============================================
      // 【核心修复】这里加上了读取缓存的逻辑！
      // ============================================
      const cachedData = this.checkCache(name);
      
      if (cachedData) {
        console.log(`🚀 命中缓存，无需联网: ${name}`);
        // 如果有缓存，直接渲染，并结束函数
        this.renderResult(cachedData);
        this.setData({ loading: false }); // 记得关掉 Loading
        return; // 【重要】直接返回，不走下面的云函数了
      }

      // ============================================
      // 下面是无缓存时的网络请求逻辑
      // ============================================
      console.log(`☁️ 无缓存，请求云函数: ${name}`);
      const res = await wx.cloud.callFunction({
        name: 'analyzeStock',
        data: { name: name }
      });

      const { success, data, msg } = res.result;
      
      if (!success) {
        throw new Error(msg || '请求失败');
      }

      // 请求成功，写入缓存
      this.setCache(name, data);
      
      // 渲染结果
      this.renderResult(data);

    } catch (err) {
      console.error("前端捕获错误:", err);
      
      wx.showToast({
        title: err.message.includes('华尔街') ? err.message : '网络开小差了，请重试',
        icon: 'none',
        duration: 3000
      });

      this.setData({ result: null }); 

    } finally {
      // 无论走缓存还是走网络，最后都要停止转圈
      // (如果走缓存，上面已经提前 setData loading false 并 return 了，这里是给网络请求兜底的)
      if (this.data.loading) {
        this.setData({ loading: false });
      }
    }
  },

  // 渲染助手函数
 // 渲染结果（带打字机效果）
  renderResult(data) {
    // 1. 先判断涨跌颜色
    const isUp = !data['涨跌幅'].includes('-');
    
    // 2. 提取出完整的 AI 回复，并暂时把 result 里的 aiAdvice 设为空，防止一下全显示出来
    const fullText = data.aiAdvice || "AI 暂时沉默...";
    data.aiAdvice = ""; // 先清空，准备打字

    // 3. 先把基础数据渲染出来（价格、RSI、均线等），但不显示 AI 文字
    this.setData({ 
      result: data, 
      isUp: isUp 
    });

    // 4. 开始打字机动画
    this.typeWriter(fullText);
  },
  // 【新增】打字机动画函数
  typeWriter(fullText) {
    let index = 0;
    const length = fullText.length;
    
    // 如果之前有定时器在跑，先清除，防止错乱
    if (this.timer) clearInterval(this.timer);

    // 设置定时器，每 40ms 敲一个字
    this.timer = setInterval(() => {
      // 每次多截取一个字
      const currentText = fullText.substring(0, index + 1);
      
      // 更新到界面上
      // 注意：这里我们只更新 result.aiAdvice 字段，性能更好
      this.setData({
        ['result.aiAdvice']: currentText
      });

      index++;

      // 打完了，清除定时器
      if (index >= length) {
        clearInterval(this.timer);
      }
    }, 40); // 40ms 是个比较舒服的速度，你可以调快调慢
  },

  // 写入缓存
  setCache(name, data) {
    wx.setStorageSync(`stock_analysis_${name}`, {
      timestamp: Date.now(),
      data: data
    });
  },

  // 读取缓存
  checkCache(name) {
    const cache = wx.getStorageSync(`stock_analysis_${name}`);
    if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
      return cache.data;
    }
    // 如果过期了，顺手清理掉
    wx.removeStorageSync(`stock_analysis_${name}`);
    return null;
  }
})