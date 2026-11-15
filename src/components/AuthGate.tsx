"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Mail, Lock, Sparkles, Loader2 } from "lucide-react";

type Props = {
  onSuccess: () => void;
};

export function AuthGate({ onSuccess }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");

    if (isSignUp && !agreedTerms) {
      setErrorMsg("利用規約および18歳以上であることに同意してください。");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          onSuccess();
        } else {
          setInfoMsg("確認メールを送信しました！メール内のリンクをクリックしてからログインしてね。");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "認証エラーが発生しました";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-violet-100 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-pink-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-[2.2rem] bg-white/75 border border-white/95 backdrop-blur-2xl shadow-[0_16px_48px_rgba(148,163,184,0.2)] z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-violet-400 flex items-center justify-center text-white shadow-md mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <p className="text-sm font-extrabold tracking-wide text-violet-500 mb-1">
            ようこそ WEET へ
          </p>
          <h1 className="text-xl font-extrabold text-slate-800">
            {isSignUp ? "新規アカウント作成" : "おかえりなさい！"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            相手にはメアドもカメラ映像も一切公開されません
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">メールアドレス</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">パスワード（6文字以上）</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/90 border border-slate-200 text-sm text-slate-700 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {isSignUp && (
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-sky-500 focus:ring-sky-400"
              />
              <span>
                私は18歳以上であり、暴言・迷惑行為を行わないこと（違反時のアカウント停止）に同意します。
              </span>
            </label>
          )}

          {errorMsg && (
            <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-600">
              {errorMsg}
            </p>
          )}

          {infoMsg && (
            <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-400 to-indigo-400 hover:from-sky-300 hover:to-indigo-300 text-white font-bold text-sm shadow-md shadow-sky-200 transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isSignUp ? "無料でアカウント登録" : "ログインしてはじめる"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg("");
              setInfoMsg("");
            }}
            className="text-xs font-bold text-sky-600 hover:text-sky-500 cursor-pointer"
          >
            {isSignUp ? "すでにアカウントをお持ちの方はこちら（ログイン）" : "はじめての方はこちら（新規登録）"}
          </button>
        </div>
      </div>
    </div>
  );
}