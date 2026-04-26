export const VERSION = '1.3.2';

export const ICONS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵'];

export const FAN_DATA = [
    {
        category: "花/字 (Flowers & Honors)",
        items: [
            { name: "無花", fan: 1, note: "" },
            { name: "正花", fan: 2, note: "" },
            { name: "爛花", fan: 1, note: "" },
            { name: "正風/正圈刻", fan: 2, note: "碰出東、南、西或北(正風或正圈)" },
            { name: "偏位風刻", fan: 1, note: "碰出東、南、西或北(不是正風或正圈)" },
            { name: "三元牌刻", fan: 2, note: "中/發/白" },
            { name: "無字", fan: 1, note: "沒有番子" },
            { name: "無字花", fan: 5, note: "沒有番子及沒有花" },
            { name: "無字花平胡", fan: 10, note: "大平糊 (沒有番子，沒有花，又是平胡)" },
        ]
    },
    {
        category: "基本 (Basic)",
        items: [
            { name: "缺一門", fan: 5, note: "不計番子而缺少筒、索或萬一門 (不能重覆計算[無字])" },
            { name: "聽牌", fan: 5, note: "聲明已經叫胡，不得轉章" },
            { name: "一發", fan: 5, note: "聽牌後，在下次摸排時或之前胡出" },
            { name: "明絕", fan: 5, note: "食糊牌是牌海中出現的第四隻牌 (自摸都計)" },
            { name: "雞胡", fan: 20, note: "胡出時(不計莊前)只得一番" },
            { name: "對碰", fan: 1, note: "聽牌為兩對對子" },
            { name: "假獨", fan: 1, note: "可以砌到叫單釣或叫偏章" },
            { name: "獨獨", fan: 2, note: "單釣、卡窿或偏章" },
            { name: "平胡", fan: 3, note: "全副牌由順子組成" },
            { name: "將眼", fan: 1, note: "以一對二、五或八做眼" },
            { name: "老少", fan: 2, note: "同門一二三加七八九 或 一一一加九九九" },
            { name: "門清", fan: 3, note: "沒有碰、上 or 明槓 (暗槓亦可)" },
            { name: "海底撈月", fan: 20, note: "摸最後一張牌自摸食糊" },
            { name: "自摸", fan: 1, note: "" },
            { name: "門清自摸", fan: 5, note: "" },
            { name: "槓", fan: 1, note: "明槓" },
            { name: "暗槓", fan: 2, note: "" },
            { name: "花上食胡", fan: 1, note: "補花時摸到食糊牌" },
            { name: "槓上食胡", fan: 1, note: "開槓後補牌食糊" },
            { name: "搶槓食胡", fan: 1, note: "搶槓只當是被搶那家出沖，加一番" },
            { name: "槓上槓食胡", fan: 30, note: "" },
            { name: "搶槓上槓食胡", fan: 30, note: "當槓上槓那家出沖" },
        ]
    },
    {
        category: "刻子 (Triplets)",
        items: [
            { name: "二暗刻", fan: 3, note: "手裡有兩個刻子" },
            { name: "三暗刻", fan: 10, note: "手裡有三個刻子" },
            { name: "四暗刻", fan: 30, note: "手裡有四個刻子" },
            { name: "五暗刻", fan: 80, note: "手裡有五個刻子" },
            { name: "間間胡", fan: 100, note: "對對胡 + 五暗刻" },
            { name: "二兄弟", fan: 3, note: "兩款數字一樣的刻子" },
            { name: "小三兄弟", fan: 10, note: "二兄弟再加上另一個兄弟做眼" },
            { name: "大三兄弟", fan: 15, note: "三款數字一樣的刻子" },
            { name: "二姊妹", fan: 3, note: "兩副同款而數字相連的刻子" },
            { name: "小三姊妹", fan: 8, note: "兩副同款數字相連刻子 + 相連對子作眼" },
            { name: "三姊妹", fan: 15, note: "三副同款而數字相連的刻子" },
            { name: "小四姊妹", fan: 20, note: "三副同款數字相連刻子 + 相連對子作眼" },
            { name: "四姊妹", fan: 40, note: "四副同款而數字相連的刻子" },
            { name: "小五姊妹", fan: 60, note: "四副同款數字相連刻子 + 相連對子作眼" },
            { name: "五姊妹", fan: 80, note: "五副同款而數字相連的刻子" },
        ]
    },
    {
        category: "順子 (Sequences)",
        items: [
            { name: "一般高", fan: 3, note: "兩個一樣的順子" },
            { name: "三般高", fan: 15, note: "三個一樣的順子" },
            { name: "四般高", fan: 30, note: "四個一樣的順子" },
            { name: "二相逢", fan: 2, note: "兩個款式不同但數字一樣的順子" },
            { name: "三相逢", fan: 10, note: "三個款式不同但數字一樣的順子" },
            { name: "四同順", fan: 20, note: "四個數字一樣順子，不論款式" },
            { name: "五同順", fan: 40, note: "五個數字一樣順子，不論款式" },
            { name: "明龍", fan: 10, note: "同款一至九 (部分落地)" },
            { name: "暗龍", fan: 20, note: "同款一至九 (全部在手裡)" },
            { name: "明雜龍", fan: 8, note: "三款湊齊一至九 (部分落地)" },
            { name: "暗雜龍", fan: 15, note: "三款湊齊一至九 (全部在手裡)" },
        ]
    },
    {
        category: "組合/花色 (Sets & Colors)",
        items: [
            { name: "四歸一", fan: 5, note: "用盡同一隻牌的四隻牌" },
            { name: "四歸二", fan: 10, note: "用盡同一隻牌的四隻牌, 兩隻做眼" },
            { name: "四歸四", fan: 20, note: "用盡同一隻牌的四隻牌（順子）" },
            { name: "五門齊", fan: 10, note: "東南西北、中發白、筒、索、萬各有一組" },
            { name: "七門齊", fan: 15, note: "五門齊再加紅花、藍花各一" },
            { name: "混一色", fan: 30, note: "全副牌由同一種花色及番子組成" },
            { name: "清一色", fan: 80, note: "全副牌由同一種花色組成" },
            { name: "對對胡", fan: 30, note: "全副牌由刻子組成" },
            { name: "全求人", fan: 15, note: "全副牌落地，單釣出沖胡牌" },
            { name: "半求人", fan: 8, note: "全副牌落地，單釣自摸胡牌" },
        ]
    },
    {
        category: "特殊 (Special)",
        items: [
            { name: "七隻內", fan: 20, note: "地下只有七隻牌內食胡" },
            { name: "十隻內", fan: 10, note: "地下只有十隻牌內食胡" },
            { name: "小三元", fan: 20, note: "中發白兩刻一對眼" },
            { name: "大三元", fan: 40, note: "中發白三刻" },
            { name: "小三風", fan: 15, note: "東南西北其中兩刻一對眼" },
            { name: "大三風", fan: 30, note: "東南西北其中三刻" },
            { name: "小四喜", fan: 60, note: "東南西北三刻一對眼" },
            { name: "大四喜", fan: 80, note: "東南西北四刻" },
            { name: "十三么", fan: 80, note: "十三么，另三隻是自己摸回來的順子 or 暗刻，不能上 or 碰回來" },
            { name: "十六不搭", fan: 40, note: "東南西北中發白，其他三門每樣三隻，但不能搭上，例如一、四、九 or 二、五、九，再加一對眼" },
            { name: "不搭雜龍", fan: 50, note: "十六不搭中三色數字不重複" },
            { name: "暗不搭雜龍", fan: 60, note: "手牌中持有不搭雜龍" },
            { name: "不搭三相逢", fan: 60, note: "十六不搭中三色數字一樣" },
            { name: "嚦咕嚦咕", fan: 40, note: "七對子加一刻子" },
            { name: "嚦咕嚦咕八飛", fan: 60, note: "嚦咕嚦咕手持八對" },
            { name: "一台花", fan: 10, note: "集齊同一系列四隻花" },
            { name: "兩台花 (花胡)", fan: 30, note: "集齊八隻花可立刻食胡" },
            { name: "七搶一", fan: 20, note: "自己有六隻花，別家有一隻花，你摸到最後一隻花" },
            { name: "一搶七", fan: 20, note: "別家有七隻花，你摸到最後一隻花" },
            { name: "斷么", fan: 5, note: "沒有么九及番子" },
            { name: "全帶混么", fan: 10, note: "每一組合都有么九 or 番子" },
            { name: "全帶么", fan: 15, note: "每一組合都有么九，無番子" },
            { name: "混么", fan: 30, note: "都是么九及番子" },
            { name: "清么", fan: 80, note: "都是么九" },
            { name: "天胡", fan: 100, note: "莊家起手即胡" },
            { name: "地胡", fan: 90, note: "莊家打出第一隻牌閒家胡牌" },
            { name: "人胡", fan: 80, note: "閒家在四隻牌內胡牌" },
        ]
    },
    {
        category: "獎/罰 (Bonus & Penalty)",
        items: [
            { name: "追", fan: "1 底", note: "四家打同一隻牌，第一家賠三家" },
            { name: "暗槓", fan: "1 底", note: "完結時須打開，否則罰兩底" },
            { name: "一台草", fan: "0.5 底", note: "" },
            { name: "一台花", fan: "1 底", note: "可以先草後花，不可以先花後草" },
            { name: "擲一二三", fan: "1 底", note: "莊家擲到一二三賠三家" },
            { name: "擲圍骰", fan: "1 底", note: "莊家擲到圍骰收三家" },
            { name: "詐胡", fan: "30", note: "賠三家" }
        ]
    }
];
