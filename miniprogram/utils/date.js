function formatSmartTime(date) {
  if (!date) return '';

  const d = (date instanceof Date) ? date : new Date(date);

  const now = new Date();

  const pad = n => n < 10 ? '0' + n : n;

  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hour = pad(d.getHours());
  const minute = pad(d.getMinutes());
  const second = pad(d.getSeconds());

  const full = `${year}-${month}-${day} ${hour}:${minute}:${second}`;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  if (d >= todayStart) {
    return `今天 ${hour}:${minute}`;
  } else if (d >= yesterdayStart) {
    return `昨天 ${hour}:${minute}`;
  }

  return full;
}

module.exports = {
  formatSmartTime
};
