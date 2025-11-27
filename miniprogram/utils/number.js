/**
 * 公共精确计算工具，解决 JS 浮点数精度问题
 * 默认小数点保留三位
 */

const DECIMAL_PLACES = 3; // 小数点保留位数

// 安全乘法
function safeMultiply(a=0, b=0, fixedNumber = DECIMAL_PLACES) {
  const aDecimals = (a.toString().split('.')[1] || '').length;
  const bDecimals = (b.toString().split('.')[1] || '').length;
  const intA = Number(a.toString().replace('.', ''));
  const intB = Number(b.toString().replace('.', ''));
  return ((intA * intB) / Math.pow(10, aDecimals + bDecimals)).toFixed(fixedNumber);
}

// 安全加法
function safeAdd(a=0, b=0, fixedNumber = DECIMAL_PLACES) {
  const factor = Math.pow(10, Math.max(
    (a.toString().split('.')[1] || '').length,
    (b.toString().split('.')[1] || '').length
  ));
  return ((Math.round(a * factor) + Math.round(b * factor)) / factor).toFixed(fixedNumber);
}

// 安全减法
function safeSubtract(a=0, b=0, fixedNumber = DECIMAL_PLACES) {
  const factor = Math.pow(10, Math.max(
    (a.toString().split('.')[1] || '').length,
    (b.toString().split('.')[1] || '').length
  ));
  return ((Math.round(a * factor) - Math.round(b * factor)) / factor).toFixed(fixedNumber);
}

// 安全除法
function safeDivide(a=0, b=0, fixedNumber = DECIMAL_PLACES) {
  if (b === 0) return (0).toFixed(fixedNumber);
  const aDecimals = (a.toString().split('.')[1] || '').length;
  const bDecimals = (b.toString().split('.')[1] || '').length;
  const intA = Number(a.toString().replace('.', ''));
  const intB = Number(b.toString().replace('.', ''));
  return ((intA / intB) * Math.pow(10, bDecimals - aDecimals)).toFixed(fixedNumber);
}

module.exports = {
  safeMultiply,
  safeAdd,
  safeSubtract,
  safeDivide
};
