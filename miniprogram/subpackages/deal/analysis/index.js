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
  renderResult(data) {
    const isUp = !data['涨跌幅'].includes('-');
    this.setData({ result: data, isUp: isUp });
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