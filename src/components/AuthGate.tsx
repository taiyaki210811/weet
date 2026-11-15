"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Mail, Lock, Sparkles, Loader2, Info } from "lucide-react";

type Props = {
  onSuccess: () => void;
};

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("Email not confirmed")) {
    return "メールアドレスの確認が完了していません。受信トレイ（Supabase Auth）のリンクを押してください。";
  }
  if (message.includes("User already registered")) {
    return "このメールアドレスはすでに登録されています。ログイン画面から進んでください。";
  }
  return message;
}

export function AuthGate({ onSuccess }: Props) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setInfoMsg("");
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Googleログインに失敗しました";
      setErrorMsg(translateAuthError(msg));
      setGoogleLoading(false);
    }
  };

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
          setInfoMsg(
            "確認メールを送信しました！差出人「Supabase Auth」から届く英語メール内のリンク（Confirm email address）を押すと登録が完了します。"
          );
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
      setErrorMsg(translateAuthError(msg));
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

        {/* Google で続けるボタン */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="w-full py-3 px-4 rounded-2xl bg-white/95 hover:bg-white border border-slate-200/90 text-slate-700 font-bold text-sm shadow-xs transition active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.3 0 6.08-1.09 8.1-2.96l-3.88-3.05c-1.1.74-2.51 1.18-4.22 1.18-3.24 0-5.99-2.19-6.97-5.13H1.01v3.14C3.05 21.2 7.24 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.03 14.04c-.25-.74-.39-1.54-.39-2.36 0-.82.14-1.62.39-2.36V6.18H1.01C.37 7.45 0 8.88 0 10.4s.37 2.95 1.01 4.22l4.02-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.79 0 3.41.62 4.68 1.82l3.51-3.51C18.07 1.19 15.3 0 12 0 7.24 0 3.05 2.8 1.01 6.82l4.02 3.14c.98-2.94 3.73-5.21 6.97-5.21Z"
              />
            </svg>
          )}
          <span>Google で続ける（確認メール不要）</span>
        </button>

        <div className="relative my-5 flex items-center justify-center">
          <div className="border-t border-slate-200/80 w-full" />
          <span className="px-3 text-[11px] font-bold text-slate-400 bg-transparent whitespace-nowrap">
            またはメールアドレスで
          </span>
          <div className="border-t border-slate-200/80 w-full" />
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

          {/* 新規登録時のみ表示：Supabase Auth 確認メールの公式案内カード */}
          {isSignUp && (
            <div className="p-3.5 rounded-2xl bg-sky-50/90 border border-sky-200/80 text-xs text-slate-600 space-y-1">
              <p className="font-extrabold text-sky-700 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-sky-500 shrink-0" />
                <span>登録後に届く確認メールについて</span>
              </p>
              <p className="text-[11px] leading-relaxed text-slate-600">
                認証システムの仕様上、差出人名{" "}
                <span className="font-bold text-slate-800">「Supabase Auth」</span>{" "}
                から英語の認証メール（Confirm your email address）が届きます。Weet公式の案内ですので、メール内のリンクを押して登録を完了してください。
              </p>
            </div>
          )}

          {isSignUp && (
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-0.5">
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
            <p className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 leading-relaxed">
              {infoMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || googleLoading}
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