/**
 * 公共精确计算工具，解决 JS 浮点数精度问题
 * 默认小数点保留三位
 */

const DECIMAL_PLACES = 3; // 小数点保留位数

// 安全乘法
function safeMultiply(a, b) {
  const aDecimals = (a.toString().split('.')[1] || '').length;
  const bDecimals = (b.toString().split('.')[1] || '').length;
  const intA = Number(a.toString().replace('.', ''));
  const intB = Number(b.toString().replace('.', ''));
  return ((intA * intB) / Math.pow(10, aDecimals + bDecimals)).toFixed(DECIMAL_PLACES);
}

// 安全加法
function safeAdd(a, b) {
  const factor = Math.pow(10, Math.max(
    (a.toString().split('.')[1] || '').length,
    (b.toString().split('.')[1] || '').length
  ));
  return ((Math.round(a * factor) + Math.round(b * factor)) / factor).toFixed(DECIMAL_PLACES);
}

// 安全减法
function safeSubtract(a, b) {
  const factor = Math.pow(10, Math.max(
    (a.toString().split('.')[1] || '').length,
    (b.toString().split('.')[1] || '').length
  ));
  return ((Math.round(a * factor) - Math.round(b * factor)) / factor).toFixed(DECIMAL_PLACES);
}

// 安全除法
function safeDivide(a, b) {
  if (b === 0) return (0).toFixed(DECIMAL_PLACES);
  const aDecimals = (a.toString().split('.')[1] || '').length;
  const bDecimals = (b.toString().split('.')[1] || '').length;
  const intA = Number(a.toString().replace('.', ''));
  const intB = Number(b.toString().replace('.', ''));
  return ((intA / intB) * Math.pow(10, bDecimals - aDecimals)).toFixed(DECIMAL_PLACES);
}

module.exports = {
  safeMultiply,
  safeAdd,
  safeSubtract,
  safeDivide
};
