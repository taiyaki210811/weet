"use client";

import React, { useState } from "react";
import { Users, Lock, Copy, Check, Sparkles, Compass, X } from "lucide-react";

export const MOOD_TAGS = [
  { id: "any", label: "おまかせ（全員）", emoji: "🎲", isPro: false },
  { id: "chill", label: "まったり雑談", emoji: "☕", isPro: true },
  { id: "midnight", label: "寝落ち・深夜", emoji: "🌙", isPro: true },
  { id: "hobby", label: "ゲーム・趣味", emoji: "🎮", isPro: true },
] as const;

type Props = {
  isPro: boolean;
  isIdle: boolean;
  moodTag: string;
  onSelectMoodTag: (tag: string) => void;
  privateSpaceCode: string | null;
  onCreatePrivateSpace: () => void;
  onExitPrivateSpace: () => void;
  onOpenProModal: (reason: string) => void;
};

export function MatchingModeBar({
  isPro,
  isIdle,
  moodTag,
  onSelectMoodTag,
  privateSpaceCode,
  onCreatePrivateSpace,
  onExitPrivateSpace,
  onOpenProModal,
}: Props) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined" && privateSpaceCode
      ? `${window.location.origin}/?space=${privateSpaceCode}`
      : "";

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTagClick = (id: string, requiresPro: boolean) => {
    if (requiresPro && !isPro) {
      onOpenProModal("気分タグ絞り込み＆優先マッチングはPRO会員限定です！");
      return;
    }
    onSelectMoodTag(id);
  };

  const handlePrivateClick = () => {
    if (!isPro) {
      onOpenProModal("友達専用「プライベートスペース」の作成はPRO会員限定です！");
      return;
    }
    onCreatePrivateSpace();
  };

  return (
    <div className="w-full max-w-4xl mb-3 space-y-2.5 z-10">
      {/* プライベートスペース起動中バナー */}
      {privateSpaceCode ? (
        <div className="p-3.5 rounded-3xl bg-gradient-to-r from-sky-50/90 via-white/90 to-violet-50/90 border border-sky-200 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-extrabold text-sky-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-sky-500" />
              友達専用プライベートスペース（コード: {privateSpaceCode}）
            </span>
            {isIdle && (
              <button
                onClick={onExitPrivateSpace}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                ランダム通話に戻る
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full px-3 py-1.5 rounded-xl bg-white border border-sky-100 text-xs text-slate-600 font-mono"
            />
            <button
              onClick={handleCopy}
              className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold flex items-center gap-1 whitespace-nowrap shadow-xs transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "コピー済" : "招待リンク"}
            </button>
          </div>
        </div>
      ) : (
        /* 通常時：気分タグ＆プライベートスペース作成ボタン */
        isIdle && (
          <div className="p-3 rounded-3xl bg-white/65 border border-white/90 backdrop-blur-xl shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1 px-1">
                <Compass className="w-3.5 h-3.5 text-sky-500" />
                気分タグ:
              </span>
              {MOOD_TAGS.map((tag) => {
                const active = moodTag === tag.id;
                const locked = tag.isPro && !isPro;
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleTagClick(tag.id, tag.isPro)}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                      active
                        ? "bg-sky-400 text-white shadow-xs"
                        : locked
                        ? "bg-slate-100/80 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                        : "bg-white text-slate-600 border border-slate-200/70 hover:bg-sky-50"
                    }`}
                  >
                    <span>{tag.emoji}</span>
                    <span>{tag.label}</span>
                    {locked && <Lock className="w-3 h-3 text-amber-500" />}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handlePrivateClick}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-400 to-sky-400 hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Users className="w-3.5 h-3.5" />
              <span>友達と話す部屋を作る</span>
              {!isPro && <Lock className="w-3 h-3 text-amber-200" />}
              {isPro && <Sparkles className="w-3 h-3 text-amber-200" />}
            </button>
          </div>
        )
      )}
    </div>
  );
}