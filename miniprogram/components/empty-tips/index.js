Component({
  properties: {
    image: {
      type: String,
      value: "/assets/images/empty.png", // 默认灰色空盒子
    },
    title: {
      type: String,
      value: "暂无交易记录",
    },
    subtitle: {
      type: String,
      value: "点击加号添加你的第一笔交易",
    },
    clickCursorImg: {
      type: String,
      value: "/assets/images/clickCursor.png",
    },
    showClickPoint: {
      type: Boolean,
      value: false,
    },
  },

  methods: {
    handleTitleTap() {
      this.triggerEvent("titleTap");
    },
    onAddtraions() {
      wx.navigateTo({
        url: "/subpackages/deal/add-deal/index",
      });
    },
  },
});
