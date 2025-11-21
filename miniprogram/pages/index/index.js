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
    suggestedSellPrice:null,
    suggestedProfit:null,
    monthProfit:0,
    totalProfit:0,

    transactions: [
  {
    stockName: "特斯拉",
    price: 398,
    qty: 5,
    currency: "$",
    sold: true,
    sellPrice: 498,
    sellQty: 5,
    sellTime: "2025-11-16 14:30",
    profit: 500
  },
  {
    stockName: "特斯拉",
    price: 402,
    qty: 3,
    currency: "$",
    sold: false,
    profit: 0
  }
],
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

  onPriceInput(e){ this.setData({price:parseFloat(e.detail.value)||0}); this.updateTargetSellPrice(); },

  onQtyInput(e){
    let v=parseFloat(e.detail.value)||0;
    const minUnit=this.data.minUnit;
    if(this.data.selectedStockObj.fractional) v=Math.floor(v/minUnit)*minUnit; else v=Math.floor(v);
    this.setData({qty:v});
    this.updateTargetSellPrice();
  },

  onTargetRateInput(e){ this.setData({targetRate:(parseFloat(e.detail.value)||0)/100}); this.updateTargetSellPrice(); },

  calcBuyFee(price,qty,isFractional){ return isFractional? safeMultiply(price,qty)*0.012<0.99? safeMultiply(price,qty)*0.012:0.99 : qty*0.003<1?1:qty*0.003; },
  calcSellFee(price,qty,isFractional){
    if(isFractional) return safeMultiply(price,qty)*0.012<0.99? safeMultiply(price,qty)*0.012:0.99;
    const platform=qty*0.003<1?1:qty*0.003;
    const sec=safeMultiply(price,qty)*0.0008;
    const finra=qty*0.000145;
    return safeAdd(safeAdd(platform,sec),finra);
  },

  updateTargetSellPrice() {
  const { price, qty, targetRate, selectedStockObj } = this.data;

  // 只有三个字段都有有效值才计算
  if (!price || !qty || !targetRate || targetRate <= 0) {
    this.setData({ suggestedSellPrice: null, suggestedProfit: null });
    return;
  }

  const isFractional = selectedStockObj.fractional;
  const buyFee = this.calcBuyFee(price, qty, isFractional);
  const buyCost = safeAdd(safeMultiply(price, qty), buyFee);
  const expectedTotal = safeMultiply(buyCost, safeAdd(1, targetRate));

  let suggestedPrice;
  if (isFractional) {
    suggestedPrice = safeDivide(expectedTotal, qty * (1 - 0.012));
    if (suggestedPrice < 0.01) suggestedPrice = 0.01;
  } else {
    const sellFee = qty * 0.003 < 1 ? 1 : qty * 0.003;
    suggestedPrice = safeDivide(safeAdd(expectedTotal, sellFee), qty);
  }

  const expectedProfit = safeSubtract(safeMultiply(suggestedPrice, qty), safeAdd(safeMultiply(price, qty), buyFee));

  this.setData({
    suggestedSellPrice: suggestedPrice.toFixed(4),
    suggestedProfit: expectedProfit.toFixed(2)
  });
},


  addTransaction(){
    const {price, qty, selectedStockObj}=this.data;
    if(!price||!qty) return wx.showToast({title:'请输入价格和数量',icon:'none'});
    const isFractional=selectedStockObj.fractional;
    const targetPrice=parseFloat(this.data.suggestedSellPrice)||0;
    const buyFee=this.calcBuyFee(price,qty,isFractional);
    const profit=safeSubtract(safeMultiply(qty,targetPrice),safeAdd(safeMultiply(price,qty),buyFee));
    const newTransaction={
      stockName:selectedStockObj.name,
      typeClass:'buy',
      price,
      qty,
      targetPrice,
      profit,
      currency: selectedStockObj.currency,
      createTime:new Date()
    };
    db.collection('transactions').add({data:newTransaction}).then(()=>{ wx.showToast({title:'添加成功',icon:'success'}); this.loadTransactions(); })
      .catch(()=>wx.showToast({title:'添加失败',icon:'none'}));
  },

  sellTransaction(e){
    const index=e.currentTarget.dataset.index;
    const tx=this.data.transactions[index];
    wx.showModal({
      title:'卖出',
      content:`请输入卖出数量（最大 ${tx.qty}）`,
      editable:true,
      success:(res)=>{
        if(res.confirm){
          let sellQty=parseFloat(res.content);
          if(!sellQty||sellQty<=0||sellQty>tx.qty) return wx.showToast({title:'数量不合法',icon:'none'});
          const isFractional=this.data.selectedStockObj.fractional;
          const sellPrice=tx.targetPrice;
          const sellFee=this.calcSellFee(sellPrice,sellQty,isFractional);
          const profit=safeSubtract(safeMultiply(sellQty,sellPrice),safeAdd(safeMultiply(tx.price,sellQty),sellFee));
          const sellTx={
            stockName:tx.stockName,
            typeClass:'sell',
            price:sellPrice,
            qty:sellQty,
            targetPrice:sellPrice,
            profit,
            currency: tx.currency,
            createTime:new Date()
          };
          db.collection('transactions').add({data:sellTx}).then(()=>{
            const remainingQty=safeSubtract(tx.qty,sellQty);
            db.collection('transactions').doc(tx._id).update({data:{qty:remainingQty}}).then(()=>this.loadTransactions());
          });
        }
      }
    });
  },

  loadTransactions(){
    db.collection('transactions').orderBy('createTime','desc').get().then(res=>{
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
      if(t.getFullYear()===thisYear && t.getMonth()===thisMonth && tx.typeClass==='sell') month=safeAdd(month,tx.profit);
    });
    this.setData({totalProfit:total, monthProfit:month});
  }
});
