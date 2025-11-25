Page({
  data: {
    tabs: ["已卖", "未卖", "部分卖"],
    currentTabIndex: 0,
    statusText: {
      sold: "已卖",
      unsold: "未卖",
      partial: "部分卖"
    },
    transactions: [
      {
        id: 1,
        stockName: "特斯拉",
        status: "sold",  // sold / unsold / pending / partial
        currency: "$",
        buyPrice: 398.28,
        buyQty: 5,
        buyTime: "2025-11-16 10:20",
        sold: true,
        sellPrice: 450,
        sellQty: 5,
        sellTime: "2025-11-16 14:30",
        profit: 258.6
      },
      {
        id: 2,
        stockName: "英伟达",
        status: "unsold",
        currency: "$",
        buyPrice: 310,
        buyQty: 3,
        buyTime: "2025-11-17 09:50",
        sold: false,
        sellPrice: 0,
        sellQty: 0,
        sellTime: "",
        profit: 0
      },
      {
        id: 3,
        stockName: "阿里巴巴",
        status: "pending",
        currency: "HK$",
        buyPrice: 200,
        buyQty: 10,
        buyTime: "2025-11-18 11:00",
        sold: false,
        sellPrice: 0,
        sellQty: 0,
        sellTime: "",
        profit: 0
      },
      {
        id: 4,
        stockName: "标普100",
        status: "partial",
        currency: "$",
        buyPrice: 400,
        buyQty: 10,
        buyTime: "2025-11-19 10:10",
        sold: true,
        sellPrice: 420,
        sellQty: 5,
        sellTime: "2025-11-19 14:00",
        profit: 100
      }
    ]
  },

  switchTab(e) {
    this.setData({
      currentTabIndex: e.currentTarget.dataset.index
    });
  },

  get filteredTransactions() {
    const statusMap = ["sold","pending","unsold","partial"];
    const currentStatus = statusMap[this.data.currentTabIndex];
    return this.data.transactions.filter(tx => tx.status === currentStatus);
  }
});
