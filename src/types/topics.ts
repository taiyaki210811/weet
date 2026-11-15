export type TopicDeckId = "casual" | "love" | "midnight" | "hobby";

export type TopicDeck = {
  id: TopicDeckId;
  title: string;
  emoji: string;
  isPro: boolean;
  cards: string[];
};

export const TOPIC_DECKS: TopicDeck[] = [
  {
    id: "casual",
    title: "雑談・ライト",
    emoji: "☕",
    isPro: false,
    cards: [
      "最近一番笑った出来事は？",
      "今一番食べたいものを正直に言うと？",
      "休日の理想の過ごし方はインドア派？アウトドア派？",
      "今までで一番テンションが上がった買い物は？",
      "タイムマシンがあったら過去と未来どっちに行く？",
      "コンビニでつい買っちゃう定番商品は？",
    ],
  },
  {
    id: "love",
    title: "恋愛・価値観",
    emoji: "💘",
    isPro: true,
    cards: [
      "好きになる人の共通点ってある？",
      "連絡はマメに取りたい派？マイペース派？",
      "初デートで行くならどこが理想？",
      "実はグッとくる相手の仕草は？",
      "友達から恋愛に発展するのってアリ？ナシ？",
    ],
  },
  {
    id: "midnight",
    title: "深夜のぶっちゃけ",
    emoji: "🌌",
    isPro: true,
    cards: [
      "周りの人にはあまり言えていない密かな野望は？",
      "人生で一番「あれは黒歴史だった…」と思う瞬間は？",
      "もし1年間だけ完全に自由な時間とお金があったら何する？",
      "今の自分に一番足りないと思うものは？",
      "匿名だからこそ言える、ちょっとした本音は？",
    ],
  },
  {
    id: "hobby",
    title: "ゲーム・エンタメ",
    emoji: "🎮",
    isPro: true,
    cards: [
      "人生で一番ハマったゲームやアニメは？",
      "最近リピートして聴いてる神曲・アーティストは？",
      "YouTubeやTikTokでつい見ちゃうジャンルは？",
      "もし1つだけ特殊能力が手に入るなら何が欲しい？",
      "夜ふかししてまで一気見した作品はある？",
    ],
  },
];