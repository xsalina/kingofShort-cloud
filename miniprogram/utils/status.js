// 安全减法
function getStatusInfo(status) {
  let statusInfo = { statusClass: status, statusText: "" };
  switch (status) {
    case "sold":
      statusInfo.statusText = "已卖";
      break;
    case "unSold":
      statusInfo.statusText = "未卖";
      break;
    case "pending":
      statusInfo.statusText = "挂单";
      break;
    case "partial":
      statusInfo.statusText = "部分卖";
      break;
    default:
  }
  return statusInfo;
}
module.exports = { getStatusInfo };
