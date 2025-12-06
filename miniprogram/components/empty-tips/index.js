Component({
 options: {
    addGlobalClass: true,
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
