export type ThemeColor = {
  name: string;
  swatch: string;
  stroke: string;
  glow: string;
  isPro?: boolean;
};

export const THEMES: ThemeColor[] = [
  { name: "Soda", swatch: "#7dd3fc", stroke: "#0284c7", glow: "rgba(56, 189, 248, 0.35)" },
  { name: "Sakura", swatch: "#f9a8d4", stroke: "#db2777", glow: "rgba(244, 114, 182, 0.35)" },
  { name: "Lavender", swatch: "#d8b4fe", stroke: "#7c3aed", glow: "rgba(167, 139, 250, 0.35)" },
  { name: "Mint", swatch: "#6ee7b7", stroke: "#059669", glow: "rgba(52, 211, 153, 0.35)" },
  { name: "Peach", swatch: "#fdba74", stroke: "#ea580c", glow: "rgba(251, 146, 60, 0.35)" },
  {
    name: "Aurora",
    swatch: "linear-gradient(135deg, #f472b6, #a78bfa, #38bdf8, #34d399)",
    stroke: "#8b5cf6",
    glow: "rgba(236, 72, 153, 0.45)",
    isPro: true,
  },
];

export type AvatarStyle = "line" | "nodes" | "aura";

export const AVATAR_STYLES: { id: AvatarStyle; label: string }[] = [
  { id: "line", label: "Line" },
  { id: "nodes", label: "Nodes" },
  { id: "aura", label: "Aura" },
];

export type AvatarSpecies = "human" | "fox" | "bear" | "panda" | "cat" | "furry" | "dragon" | "unicorn";

export const AVATAR_SPECIES: { id: AvatarSpecies; label: string; emoji: string; isPro?: boolean }[] = [
  { id: "fox", label: "キツネ", emoji: "🦊" },
  { id: "panda", label: "パンダ", emoji: "🐼" },
  { id: "bear", label: "クマ", emoji: "🐻" },
  { id: "cat", label: "ネコ", emoji: "🐱" },
  { id: "human", label: "Human", emoji: "👤" },
  { id: "furry", label: "Furry", emoji: "🐺", isPro: true },
  { id: "dragon", label: "ドラゴン", emoji: "🐉", isPro: true },
  { id: "unicorn", label: "ユニコーン", emoji: "🦄", isPro: true },
];

export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378,
  400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21,
  54, 103, 67, 109, 10,
];
export const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33];
export const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398, 362];
export const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 61];
export const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191, 78];
export const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];

export const NODE_HIGHLIGHT_INDICES = [
  10, 152, 234, 454, 168, 1, 33, 133, 362, 263, 61, 291, 0, 17, 70, 107, 300, 336,
];

export const ALL_USED_INDICES = Array.from(
  new Set([
    ...FACE_OVAL,
    ...LEFT_EYE,
    ...RIGHT_EYE,
    ...LIPS_OUTER,
    ...LIPS_INNER,
    ...LEFT_EYEBROW,
    ...RIGHT_EYEBROW,
    ...NODE_HIGHLIGHT_INDICES,
    1, 13, 14, 159, 145, 386, 374, 105, 334,
  ])
);

export function getEvolutionLevel(seconds: number): { level: number; title: string } {
  if (seconds >= 180) return { level: 4, title: "Lv.4 Cosmic" };
  if (seconds >= 90) return { level: 3, title: "Lv.3 Sparkle" };
  if (seconds >= 30) return { level: 2, title: "Lv.2 Aura" };
  return { level: 1, title: "Lv.1 Basic" };
}