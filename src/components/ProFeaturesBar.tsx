"use client";

import React, { useState } from "react";
import { Mic2, Sparkles, Lock, Shuffle, Layers } from "lucide-react";
import { VOICE_PRESETS, VoicePreset } from "@/lib/voiceChanger";
import { TOPIC_DECKS, TopicDeckId } from "@/types/topics";

export type SyncedTopic = {
  deckTitle: string;
  emoji: string;
  question: string;
  sender: "you" | "partner";
};

type Props = {
  isPro: boolean;
  voicePreset: VoicePreset;
  onSelectVoice: (preset: VoicePreset) => void;
  isConnected: boolean;
  activeTopic: SyncedTopic | null;
  onDrawTopic: (deckTitle: string, emoji: string, question: string) => void;
  onOpenProModal: (reason: string) => void;
};

export function ProFeaturesBar({
  isPro,
  voicePreset,
  onSelectVoice,
  isConnected,
  activeTopic,
  onDrawTopic,
  onOpenProModal,
}: Props) {
  const [selectedDeckId, setSelectedDeckId] = useState<TopicDeckId>("casual");

  const handleVoiceClick = (preset: VoicePreset, requiresPro: boolean) => {
    if (requiresPro && !isPro) {
      onOpenProModal("リアルタイム・ボイスチェンジャーはPRO限定機能です！");
      return;
    }
    onSelectVoice(preset);
  };

  const handleDeckSelect = (deckId: TopicDeckId, requiresPro: boolean) => {
    if (requiresPro && !isPro) {
      onOpenProModal("「恋愛」「深夜のぶっちゃけ」「エンタメ」デッキはPRO限定です！");
      return;
    }
    setSelectedDeckId(deckId);
  };

  const handleDrawCard = () => {
    const deck = TOPIC_DECKS.find((d) => d.id === selectedDeckId) || TOPIC_DECKS[0];
    const randomQ = deck.cards[Math.floor(Math.random() * deck.cards.length)];
    onDrawTopic(deck.title, deck.emoji, randomQ);
  };

  return (
    <div className="w-full max-w-4xl mt-3 space-y-3 z-10">
      {/* ボイスチェンジャー選択バー */}
      <div className="p-3.5 rounded-3xl bg-white/65 border border-white/90 backdrop-blur-xl shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 px-1">
          <Mic2 className="w-4 h-4 text-violet-500" />
          <span>ボイスチェンジャー</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {VOICE_PRESETS.map((v) => {
            const active = voicePreset === v.id;
            const locked = v.isPro && !isPro;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => handleVoiceClick(v.id, v.isPro)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-violet-400 to-sky-400 text-white shadow-xs"
                    : locked
                    ? "bg-slate-100/80 text-slate-400 border border-slate-200/80 hover:bg-amber-50 hover:text-amber-700"
                    : "bg-white/90 text-slate-600 border border-slate-200/70 hover:bg-violet-50"
                }`}
              >
                <span>{v.emoji}</span>
                <span>{v.label}</span>
                {locked && <Lock className="w-3 h-3 text-amber-500 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 通話中限定：同期お題カードデッキ */}
      {isConnected && (
        <div className="p-4 rounded-3xl bg-white/75 border border-white/95 backdrop-blur-2xl shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700">
              <Layers className="w-4 h-4 text-pink-500" />
              <span>トークお題カード（相手の画面にも同期）</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {TOPIC_DECKS.map((deck) => {
                const active = selectedDeckId === deck.id;
                const locked = deck.isPro && !isPro;
                return (
                  <button
                    key={deck.id}
                    type="button"
                    onClick={() => handleDeckSelect(deck.id, deck.isPro)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
                      active
                        ? "bg-pink-400 text-white shadow-xs"
                        : locked
                        ? "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-700"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-pink-50"
                    }`}
                  >
                    <span>{deck.emoji}</span>
                    <span>{deck.title}</span>
                    {locked && <Lock className="w-3 h-3 text-amber-500" />}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={handleDrawCard}
                className="ml-1 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-pink-400 to-amber-400 hover:opacity-95 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>お題を引く</span>
              </button>
            </div>
          </div>

          {activeTopic ? (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/90 via-white to-violet-50/90 border border-pink-200/80 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-600 mb-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {activeTopic.emoji} {activeTopic.deckTitle}（
                    {activeTopic.sender === "you" ? "あなたが引いたお題" : "相手が引いたお題"}）
                  </span>
                </div>
                <p className="text-sm font-extrabold text-slate-800">{activeTopic.question}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-1">
              話題に迷ったら「お題を引く」を押すと2人の画面に同時にカードが出ます！
            </p>
          )}
        </div>
      )}
    </div>
  );
}