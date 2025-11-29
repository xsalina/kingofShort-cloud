Component({
  data: {
    show: false,
    coins: []
  },

  methods: {
    start() {
      const list = [];
      for (let i = 0; i < 30; i++) {
        list.push({
          left: Math.random() * 80 + 10,  // 10%～90%
          delay: Math.random() * 0.6     // 0~0.6s 延迟
        });
      }
      this.setData({ coins: list, show: true });

      setTimeout(() => {
        this.setData({ show: false });
      }, 1500);
    }
  }
});
