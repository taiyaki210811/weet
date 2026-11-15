"use client";

import React, { useState } from "react";
import { Crown, X, Check, Sparkles, Loader2, CreditCard, Settings } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { UserProfile } from "@/types/plan";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onProfileUpdated: (updated: UserProfile) => void;
  highlightReason?: string | null;
};

export function ProUpgradeModal({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
  highlightReason,
}: Props) {
  const [updating, setUpdating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  // 本番Stripe決済ページへ遷移
  const handleStripeCheckout = async () => {
    setCheckoutLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          email: profile.email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "決済画面の起動に失敗しました");
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "決済エラーが発生しました");
      setCheckoutLoading(false);
    }
  };

  // PRO会員向け：Stripeの解約・支払い管理画面へ遷移
  const handleManageSubscription = async () => {
    setCheckoutLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profile.email }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "管理画面を開けませんでした");
      }
      window.location.href = data.url;
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "エラーが発生しました");
      setCheckoutLoading(false);
    }
  };

  // 開発テスト用：DBのis_proを即座に切り替える
  const handleToggleDemoPro = async () => {
    setUpdating(true);
    try {
      const nextPro = !profile.is_pro;
      const { data, error } = await supabase
        .from("profiles")
        .update({ is_pro: nextPro })
        .eq("id", profile.id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onProfileUpdated(data as UserProfile);
      }
    } catch (e) {
      console.error("Failed to toggle PRO:", e);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md">
      <div className="w-full max-w-md p-6 rounded-[2.2rem] bg-white/90 border border-white backdrop-blur-2xl shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-pink-400 flex items-center justify-center text-white shadow-md mb-2.5">
            <Crown className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-800">
            PROメンバーシップ
          </h2>
          {highlightReason ? (
            <p className="mt-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold">
              {highlightReason}
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">
              もっと長く、もっと自由に匿名アバター通話を楽しもう
            </p>
          )}
        </div>

        <div className="space-y-2.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-100 mb-5 text-xs">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Check className="w-4 h-4 text-amber-500 shrink-0" />
            <span>1日の通話上限が 25回 → 120回 に大幅アップ</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Check className="w-4 h-4 text-amber-500 shrink-0" />
            <span>1回の最大通話時間が 2分30秒 → 10分 に延長</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Check className="w-4 h-4 text-pink-500 shrink-0" />
            <span>「また話したい♡」＆ 再会パス発行のロック解除</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Check className="w-4 h-4 text-sky-500 shrink-0" />
            <span>友達と2人きりで話せる「プライベートスペース」作成</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <Check className="w-4 h-4 text-violet-500 shrink-0" />
            <span>ボイスチェンジャー・限定アバター・全お題・優先マッチング解放</span>
          </div>
        </div>

        {errorMsg && (
          <p className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600">
            {errorMsg}
          </p>
        )}

        <div className="space-y-2.5">
          {profile.is_pro ? (
            <button
              onClick={handleManageSubscription}
              disabled={checkoutLoading}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Settings className="w-4 h-4" />
              )}
              <span>プランの確認・解約（Stripe管理画面）</span>
            </button>
          ) : (
            <button
              onClick={handleStripeCheckout}
              disabled={checkoutLoading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-pink-400 to-violet-400 hover:opacity-95 text-white font-extrabold text-sm shadow-md shadow-pink-200 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {checkoutLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CreditCard className="w-4 h-4" />
              )}
              <span>StripeでPROにアップグレード</span>
            </button>
          )}

          <button
            onClick={handleToggleDemoPro}
            disabled={updating}
            className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {updating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span>
              {profile.is_pro
                ? "【開発テスト用】Freeプランに戻す"
                : "【開発テスト用】決済なしでPROを試す"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}