"use client";

import React from "react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Heart,
  SkipForward,
  Lock,
} from "lucide-react";
import {
  AVATAR_SPECIES,
  AVATAR_STYLES,
  AvatarSpecies,
  AvatarStyle,
  THEMES,
  ThemeColor,
} from "@/types/avatar";

type CallState = "idle" | "searching" | "connected";

type Props = {
  isPro: boolean;
  onOpenProModal: (reason: string) => void;
  species: AvatarSpecies;
  setSpecies: (s: AvatarSpecies) => void;
  theme: ThemeColor;
  setTheme: (t: ThemeColor) => void;
  avatarStyle: AvatarStyle;
  setAvatarStyle: (st: AvatarStyle) => void;
  callState: CallState;
  isAiReady: boolean;
  remainingCalls: number | null;
  reunionValid: boolean | null;
  activeReunionToken: string | null;
  myReunionAgree: boolean;
  isMuted: boolean;
  onStartSearch: () => void;
  onToggleReunionAgree: () => void;
  onSkipToNext: () => void;
  onToggleMute: () => void;
  onEndCall: () => void;
};

export function AvatarControls({
  isPro,
  onOpenProModal,
  species,
  setSpecies,
  theme,
  setTheme,
  avatarStyle,
  setAvatarStyle,
  callState,
  isAiReady,
  remainingCalls,
  reunionValid,
  activeReunionToken,
  myReunionAgree,
  isMuted,
  onStartSearch,
  onToggleReunionAgree,
  onSkipToNext,
  onToggleMute,
  onEndCall,
}: Props) {
  const handleSelectSpecies = (sp: (typeof AVATAR_SPECIES)[number]) => {
    if (sp.isPro && !isPro) {
      onOpenProModal(`限定アバター「${sp.emoji} ${sp.label}」はPRO会員限定です！`);
      return;
    }
    setSpecies(sp.id);
  };

  const handleSelectTheme = (t: ThemeColor) => {
    if (t.isPro && !isPro) {
      onOpenProModal("虹色に輝く特別カラー「Aurora」はPRO会員限定です！");
      return;
    }
    setTheme(t);
  };

  return (
    <>
      {/* キャラクター（種族）選択ピッカー */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-white/65 border border-white/90 backdrop-blur-xl shadow-sm z-10">
        <span className="text-xs font-semibold text-slate-400 mr-1 pl-1">アバター:</span>
        {AVATAR_SPECIES.map((sp) => {
          const locked = Boolean(sp.isPro && !isPro);
          return (
            <button
              key={sp.id}
              onClick={() => handleSelectSpecies(sp)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                species === sp.id
                  ? "bg-gradient-to-r from-sky-200/90 to-violet-200/90 text-slate-800 border border-white shadow-xs scale-105"
                  : locked
                  ? "bg-slate-100/75 text-slate-400 hover:bg-amber-50 hover:text-amber-700 border border-slate-200/60"
                  : "bg-white/50 text-slate-500 hover:bg-white/80 hover:text-slate-700 border border-transparent"
              }`}
            >
              <span>{sp.emoji}</span>
              <span>{sp.label}</span>
              {locked && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
            </button>
          );
        })}
      </div>

      {/* 下部コントロールバー */}
      <div className="mt-2.5 flex flex-wrap items-center justify-center gap-4 px-6 py-3 rounded-full bg-white/70 border border-white/95 backdrop-blur-2xl shadow-[0_8px_30px_rgba(148,163,184,0.15)] z-10">
        {/* パステルカラー選択 */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">カラー:</span>
          {THEMES.map((t) => {
            const locked = Boolean(t.isPro && !isPro);
            return (
              <button
                key={t.name}
                onClick={() => handleSelectTheme(t)}
                className={`relative w-6 h-6 rounded-full border-2 transition-transform cursor-pointer shadow-xs flex items-center justify-center ${
                  theme.name === t.name
                    ? "border-slate-700 scale-115"
                    : "border-white opacity-85 hover:opacity-100"
                }`}
                style={{ background: t.swatch }}
                title={locked ? `${t.name}（PRO限定）` : t.name}
              >
                {locked && <Lock className="w-3 h-3 text-white drop-shadow" />}
              </button>
            );
          })}
        </div>

        {/* Human選択時のみ表示するワイヤー質感切替 */}
        {species === "human" && (
          <>
            <div className="h-5 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400 mr-1">質感:</span>
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setAvatarStyle(s.id)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                    avatarStyle === s.id
                      ? "bg-slate-700 text-white shadow-xs"
                      : "bg-white/60 text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="h-5 w-[1px] bg-slate-200" />

        {callState === "idle" ? (
          <button
            onClick={onStartSearch}
            disabled={
              !isAiReady ||
              (remainingCalls !== null && remainingCalls <= 0) ||
              reunionValid === false
            }
            className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-sky-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-bold text-sm transition-all shadow-md shadow-sky-200 cursor-pointer active:scale-95"
          >
            <PhoneCall className="w-4 h-4" />
            {reunionValid === false
              ? "無効な再会パスです"
              : activeReunionToken
              ? "再会ルームに入室する"
              : remainingCalls !== null && remainingCalls <= 0
              ? "本日の上限に達しました"
              : "通話をはじめる"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {callState === "connected" && (
              <>
                <button
                  onClick={onToggleReunionAgree}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full border font-bold text-xs transition-all cursor-pointer active:scale-95 ${
                    myReunionAgree
                      ? "bg-pink-400 border-pink-300 text-white shadow-md shadow-pink-200"
                      : "bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-600"
                  }`}
                >
                  <Heart className={`w-4 h-4 ${myReunionAgree ? "fill-white" : ""}`} />
                  {myReunionAgree ? "合意まち..." : "また話したい"}
                </button>

                <button
                  onClick={onSkipToNext}
                  disabled={remainingCalls !== null && remainingCalls <= 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-100 hover:bg-sky-200/80 border border-sky-200 text-sky-700 font-bold text-xs transition-all cursor-pointer active:scale-95"
                >
                  <SkipForward className="w-4 h-4" />
                  次へ
                </button>
              </>
            )}

            <button
              onClick={onToggleMute}
              className={`p-2.5 rounded-full border transition cursor-pointer ${
                isMuted
                  ? "bg-amber-100 border-amber-300 text-amber-700"
                  : "bg-white/80 hover:bg-white border-slate-200 text-slate-600"
              }`}
              title="マイクミュート"
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              onClick={onEndCall}
              className="flex items-center gap-1.5 px-5 py-2 rounded-full bg-rose-400 hover:bg-rose-300 text-white font-bold text-sm transition-all shadow-md shadow-rose-200 cursor-pointer active:scale-95"
            >
              <PhoneOff className="w-4 h-4" />
              {callState === "searching" ? "キャンセル" : "終了"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}