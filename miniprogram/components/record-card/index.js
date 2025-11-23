Component({
  properties: {
    stockName: String,
    status: String, // "sold", "unsold", "pending", "partial"
    currency: { type: String, value: '$' },
    buyPrice: Number,
    buyQty: Number,
    buyTime: String,
    sold: { type: Boolean, value: false },
    sellPrice: Number,
    sellQty: Number,
    sellTime: String,
    profit: Number
  },
  data: {
    statusText: '',
    statusClass: ''
  },
  observers: {
    'status'(newVal) {
      let text = '', cls = '';
      switch(newVal) {
        case 'sold':
          text = '已卖';
          cls = 'sold';
          break;
        case 'unsold':
          text = '未卖';
          cls = 'unsold';
          break;
        case 'pending':
          text = '挂单';
          cls = 'pending';
          break;
        case 'partial':
          text = '部分卖';
          cls = 'partial';
          break;
        default:
          text = '';
          cls = '';
      }
      this.setData({
        statusText: text,
        statusClass: cls
      });
    }
  }
});
