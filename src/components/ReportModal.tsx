"use client";

import React, { useState } from "react";
import { ShieldAlert, X, Loader2 } from "lucide-react";


const REPORT_REASONS = [
  "暴言・誹謗中傷・ハラスメント",
  "不快・卑猥な発言や音声",
  "スパム・宣伝・荒らし行為",
  "その他規約違反",
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  reporterId: string;
  onReported: () => void;
};

export function ReportModal({ isOpen, onClose, reporterId, onReported }: Props) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporterId,
          reason: selectedReason,
        }),
      });
      onReported();
      onClose();
    } catch (e) {
      console.error("Report failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-sm p-6 rounded-[2rem] bg-white/95 border border-white shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-rose-600 font-extrabold text-base mb-1">
          <ShieldAlert className="w-5 h-5" />
          <span>相手を通報・ブロック</span>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          通報すると通話を即座に終了し、今後この相手と2度とマッチングしなくなります。
        </p>

        <div className="space-y-2 mb-5">
          {REPORT_REASONS.map((r) => (
            <label
              key={r}
              className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${
                selectedReason === r
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : "bg-slate-50/70 border-slate-200/70 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <input
                type="radio"
                name="reportReason"
                checked={selectedReason === r}
                onChange={() => setSelectedReason(r)}
                className="text-rose-500 focus:ring-rose-400"
              />
              <span>{r}</span>
            </label>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm shadow-md shadow-rose-200 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>通報して通話を終了する</span>
        </button>
      </div>
    </div>
  );
}