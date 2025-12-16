const CACHE_DURATION = 5 * 60 * 1000; // 20分钟缓存

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

    // 防止重复点击或加载中点击
    if (this.data.loading) return; 
    if (this.data.currentStock === name && this.data.result) return;

    this.setData({ 
      currentStock: name, 
      loading: true, 
      result: null //以此清空旧结果
    });

    try {
      console.log(`请求云函数: ${name}`);
      const res = await wx.cloud.callFunction({
        name: 'analyzeStock',
        data: { name: name }
      });

      const { success, data, msg } = res.result;
      
      // 【核心修改】如果 success 为 false，抛出错误让下面 catch 捕获
      if (!success) {
        throw new Error(msg || '请求失败');
      }

      this.setCache(name, data);
      this.renderResult(data);

    } catch (err) {
      console.error("前端捕获错误:", err);
      
      // 【新增】弹窗提示用户
      wx.showToast({
        title: err.message.includes('华尔街') ? err.message : '网络开小差了，请重试', // 如果是后端传来的友好文案就直接用，否则用默认的
        icon: 'none',
        duration: 3000 // 显示时间长一点，3秒
      });

      this.setData({ result: null }); // 失败清空结果区

    } finally {
      // 【关键】无论成功还是失败，最后都要停止转圈
      this.setData({ loading: false });
    }
  },

  renderResult(data) {
    const isUp = !data['涨跌幅'].includes('-');
    this.setData({ result: data, isUp: isUp });
  },

  setCache(name, data) {
    wx.setStorageSync(`stock_analysis_${name}`, {
      timestamp: Date.now(),
      data: data
    });
  },

  checkCache(name) {
    const cache = wx.getStorageSync(`stock_analysis_${name}`);
    if (cache && (Date.now() - cache.timestamp < CACHE_DURATION)) {
      return cache.data;
    }
    wx.removeStorageSync(`stock_analysis_${name}`);
    return null;
  }
})