// 安全减法
function getStatusInfo(status) {
  let statusInfo = { statusClass: status, statusText: "" };
  switch (status) {
    case "sold":
      statusInfo.statusText = "已卖";
      statusInfo.detailText = "已结清";
      break;
    case "unSold":
      statusInfo.statusText = "未卖";
      statusInfo.detailText = "持仓中";
      break;
    case "pending":
      statusInfo.statusText = "挂单";
      break;
    case "partial":
      statusInfo.statusText = "部分卖";
      statusInfo.detailText = "部分卖出";
      break;
    default:
  }
  return statusInfo;
}
module.exports = { getStatusInfo };
