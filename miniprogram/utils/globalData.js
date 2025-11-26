
const systemInfo = wx.getSystemInfoSync()
console.log("系统信息------",systemInfo)
const { model, safeArea, screenHeight, statusBarHeight } = systemInfo;
const safeAreaBottom = safeArea.bottom;
const touchAreaHeight = screenHeight - safeAreaBottom;
const isFullScreen = touchAreaHeight > 0;
let isIPX = isFullScreen;
module.exports = {
  isIPX,
  systemInfo,
}
