const wxCloud = require("../../utils/cloud");

const app = getApp();
Page({
  data: {
    name: "",
    phone: "",
    disabled: false,
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },

  onSubmit() {
    const { name, phone } = this.data;
    if (!name) return wx.showToast({ title: "请输入姓名", icon: "none" });
    if (!phone || phone.length !== 11)
      return wx.showToast({ title: "请输入正确手机号", icon: "none" });
    this.setData({ disabled: true });
    // wx.showLoading({ title: "注册中..." });
    // 调用云函数注册
    // 注册用户
    wxCloud
      .call({
        name: "registerUser",
        data: { name, phone },
      })
      .then((res) => {
        if (res.result.success) {
          const user = res.result.data;
          app.globalData.userInfo = user;
          this.setData({ disabled: false });
          // 通知个人中心回来后刷新用户信息
          app.globalData.forceRefresh = true;
          wx.showToast({ title: res.result.message, icon: "none" });
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
        } else {
          wx.showToast({ title: res.result.message, icon: "none" });
          this.setData({ disabled: false });
          // wx.hideLoading();
        }
      })
      .catch((err) => {
        wx.showToast({ title: err.message, icon: "none" });
        this.setData({ disabled: false });
        // wx.hideLoading();
      });
  },
});
