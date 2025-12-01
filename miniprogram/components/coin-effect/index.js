Page({
    data: {
        coins: [],
        showText: false,
        textValue:null,
        moneyValue:0
    },
    start({ count = 10, moneyValue = 0 }) {
        const coins = [];
        for (let i = 0; i < count; i++) {
            const anims = ['scatterLeft', 'scatterMid', 'scatterRight'];
            const anim = anims[Math.floor(Math.random() * 3)];
            const x = Math.random() * 600;
            const id = Date.now() + '-' + i;

            coins.push({
                id,
                x,
                anim,
                rotate: Math.random() * 360,
                scale: 0.8 + Math.random() * 0.4,
                delay: (Math.random() * 0.5).toFixed(2) + 's'
            });
        }
        const textValue = `${moneyValue >= 0 ? '+' :'-'}${Math.abs(moneyValue)}💰`;
        // 显示金币和收益文案
        this.setData({ coins,textValue,moneyValue, showText: true });

        // 动画结束后清空
        setTimeout(() => this.setData({ coins: [], showText: false }), 2200);
    }
})
