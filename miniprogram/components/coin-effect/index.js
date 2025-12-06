Component({
  properties: {
    show: { type: Boolean, value: false },
    amount: { type: String, value: '' }
  },

  data: {
    coinList: [],
    animateText: false
  },

  observers: {
    'show': function(val) {
      if (val) {
        this.initCoins();
      } else {
        setTimeout(() => {
          this.setData({ coinList: [], animateText: false });
        }, 300);
      }
    }
  },

  methods: {
    initCoins() {
      const coins = [];
      // 【修改点】随机生成 20 - 35 个金币
      const min = 20;
      const max = 35;
      const count = Math.floor(Math.random() * (max - min + 1)) + min;

      for (let i = 0; i < count; i++) {
        // 1. 随机轨迹类型
        // 0: 直落 (30%)
        // 1: 左弹 (25%)
        // 2: 右弹 (25%)
        // 3: 直弹 (20%)
        const rand = Math.random();
        let type = 'straight';
        if (rand > 0.3 && rand <= 0.55) type = 'left';
        else if (rand > 0.55 && rand <= 0.8) type = 'right';
        else if (rand > 0.8) type = 'up';

        // 2. 随机位置 (避免太靠边)
        const startLeft = 10 + Math.random() * 80;

        coins.push({
          id: i,
          type: type, // 绑定动画类型
          startLeft: startLeft,
          size: 50 + Math.random() * 50, // 大小 50-100rpx
          duration: 1.2 + Math.random() * 0.8, // 速度 1.2s - 2.0s
          delay: Math.random() * 0.3 // 延迟
        });
      }

      this.setData({
        coinList: coins,
        animateText: true
      });

      setTimeout(() => {
        this.triggerEvent('finish');
      }, 3000);
    }
  }
})