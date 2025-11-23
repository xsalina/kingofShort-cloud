const db = wx.cloud.database();

function safeMultiply(a,b){const f=1000000;return(Math.round(a*f)*Math.round(b*f))/(f*f);}
function safeDivide(a,b){if(b===0)return 0;return(Math.round(a*1000000))/Math.round(b*1000000);}
function safeAdd(a,b){return(Math.round(a*1000000)+Math.round(b*1000000))/1000000;}
function safeSubtract(a,b){return(Math.round(a*1000000)-Math.round(b*1000000))/1000000;}

Page({
  data:{
    stockOptions:[
      {name:"特斯拉", fractional:true, market:"美股", currency:"$"},
      {name:"英伟达", fractional:true, market:"美股", currency:"$"},
      {name:"阿里巴巴", fractional:false, market:"港股", currency:"HK$"},
      {name:"工商银行", fractional:false, market:"A股", currency:"¥"}
    ],
    stockNames:["特斯拉","英伟达","阿里巴巴","工商银行"],
    selectedStockIndex:0,
    selectedStockObj:{name:"特斯拉", fractional:true, market:"美股", currency:"$"},
    price:0,
    qty:0,
    minUnit:0.0001,
    targetRate:0,

    // 新增：买入手续费（用户输入）
    buyFeeInput: 0,

    suggestedSellPrice:null,
    suggestedProfit:null,

    transactionssss: [
  {
    stockName: "特斯拉",
    price: 398,
    qty: 5,
    currency: "$",
    buyTime: "2025-11-16 10:20",
    sold: true,
    sellPrice: 498,
    sellQty: 5,
    sellTime: "2025-11-16 14:30",
    profit: 500
  },
  {
    stockName: "英伟达",
    price: 310,
    qty: 2,
    currency: "$",
    buyTime: "2025-11-17 09:50",
    sold: false,
    profit: 0
  }
]
  },

  onLoad(){
    const stockObj=this.data.stockOptions[this.data.selectedStockIndex];
    this.setData({ selectedStockObj: stockObj, minUnit: stockObj.fractional?0.0001:1, qty: stockObj.fractional?0:1 });
    this.loadTransactions();
  },

  onStockChange(e){
    const index=parseInt(e.detail.value);
    const stockObj=this.data.stockOptions[index];
    this.setData({
      selectedStockIndex:index,
      selectedStockObj:stockObj,
      minUnit: stockObj.fractional?0.0001:1,
      qty: stockObj.fractional?0:1
    });
    this.updateTargetSellPrice();
  },

  onPriceInput(e){ 
    this.setData({price:parseFloat(e.detail.value)||0}); 
    this.updateTargetSellPrice(); 
  },

  onQtyInput(e){
    let v=parseFloat(e.detail.value)||0;
    const minUnit=this.data.minUnit;
    if(this.data.selectedStockObj.fractional) v=Math.floor(v/minUnit)*minUnit;
    else v=Math.floor(v);

    this.setData({qty:v});
    this.updateTargetSellPrice();
  },

  // 用户输入 目标收益率（例如 10% → 0.1）
  onTargetRateInput(e){ 
    this.setData({targetRate:(parseFloat(e.detail.value)||0)/100}); 
    this.updateTargetSellPrice(); 
  },

  // 新增：买入手续费输入
  onBuyFeeInput(e){
    this.setData({
      buyFeeInput: parseFloat(e.detail.value) || 0
    });
    this.updateTargetSellPrice();
  },

  /**
   * ★★★★★ 核心公式（已改为使用用户输入的 buyFeeInput）
   * suggestedSellPrice = (买入总成本 × (1 + 目标收益率)) ÷ 数量
   */
  updateTargetSellPrice() {
    const { price, qty, targetRate, buyFeeInput } = this.data;

    if (!price || !qty || !targetRate || targetRate <= 0) {
      this.setData({ suggestedSellPrice: null, suggestedProfit: null });
      return;
    }

    // 总成本 = 买入价格×数量 + 用户输入手续费
    const buyCost = safeAdd(safeMultiply(price, qty), buyFeeInput);

    // 目标总金额 = buyCost × (1 + 目标收益率)
    const targetTotal = safeMultiply(buyCost, safeAdd(1, targetRate));

    // 建议卖出价 = 目标总金额 ÷ 数量
    const sp = safeDivide(targetTotal, qty);

    // 预期收益（不考虑卖出手续费）
    const profit = safeSubtract(safeMultiply(sp, qty), buyCost);

    this.setData({
      suggestedSellPrice: sp.toFixed(4),
      suggestedProfit: profit.toFixed(2)
    });
  },

  addTransaction(){
    const {price, qty, selectedStockObj, suggestedSellPrice, buyFeeInput} = this.data;

    if(!price || !qty) 
      return wx.showToast({title:'请输入价格和数量',icon:'none'});

    const targetPrice = parseFloat(suggestedSellPrice) || 0;

    // 成本 = 买入金额 + 用户输入手续费
    const buyCost = safeAdd(safeMultiply(price, qty), buyFeeInput);

    // 预期收益
    const profit = safeSubtract(safeMultiply(qty, targetPrice), buyCost);

    const newTransaction={
      stockName:selectedStockObj.name,
      typeClass:'buy',
      price,
      qty,
      targetPrice,
      profit,
      currency: selectedStockObj.currency,
      buyFee: buyFeeInput,
      createTime:new Date()
    };

    db.collection('transactions')
      .add({data:newTransaction})
      .then(()=>{
        wx.showToast({title:'添加成功',icon:'success'});
        this.loadTransactions();
      })
      .catch(()=>wx.showToast({title:'添加失败',icon:'none'}));
  },

  loadTransactions(){
    db.collection('transactions')
      .orderBy('createTime','desc')
      .get()
      .then(res=>{
        const transactions=res.data;
        this.setData({transactions});
        this.calculateProfits(transactions);
      });
  },

  calculateProfits(transactions){
    let total=0, month=0;
    const now=new Date();
    const thisMonth=now.getMonth();
    const thisYear=now.getFullYear();

    transactions.forEach(tx=>{
      total=safeAdd(total,tx.profit);
      const t=new Date(tx.createTime);
      if(t.getFullYear()===thisYear && t.getMonth()===thisMonth && tx.typeClass==='sell')
        month=safeAdd(month,tx.profit);
    });

    this.setData({totalProfit:total, monthProfit:month});
  }
});
