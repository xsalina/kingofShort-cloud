// utils/tradingTime.js



// A股 (CNY) [09:30 - 11:30] - [13:00 - 15:00]

// 港股 (HKD) [09:30 - 12:00] - [13:00 - 16:00]

// 美股 (USD)

// 夏令时 (3月中-11月初)：[21:30 - 04:00]

// 冬令时 (11月初-3月中)：[22:30 - 05:00]
/**
 * 判断当前是否为交易时间
 * @param {String} market - 市场类型: 'CN'(A股), 'HK'(港股), 'US'(美股)
 * @returns {Boolean}
 */
function isTradingTime(market) {
  const now = new Date();
  
  // 1. 周末判断 (通用)
  // 注意：美股的周五交易时间对应北京时间的周五晚上到周六凌晨
  // 所以这里我们只对 A股和港股 严格过滤周六日
  // 美股单独在内部逻辑判断
  const day = now.getDay(); // 0是周日, 6是周六
  const isWeekend = (day === 0 || day === 6);

  // === A股 (CN) ===
  // 交易时间 (北京时间): 9:30-11:30, 13:00-15:00
  if (market === 'CN') {
    if (isWeekend) return false;
    return checkTimeRange(now, [
      [930, 1135], // 早盘 (多给5分钟缓冲，防止接口延迟)
      [1300, 1505] // 午盘
    ]);
  }

  // === 港股 (HK) ===
  // 交易时间 (北京时间): 9:30-12:00, 13:00-16:00
  if (market === 'HK') {
    if (isWeekend) return false;
    return checkTimeRange(now, [
      [930, 1205], 
      [1300, 1605]
    ]);
  }

  // === 美股 (US) ===
  // 交易时间 (美东时间): 09:30 - 16:00 (无午休)
  // 这里利用 toLocaleString 强制转为纽约时间，自动处理冬令时/夏令时
  if (market === 'US') {
    // 获取当前纽约时间
    const nyTimeStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });
    const nyDate = new Date(nyTimeStr);
    
    const nyDay = nyDate.getDay();
    const nyHour = nyDate.getHours();
    const nyMinute = nyDate.getMinutes();
    const nyTimeVal = nyHour * 100 + nyMinute; // 转换成数字 930, 1600

    // 美股周末 (纽约时间的周六周日)
    if (nyDay === 0 || nyDay === 6) return false;

    // 美股盘前盘后比较活跃，建议放宽一点范围
    // 标准: 930 - 1600
    // 宽松(含盘前盘后): 400 - 2000 (很多接口盘前也有数据)
    // 这里我们按标准交易时间 + 盘后一小会儿来算: 09:30 - 16:15
    if (nyTimeVal >= 930 && nyTimeVal <= 1615) {
      return true;
    }
    return false;
  }

  // 默认返回 false
  return false;
}

/**
 * 辅助函数：检查当前时间是否在指定的时间段内 (按北京时间)
 * ranges: [[930, 1130], [1300, 1500]]
 */
function checkTimeRange(dateObj, ranges) {
  const h = dateObj.getHours();
  const m = dateObj.getMinutes();
  const val = h * 100 + m; // 例如 9:30 => 930

  for (let range of ranges) {
    if (val >= range[0] && val <= range[1]) {
      return true;
    }
  }
  return false;
}

module.exports = {
  isTradingTime
};