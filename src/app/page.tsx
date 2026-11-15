"use client";

import React, { useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import {
  ShieldCheck,
  Loader2,
  Lock,
  Flame,
  Heart,
  Copy,
  Check,
  Sparkles,
  Clock,
  Wand2,
  Crown,
  LogOut,
  Flag,
  Volume2,
  VolumeX,
  Radio,
} from "lucide-react";
import {
  ALL_USED_INDICES,
  AVATAR_SPECIES,
  AvatarSpecies,
  AvatarStyle,
  getEvolutionLevel,
  THEMES,
  ThemeColor,
} from "@/types/avatar";
import { getTodayJST, PLAN_LIMITS, UserProfile } from "@/types/plan";
import { drawAnimojiAvatar, drawPastelDotGrid, LandmarkMap } from "@/lib/avatarRenderer";
import { RealtimeVoiceChanger, VoicePreset } from "@/lib/voiceChanger";
import { uiSounds } from "@/lib/uiSounds";
import { AvatarControls } from "@/components/AvatarControls";
import { AuthGate } from "@/components/AuthGate";
import { ProUpgradeModal } from "@/components/ProUpgradeModal";
import { ProFeaturesBar, SyncedTopic } from "@/components/ProFeaturesBar";
import { MatchingModeBar } from "@/components/MatchingModeBar";
import { ReportModal } from "@/components/ReportModal";
import { supabase } from "@/lib/supabase";

type CallState = "idle" | "searching" | "connected";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function RandomAvatarChatPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [proModalOpen, setProModalOpen] = useState(false);
  const [proModalReason, setProModalReason] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [soundFxEnabled, setSoundFxEnabled] = useState(true);
  const [checkoutBanner, setCheckoutBanner] = useState<string | null>(null);

  const [isAiReady, setIsAiReady] = useState(false);
  const [callState, setCallState] = useState<CallState>("idle");
  const [statusText, setStatusText] = useState("AIモデルを読み込み中...");
  const [isMuted, setIsMuted] = useState(false);
  const [relayVerified, setRelayVerified] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const callSecondsRef = useRef(0);
  const searchRunRef = useRef(0);
  const matchRequestInFlightRef = useRef(false);
  const restartSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 気分タグ＆友達用プライベートスペース
  const [moodTag, setMoodTag] = useState<string>("any");
  const [privateSpaceCode, setPrivateSpaceCode] = useState<string | null>(null);

  // ボイスチェンジャー＆お題カードステート
  const [voicePreset, setVoicePreset] = useState<VoicePreset>("normal");
  const voiceChangerRef = useRef<RealtimeVoiceChanger | null>(null);
  const processedAudioTrackRef = useRef<MediaStreamTrack | null>(null);
  const [activeTopic, setActiveTopic] = useState<SyncedTopic | null>(null);

  // 一期一会・再会パス用のステート
  const [activeReunionToken, setActiveReunionToken] = useState<string | null>(null);
  const [reunionValid, setReunionValid] = useState<boolean | null>(null);
  const [myReunionAgree, setMyReunionAgree] = useState(false);
  const [partnerReunionAgree, setPartnerReunionAgree] = useState(false);
  const [issuedReunionUrl, setIssuedReunionUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const myReunionAgreeRef = useRef(false);
  const partnerReunionAgreeRef = useRef(false);
  const isInitiatorRef = useRef(false);
  const hasIssuedPassRef = useRef(false);
  const isSkippingRef = useRef(false);

  // アバター設定
  const [theme, setTheme] = useState<ThemeColor>(THEMES[0]);
  const themeRef = useRef<ThemeColor>(THEMES[0]);
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>("line");
  const avatarStyleRef = useRef<AvatarStyle>("line");
  const [species, setSpecies] = useState<AvatarSpecies>("fox");
  const speciesRef = useRef<AvatarSpecies>("fox");

  const currentPlan = profile?.is_pro ? PLAN_LIMITS.pro : PLAN_LIMITS.free;
  const remainingCalls = profile ? Math.max(0, currentPlan.dailyCalls - profile.daily_calls_count) : null;
  const remainingSeconds = Math.max(0, currentPlan.maxSeconds - callSeconds);

  useEffect(() => {
    uiSounds.enabled = soundFxEnabled;
  }, [soundFxEnabled]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  useEffect(() => {
    avatarStyleRef.current = avatarStyle;
  }, [avatarStyle]);

  useEffect(() => {
    speciesRef.current = species;
  }, [species]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const roomIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const hasCountedCurrentCallRef = useRef(false);
  const remoteDataRef = useRef<{
    landmarks: LandmarkMap;
    theme?: ThemeColor;
    style?: AvatarStyle;
    species?: AvatarSpecies;
  } | null>(null);

  const loadUserProfile = async () => {
    setAuthLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      const today = getTodayJST();
      let userProf = data as UserProfile;

      if (userProf.last_call_date !== today) {
        const { data: resetData } = await supabase
          .from("profiles")
          .update({ daily_calls_count: 0, last_call_date: today })
          .eq("id", userProf.id)
          .select()
          .single();
        if (resetData) userProf = resetData as UserProfile;
      }

      setProfile(userProf);
    } catch (e) {
      console.error("Profile load failed:", e);
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutStatus = params.get("checkout");
    let checkoutBannerTimer: ReturnType<typeof setTimeout> | null = null;
    let profileReloadTimer: ReturnType<typeof setTimeout> | null = null;
    let initialLoadTimer: ReturnType<typeof setTimeout> | null = null;
    let urlStateTimer: ReturnType<typeof setTimeout> | null = null;

    if (checkoutStatus === "success") {
      uiSounds.playChime();
      checkoutBannerTimer = setTimeout(
        () => setCheckoutBanner("🎉 PROメンバーシップへのアップグレードが完了しました！"),
        0
      );
      window.history.replaceState({}, "", "/");
      // WebhookのDB反映がわずかに遅れた場合も拾えるよう1.5秒後にも再取得
      profileReloadTimer = setTimeout(() => {
        loadUserProfile();
      }, 1500);
    } else if (checkoutStatus === "cancel") {
      checkoutBannerTimer = setTimeout(
        () => setCheckoutBanner("決済がキャンセルされました（いつでもPROにアップグレードできます）"),
        0
      );
      window.history.replaceState({}, "", "/");
    }

    const tokenFromUrl = params.get("reunion");
    if (tokenFromUrl) {
      fetch("/api/reunion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", token: tokenFromUrl }),
      })
        .then((r) => r.json())
        .then((d) => setReunionValid(Boolean(d.valid)))
        .catch(() => setReunionValid(false));
    }

    const spaceFromUrl = params.get("space");
    initialLoadTimer = setTimeout(() => {
      void loadUserProfile();
    }, 0);
    urlStateTimer = setTimeout(() => {
      if (tokenFromUrl) setActiveReunionToken(tokenFromUrl);
      if (spaceFromUrl) setPrivateSpaceCode(spaceFromUrl.toUpperCase());
    }, 0);

    return () => {
      if (checkoutBannerTimer) clearTimeout(checkoutBannerTimer);
      if (profileReloadTimer) clearTimeout(profileReloadTimer);
      if (initialLoadTimer) clearTimeout(initialLoadTimer);
      if (urlStateTimer) clearTimeout(urlStateTimer);
    };
  }, []);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId || landmarkerRef.current) return;
    let active = true;
    async function initMediaPipe() {
      try {
        setStatusText("1/2: エンジン準備中...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );

        if (!active) return;
        setStatusText("2/2: 顔認識モデルをダウンロード中...");

        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        if (!active) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
        setIsAiReady(true);
        setStatusText("準備完了 — すきなアバターを選んでスタート！");
      } catch (err: unknown) {
        console.error(err);
        const msg = err instanceof Error ? err.message : String(err);
        if (active) setStatusText(`読み込みエラー: ${msg}`);
      }
    }
    initMediaPipe();

    return () => {
      active = false;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [profile?.id]);

  // 画面内のあらゆるボタン操作に心地よいポップ音を自動付与
  const handleGlobalButtonSound = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest("button");
    if (btn && !btn.disabled) {
      const randomPitch = Math.floor(Math.random() * 60) - 20;
      uiSounds.playPop(randomPitch);
    }
  };

  const openProModal = (reason?: string) => {
    setProModalReason(reason || null);
    setProModalOpen(true);
  };

  const handleCreatePrivateSpace = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setPrivateSpaceCode(code);
    window.history.replaceState({}, "", `/?space=${code}`);
    uiSounds.playChime();
  };

  const handleExitPrivateSpace = () => {
    setPrivateSpaceCode(null);
    window.history.replaceState({}, "", "/");
  };

  const handleSelectVoice = (preset: VoicePreset) => {
    setVoicePreset(preset);
    voiceChangerRef.current?.setPreset(preset);
  };

  const handleDrawTopic = (deckTitle: string, emoji: string, question: string) => {
    setActiveTopic({ deckTitle, emoji, question, sender: "you" });
    uiSounds.playChime();
    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(
        JSON.stringify({
          sysType: "topic-card",
          deckTitle,
          emoji,
          question,
        })
      );
    }
  };

  const startSearch = async (overrideReunionToken?: string | null) => {
    if (!landmarkerRef.current || !profile) return;

    if (profile.is_banned) {
      setStatusText("規約違反によりアカウントが制限されています。");
      return;
    }

    if (remainingCalls !== null && remainingCalls <= 0) {
      openProModal(
        profile.is_pro
          ? "本日のPRO通話上限（120回）に達しました！"
          : "本日の無料通話上限（25回）に達しました！PROなら1日120回まで話せます"
      );
      return;
    }

    const targetReunionToken =
      overrideReunionToken !== undefined ? overrideReunionToken : activeReunionToken;
    const searchRun = ++searchRunRef.current;
    matchRequestInFlightRef.current = false;

    try {
      if (!localStreamRef.current) {
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
          setStatusText(
            "カメラ・マイクの利用には安全な接続（HTTPS）が必要です。Macでは http://localhost:3000、別端末からはHTTPSでアクセスしてください。"
          );
          return;
        }

        setStatusText("カメラとマイクを準備中...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
          audio: true,
        });
        if (searchRunRef.current !== searchRun) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        localStreamRef.current = stream;

        const vc = new RealtimeVoiceChanger();
        const processedTrack = vc.init(stream);
        vc.setPreset(profile.is_pro ? voicePreset : "normal");
        voiceChangerRef.current = vc;
        processedAudioTrackRef.current = processedTrack;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play();
        }
        startRenderLoop();
      }

      if (searchRunRef.current !== searchRun) return;
      hasCountedCurrentCallRef.current = false;
      isSkippingRef.current = false;
      callSecondsRef.current = 0;
      setCallSeconds(0);
      setCallState("searching");
      setStatusText(
        privateSpaceCode
          ? `プライベートスペース（${privateSpaceCode}）で友達の入室を待っています...`
          : targetReunionToken
          ? "再会ルームで相手の入室を待っています..."
          : profile.is_pro
          ? "PRO優先キューでお話し相手を探しています..."
          : "新しいお話し相手を探しています..."
      );

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        if (searchRunRef.current !== searchRun || matchRequestInFlightRef.current) return;
        matchRequestInFlightRef.current = true;
        try {
          const res = await fetch("/api/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "match",
              userId: profile.id,
              isPro: profile.is_pro,
              moodTag: profile.is_pro ? moodTag : "any",
              privateCode: privateSpaceCode || undefined,
              reunionToken: targetReunionToken || undefined,
            }),
          });
          const data = await res.json();

          if (searchRunRef.current !== searchRun) {
            if (data.status === "matched" && data.roomId) {
              await fetch("/api/signal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "send",
                  userId: profile.id,
                  roomId: data.roomId,
                  type: "leave",
                }),
              });
            } else {
              await fetch("/api/signal", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel", userId: profile.id }),
              });
            }
            return;
          }

          if (data.status === "matched" && data.roomId) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
            if (roomIdRef.current) return;
            roomIdRef.current = data.roomId;
            isInitiatorRef.current = data.isInitiator;
            setStatusText("マッチング成功！安全ルートで接続中...");
            await setupWebRTC(data.roomId, data.isInitiator);
          }
        } catch (e) {
          console.error("Match poll error:", e);
        } finally {
          if (searchRunRef.current === searchRun) {
            matchRequestInFlightRef.current = false;
          }
        }
      }, 1500);
    } catch (err) {
      console.error(err);
      cleanupCall(true);
      setCallState("idle");
      setStatusText("カメラとマイクを準備できませんでした。許可設定を確認してください。");
    }
  };

  const skipToNext = async (notifyServer = true) => {
    if (isSkippingRef.current || !profile) return;
    isSkippingRef.current = true;
    searchRunRef.current += 1;
    if (restartSearchTimerRef.current) clearTimeout(restartSearchTimerRef.current);

    const currentRoom = roomIdRef.current;
    roomIdRef.current = null;

    if (notifyServer && currentRoom) {
      await fetch("/api/signal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", userId: profile.id, roomId: currentRoom, type: "leave" }),
      }).catch(() => {});
    }

    cleanupCall(false);
    callSecondsRef.current = 0;
    setCallSeconds(0);
    setCallState("searching");

    if (activeReunionToken) {
      setActiveReunionToken(null);
      window.history.replaceState({}, "", "/");
    }

    restartSearchTimerRef.current = setTimeout(() => {
      restartSearchTimerRef.current = null;
      if (isSkippingRef.current) void startSearch(null);
    }, 400);
  };

  const checkAndIssueReunionPass = async () => {
    if (
      myReunionAgreeRef.current &&
      partnerReunionAgreeRef.current &&
      isInitiatorRef.current &&
      !hasIssuedPassRef.current
    ) {
      hasIssuedPassRef.current = true;
      try {
        const res = await fetch("/api/reunion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create" }),
        });
        const data = await res.json();
        if (data.token) {
          const url = `${window.location.origin}/?reunion=${data.token}`;
          setIssuedReunionUrl(url);
          uiSounds.playChime();
          if (dataChannelRef.current?.readyState === "open") {
            dataChannelRef.current.send(
              JSON.stringify({ sysType: "reunion-token", token: data.token })
            );
          }
        }
      } catch (e) {
        console.error("Failed to create reunion pass:", e);
      }
    }
  };

  const handleToggleReunionAgree = () => {
    if (!profile?.is_pro) {
      openProModal("「また話したい♡」＆再会パス発行はPRO限定機能です！");
      return;
    }

    const nextState = !myReunionAgree;
    setMyReunionAgree(nextState);
    myReunionAgreeRef.current = nextState;

    if (dataChannelRef.current?.readyState === "open") {
      dataChannelRef.current.send(
        JSON.stringify({ sysType: "reunion-agree", agree: nextState })
      );
    }
    checkAndIssueReunionPass();
  };

  const copyReunionUrl = () => {
    if (!issuedReunionUrl) return;
    navigator.clipboard.writeText(issuedReunionUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const setupWebRTC = async (roomId: string, isInitiator: boolean) => {
    if (!profile) return;
    try {
      const pendingIceCandidates: RTCIceCandidateInit[] = [];
      const turnRes = await fetch("/api/turn", { method: "POST" });
      if (!turnRes.ok) {
        setStatusText("TURNサーバーの取得に失敗しました");
        endCall();
        return;
      }
      const { iceServers } = await turnRes.json();

      const pc = new RTCPeerConnection({
        iceServers,
        iceTransportPolicy: "relay",
      });
      pcRef.current = pc;
      if (roomIdRef.current !== roomId) {
        pc.close();
        pcRef.current = null;
        return;
      }
      const addIceCandidate = async (candidate: RTCIceCandidateInit) => {
        if (!pc.remoteDescription) {
          pendingIceCandidates.push(candidate);
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      };
      const flushPendingIceCandidates = async () => {
        while (pendingIceCandidates.length > 0) {
          const candidate = pendingIceCandidates.shift();
          if (!candidate) continue;
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("Failed to add queued ICE candidate:", error);
          }
        }
      };

      if (processedAudioTrackRef.current && localStreamRef.current) {
        pc.addTrack(processedAudioTrackRef.current, localStreamRef.current);
      } else {
        localStreamRef.current?.getAudioTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current!);
        });
      }

      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      pc.onicecandidate = async (event) => {
        if (event.candidate && roomIdRef.current === roomId) {
          await fetch("/api/signal", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "send",
              userId: profile.id,
              roomId,
              type: "candidate",
              data: event.candidate,
            }),
          }).catch(() => {});
        }
      };

      pc.onconnectionstatechange = async () => {
        if (roomIdRef.current !== roomId) return;

        if (pc.connectionState === "connected") {
          setCallState("connected");
          uiSounds.playChime();
          setStatusText(
            privateSpaceCode
              ? `プライベートスペース（${privateSpaceCode}）で通話中`
              : "通話中 — プライバシー完全保護モード"
          );

          if (!hasCountedCurrentCallRef.current) {
            hasCountedCurrentCallRef.current = true;
            const today = getTodayJST();
            const nextCount =
              profile.last_call_date === today ? profile.daily_calls_count + 1 : 1;

            const { data: updatedProf } = await supabase
              .from("profiles")
              .update({ daily_calls_count: nextCount, last_call_date: today })
              .eq("id", profile.id)
              .select()
              .single();

            if (updatedProf) {
              setProfile(updatedProf as UserProfile);
            }
          }

          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
              const localCand = stats.get(report.localCandidateId);
              if (localCand?.candidateType === "relay") {
                setRelayVerified(true);
              }
            }
          });
        } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
          if (roomIdRef.current === roomId && !isSkippingRef.current) {
            if (privateSpaceCode) {
              setStatusText("友達がルームから退出しました");
              endCall();
            } else {
              setStatusText("相手が退出しました。次の相手を探しています...");
              skipToNext(false);
            }
          }
        }
      };

      const setupDataChannel = (channel: RTCDataChannel) => {
        dataChannelRef.current = channel;
        channel.onmessage = (e) => {
          try {
            const parsed = JSON.parse(e.data);
            if (parsed.sysType === "reunion-agree") {
              partnerReunionAgreeRef.current = Boolean(parsed.agree);
              setPartnerReunionAgree(Boolean(parsed.agree));
              if (parsed.agree) uiSounds.playChime();
              checkAndIssueReunionPass();
              return;
            }
            if (parsed.sysType === "reunion-token" && parsed.token) {
              setIssuedReunionUrl(`${window.location.origin}/?reunion=${parsed.token}`);
              uiSounds.playChime();
              return;
            }
            if (parsed.sysType === "topic-card" && parsed.question) {
              setActiveTopic({
                deckTitle: parsed.deckTitle || "お題",
                emoji: parsed.emoji || "✨",
                question: parsed.question,
                sender: "partner",
              });
              uiSounds.playChime();
              return;
            }
            remoteDataRef.current = parsed;
          } catch {}
        };
      };

      if (isInitiator) {
        const dc = pc.createDataChannel("avatar-landmarks", { ordered: false, maxRetransmits: 0 });
        setupDataChannel(dc);

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", userId: profile.id, roomId, type: "offer", data: offer }),
        });
      } else {
        pc.ondatachannel = (event) => setupDataChannel(event.channel);
      }

      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        if (roomIdRef.current !== roomId) return;

        const res = await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "poll", userId: profile.id, roomId }),
        });
        const data = await res.json();

        if (data.status === "closed") {
          if (roomIdRef.current === roomId && !isSkippingRef.current) {
            if (privateSpaceCode) {
              setStatusText("友達がルームから退出しました");
              endCall();
            } else {
              setStatusText("相手が退出しました。次の相手を探しています...");
              skipToNext(false);
            }
          }
          return;
        }

        for (const msg of data.messages || []) {
          if (msg.type === "leave") {
            if (roomIdRef.current === roomId && !isSkippingRef.current) {
              if (privateSpaceCode) {
                setStatusText("友達がルームから退出しました");
                endCall();
              } else {
                setStatusText("相手が退出しました。次の相手を探しています...");
                skipToNext(false);
              }
            }
            return;
          }
          if (msg.type === "offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            await flushPendingIceCandidates();
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await fetch("/api/signal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "send", userId: profile.id, roomId, type: "answer", data: answer }),
            });
          } else if (msg.type === "answer") {
            await pc.setRemoteDescription(new RTCSessionDescription(msg.data));
            await flushPendingIceCandidates();
          } else if (msg.type === "candidate" && msg.data) {
            try {
              await addIceCandidate(msg.data as RTCIceCandidateInit);
            } catch (error) {
              console.error("Failed to add ICE candidate:", error);
            }
          }
        }
      }, 1000);
    } catch (err) {
      console.error("WebRTC Setup Error:", err);
      setStatusText("接続エラーが発生しました");
      endCall();
    }
  };

  const startRenderLoop = () => {
    let lastSendTime = 0;

    const loop = () => {
      const nowPerf = performance.now();
      const video = localVideoRef.current;
      const landmarker = landmarkerRef.current;
      const evoLevel = getEvolutionLevel(callSecondsRef.current).level;

      if (video && landmarker && video.readyState >= 2) {
        const results = landmarker.detectForVideo(video, nowPerf);
        const lCanvas = localCanvasRef.current;
        const lCtx = lCanvas?.getContext("2d");

        if (lCanvas && lCtx) {
          lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
          drawPastelDotGrid(lCtx, lCanvas.width, lCanvas.height);

          if (results.faceLandmarks && results.faceLandmarks[0]) {
            const raw = results.faceLandmarks[0];
            drawAnimojiAvatar(
              lCtx,
              raw,
              lCanvas.width,
              lCanvas.height,
              themeRef.current,
              avatarStyleRef.current,
              speciesRef.current,
              evoLevel,
              nowPerf
            );

            if (dataChannelRef.current?.readyState === "open" && nowPerf - lastSendTime > 33) {
              const compact: LandmarkMap = {};
              for (const idx of ALL_USED_INDICES) {
                compact[idx] = {
                  x: Math.round(raw[idx].x * 1000) / 1000,
                  y: Math.round(raw[idx].y * 1000) / 1000,
                };
              }
              dataChannelRef.current.send(
                JSON.stringify({
                  landmarks: compact,
                  theme: themeRef.current,
                  style: avatarStyleRef.current,
                  species: speciesRef.current,
                })
              );
              lastSendTime = nowPerf;
            }
          }
        }
      }

      const rCanvas = remoteCanvasRef.current;
      const rCtx = rCanvas?.getContext("2d");
      if (rCanvas && rCtx) {
        rCtx.clearRect(0, 0, rCanvas.width, rCanvas.height);
        drawPastelDotGrid(rCtx, rCanvas.width, rCanvas.height);

        if (remoteDataRef.current?.landmarks) {
          const partnerTheme = remoteDataRef.current.theme || THEMES[1];
          const partnerStyle = remoteDataRef.current.style || "line";
          const partnerSpecies = remoteDataRef.current.species || "fox";
          drawAnimojiAvatar(
            rCtx,
            remoteDataRef.current.landmarks,
            rCanvas.width,
            rCanvas.height,
            partnerTheme,
            partnerStyle,
            partnerSpecies,
            evoLevel,
            nowPerf
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);
  };

  const cleanupCall = (stopMedia = true) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (restartSearchTimerRef.current) {
      clearTimeout(restartSearchTimerRef.current);
      restartSearchTimerRef.current = null;
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.onmessage = null;
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.ondatachannel = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    remoteDataRef.current = null;
    setRelayVerified(false);
    setActiveTopic(null);

    setMyReunionAgree(false);
    setPartnerReunionAgree(false);
    myReunionAgreeRef.current = false;
    partnerReunionAgreeRef.current = false;
    hasIssuedPassRef.current = false;

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    remoteCanvasRef.current?.getContext("2d")?.clearRect(0, 0, 480, 360);

    if (stopMedia) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      voiceChangerRef.current?.dispose();
      voiceChangerRef.current = null;
      processedAudioTrackRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setIsMuted(false);
      localCanvasRef.current?.getContext("2d")?.clearRect(0, 0, 480, 360);
    }
  };

  const endCall = async () => {
    uiSounds.playSoftClose();
    isSkippingRef.current = false;
    searchRunRef.current += 1;
    matchRequestInFlightRef.current = false;
    callSecondsRef.current = 0;
    setCallSeconds(0);
    const currentRoom = roomIdRef.current;
    roomIdRef.current = null;

    if (profile) {
      if (currentRoom) {
        await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", userId: profile.id, roomId: currentRoom, type: "leave" }),
        }).catch(() => {});
      } else {
        await fetch("/api/signal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "cancel",
            userId: profile.id,
            reunionToken: activeReunionToken || undefined,
          }),
        }).catch(() => {});
      }
    }

    cleanupCall(true);
    setCallState("idle");
  };

  const endCallRef = useRef(endCall);
  useEffect(() => {
    endCallRef.current = endCall;
  });

  useEffect(() => {
    if (callState !== "connected") return;

    const maxSec = profile?.is_pro ? PLAN_LIMITS.pro.maxSeconds : PLAN_LIMITS.free.maxSeconds;
    const timer = setInterval(() => {
      const next = callSecondsRef.current + 1;
      callSecondsRef.current = next;
      setCallSeconds(next);

      if (next >= maxSec) {
        clearInterval(timer);
        setStatusText(
          profile?.is_pro
            ? "最大通話時間（10分）に達したため通話を終了しました"
            : "無料プランの最大通話時間（2分30秒）に達しました！PROなら10分まで話せます"
        );
        void endCallRef.current();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [callState, profile?.is_pro]);

  useEffect(() => {
    return () => {
      searchRunRef.current += 1;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (restartSearchTimerRef.current) clearTimeout(restartSearchTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      dataChannelRef.current?.close();
      pcRef.current?.close();
      voiceChangerRef.current?.dispose();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleLogout = async () => {
    await endCall();
    await supabase.auth.signOut();
    setProfile(null);
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !t.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-violet-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return <AuthGate onSuccess={loadUserProfile} />;
  }

  const evolutionInfo = getEvolutionLevel(callSeconds);
  const currentSpeciesMeta = AVATAR_SPECIES.find((s) => s.id === species);

  return (
    <main
      onClickCapture={handleGlobalButtonSound}
      className="min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-violet-100 text-slate-700 flex flex-col items-center justify-center p-4 relative overflow-hidden"
    >
      <div className="absolute top-[-12%] left-[-8%] w-[28rem] h-[28rem] bg-pink-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[25%] right-[-10%] w-[26rem] h-[26rem] bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-12%] left-[25%] w-[28rem] h-[28rem] bg-violet-200/50 rounded-full blur-3xl pointer-events-none" />

      <ProUpgradeModal
        isOpen={proModalOpen}
        onClose={() => setProModalOpen(false)}
        profile={profile}
        onProfileUpdated={(updated) => {
          setProfile(updated);
          if (!updated.is_pro) {
            handleSelectVoice("normal");
            setMoodTag("any");
            if (species === "furry" || species === "dragon" || species === "unicorn") {
              setSpecies("fox");
            }
            if (theme.isPro) {
              setTheme(THEMES[0]);
            }
          }
        }}
        highlightReason={proModalReason}
      />

      {/* 通報・ブロックモーダル */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        reporterId={profile.id}
        onReported={() => {
          setStatusText("通報を受け付け、相手をブロックしました");
          endCall();
        }}
      />

      {/* Stripe決済完了・キャンセルバナー */}
      {checkoutBanner && (
        <div className="mb-3 px-5 py-2.5 rounded-full bg-amber-100/90 border border-amber-300 backdrop-blur-xl shadow-sm text-xs font-extrabold text-amber-900 flex items-center gap-3 z-10">
          <span>{checkoutBanner}</span>
          <button
            onClick={() => setCheckoutBanner(null)}
            className="text-amber-700 hover:text-amber-950 underline cursor-pointer"
          >
            閉じる
          </button>
        </div>
      )}

      {activeReunionToken && (
        <div className="mb-3 px-5 py-2.5 rounded-full bg-pink-100/80 border border-pink-200/90 ring-1 ring-inset ring-white/80 backdrop-blur-xl shadow-sm text-xs font-bold text-pink-700 flex items-center gap-2 z-10">
          <Sparkles className="w-4 h-4 text-pink-500 animate-spin" />
          {reunionValid === false ? (
            <span>この再会パスは期限切れ（7日経過）または無効です</span>
          ) : (
            <span>一期一会・再会パスでアクセス中（専用の2人ルームに入室できます）</span>
          )}
        </div>
      )}

      {/* ブランドロゴヘッダー */}
      <div className="mb-3 flex items-center justify-center gap-3 z-10 select-none">
        <img
          src="/logo.png"
          alt="WEET ロゴ"
          className="w-11 h-11 rounded-2xl object-cover shadow-[0_6px_20px_rgba(139,92,246,0.18)] ring-2 ring-white/90"
        />
        <span className="text-3xl font-black tracking-wider bg-gradient-to-r from-pink-400 via-violet-400 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.9)]">
          WEET
        </span>
      </div>

      {/* 上部ステータスバー（高精細フロストガラス） */}
      <div className="mb-3.5 flex flex-wrap items-center justify-center gap-2 px-3 py-2 rounded-[2rem] bg-white/45 border border-white/80 ring-1 ring-inset ring-white/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(148,163,184,0.12)] z-10">
        <button
          onClick={() => openProModal()}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border ring-1 ring-inset ring-white/70 shadow-xs text-xs font-extrabold transition-all duration-200 cursor-pointer hover:scale-105 active:scale-95 ${
            profile.is_pro
              ? "bg-gradient-to-r from-amber-200 via-pink-200 to-violet-200 border-amber-300/80 text-amber-950"
              : "bg-white/85 border-slate-200/60 text-slate-600 hover:bg-white"
          }`}
        >
          <Crown className={`w-3.5 h-3.5 ${profile.is_pro ? "text-amber-600" : "text-slate-400"}`} />
          <span>{profile.is_pro ? "PRO会員" : "Freeプラン"}</span>
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/75 border border-white/90 text-xs font-semibold text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>生映像送信なし</span>
        </div>

        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors ${
            relayVerified
              ? "bg-emerald-50/90 border-emerald-200 text-emerald-700"
              : "bg-white/75 border-white/90 text-slate-500"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-500" />
          <span>{relayVerified ? "IP完全隠蔽OK" : "TURN保護"}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50/90 border border-sky-200/80 text-xs font-bold text-sky-700">
          <Flame className="w-3.5 h-3.5 text-sky-500" />
          <span>
            残り {remainingCalls}/{currentPlan.dailyCalls}回
          </span>
        </div>

        {callState === "connected" && (
          <>
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold font-mono ${
                remainingSeconds <= 20
                  ? "bg-rose-100 border-rose-300 text-rose-700 animate-pulse"
                  : "bg-violet-50/90 border-violet-200 text-violet-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(remainingSeconds)}</span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50/90 border border-amber-200 text-xs font-bold text-amber-700">
              <Wand2 className="w-3.5 h-3.5 text-amber-500" />
              <span>{evolutionInfo.title}</span>
            </div>
          </>
        )}

        {/* UIサウンドON/OFFボタン */}
        <button
          onClick={() => setSoundFxEnabled(!soundFxEnabled)}
          className={`p-1.5 rounded-full border transition-all duration-200 cursor-pointer active:scale-90 ${
            soundFxEnabled
              ? "bg-sky-100/80 border-sky-200 text-sky-600 hover:bg-sky-200/70"
              : "bg-white/70 border-slate-200/70 text-slate-400 hover:text-slate-600"
          }`}
          title={soundFxEnabled ? "UIサウンドON" : "UIサウンドOFF"}
        >
          {soundFxEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-full bg-white/75 hover:bg-rose-50 border border-white/90 hover:border-rose-200 text-slate-400 hover:text-rose-500 transition-all duration-200 cursor-pointer active:scale-90"
          title="ログアウト"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 気分タグ＆プライベートスペース作成バー */}
      {!activeReunionToken && (
        <MatchingModeBar
          isPro={profile.is_pro}
          isIdle={callState === "idle"}
          moodTag={moodTag}
          onSelectMoodTag={setMoodTag}
          privateSpaceCode={privateSpaceCode}
          onCreatePrivateSpace={handleCreatePrivateSpace}
          onExitPrivateSpace={handleExitPrivateSpace}
          onOpenProModal={openProModal}
        />
      )}

      {/* 再会パス発行カード */}
      {issuedReunionUrl && (
        <div className="mb-4 w-full max-w-xl p-4 rounded-[1.8rem] bg-white/80 border border-pink-200 ring-1 ring-inset ring-white backdrop-blur-2xl shadow-lg shadow-pink-200/30 z-10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-extrabold text-pink-600 flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-pink-400 text-pink-400" />
              一期一会・再会パスが発行されました！（7日間有効）
            </span>
            <button
              onClick={() => setIssuedReunionUrl(null)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              閉じる
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2.5">
            お互いが「また話したい」を押したため専用リンクが生成されました。保存しておくと2人だけで再会できます。
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={issuedReunionUrl}
              className="w-full px-3.5 py-2 rounded-xl bg-white/95 border border-pink-100 text-xs text-slate-700 font-mono"
            />
            <button
              onClick={copyReunionUrl}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-pink-400 hover:bg-pink-300 text-white font-bold text-xs whitespace-nowrap transition shadow-sm cursor-pointer active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? "コピー完了" : "コピー"}
            </button>
          </div>
        </div>
      )}

      {/* メイン通話エリア（デュアル・グラスビューポート） */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full max-w-4xl z-10">
        {/* 相手側カード */}
        <div
          className={`relative aspect-[4/3] rounded-[2.2rem] bg-white/60 border backdrop-blur-2xl overflow-hidden flex items-center justify-center transition-all duration-300 ring-1 ring-inset ring-white/90 ${
            callState === "connected"
              ? "border-violet-200/90 shadow-[0_16px_48px_rgba(139,92,246,0.16)]"
              : "border-white/90 shadow-[0_12px_40px_rgba(148,163,184,0.16)]"
          }`}
        >
          <div className="absolute top-3.5 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-white text-[11px] font-extrabold text-violet-600 shadow-xs z-10">
            <span
              className={`w-2 h-2 rounded-full ${
                callState === "connected" ? "bg-emerald-400 animate-pulse" : "bg-slate-300"
              }`}
            />
            <span>PARTNER</span>
          </div>

          {partnerReunionAgree && callState === "connected" && !privateSpaceCode && (
            profile.is_pro ? (
              <span className="absolute top-3.5 right-4 px-3 py-1 rounded-full bg-pink-100/95 border border-pink-200 text-[11px] font-extrabold text-pink-600 z-10 animate-bounce shadow-xs">
                相手も「また話したい」♡
              </span>
            ) : (
              <button
                onClick={() => openProModal("相手が「また話したい♡」を送っています！PROでロック解除して再会しよう")}
                className="absolute top-3.5 right-4 px-3 py-1 rounded-full bg-gradient-to-r from-pink-400 to-amber-400 text-white text-[11px] font-extrabold z-10 shadow-md animate-bounce cursor-pointer active:scale-95"
              >
                🔒 相手が「また話したい♡」送信！（PROで解除）
              </button>
            )
          )}

          {/* 通話中の通報・ブロックボタン */}
          {callState === "connected" && (
            <button
              onClick={() => setReportModalOpen(true)}
              className="absolute bottom-3.5 right-4 px-3 py-1.5 rounded-full bg-white/85 hover:bg-rose-50 border border-slate-200/80 hover:border-rose-200 text-[11px] font-bold text-slate-500 hover:text-rose-600 flex items-center gap-1 shadow-xs transition-all duration-200 z-10 cursor-pointer active:scale-95"
              title="不快な相手を通報・ブロック"
            >
              <Flag className="w-3 h-3" />
              <span>通報</span>
            </button>
          )}

          <canvas ref={remoteCanvasRef} width={480} height={360} className="w-full h-full object-cover" />
          <audio ref={remoteAudioRef} autoPlay playsInline suppressHydrationWarning />

          {callState !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/45 backdrop-blur-md">
              {callState === "searching" ? (
                <div className="relative flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-violet-100/80 flex items-center justify-center relative mb-3">
                    <span className="absolute inset-0 rounded-full bg-violet-300/40 animate-ping" />
                    <Radio className="w-7 h-7 text-violet-500 animate-pulse" />
                  </div>
                  <p className="text-sm font-extrabold text-slate-700">
                    {privateSpaceCode
                      ? "友達の入室を待機中..."
                      : activeReunionToken
                      ? "相手の入室を待機中..."
                      : "お話し相手を探しています..."}
                  </p>
                  <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                    完全匿名・暗号化リレー準備完了
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-white/80 border border-white flex items-center justify-center shadow-xs mb-2">
                    <Sparkles className="w-5 h-5 text-violet-300" />
                  </div>
                  <p className="text-xs font-bold">まだつながっていません</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 自分側カード */}
        <div
          className="relative aspect-[4/3] rounded-[2.2rem] bg-white/60 border border-white/90 ring-1 ring-inset ring-white/90 backdrop-blur-2xl shadow-[0_12px_40px_rgba(148,163,184,0.16)] overflow-hidden flex items-center justify-center transition-all duration-300"
          style={{
            boxShadow: `0 14px 42px ${theme.glow}`,
          }}
        >
          <div className="absolute top-3.5 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/85 border border-white text-[11px] font-extrabold text-sky-600 shadow-xs z-10">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>YOU（カメラ非公開）</span>
          </div>

          {currentSpeciesMeta && (
            <div className="absolute top-3.5 right-4 px-2.5 py-1 rounded-full bg-white/80 border border-white text-[11px] font-bold text-slate-600 shadow-xs z-10">
              {currentSpeciesMeta.emoji} {currentSpeciesMeta.label}
            </div>
          )}

          <video ref={localVideoRef} className="hidden" playsInline muted />
          <canvas ref={localCanvasRef} width={480} height={360} className="w-full h-full object-cover" />
        </div>
      </div>

      {/* ステータスインジケーターピル */}
      <div className="mt-3.5 px-4 py-1.5 rounded-full bg-white/60 border border-white/85 backdrop-blur-md shadow-2xs flex items-center gap-2 z-10">
        <span
          className={`w-2 h-2 rounded-full ${
            callState === "connected"
              ? "bg-emerald-400 animate-pulse"
              : callState === "searching"
              ? "bg-amber-400 animate-ping"
              : isAiReady
              ? "bg-sky-400"
              : "bg-slate-300"
          }`}
        />
        <p className="text-xs font-bold text-slate-600">{statusText}</p>
      </div>

      <ProFeaturesBar
        isPro={profile.is_pro}
        voicePreset={voicePreset}
        onSelectVoice={handleSelectVoice}
        isConnected={callState === "connected"}
        activeTopic={activeTopic}
        onDrawTopic={handleDrawTopic}
        onOpenProModal={openProModal}
      />

      <AvatarControls
        isPro={profile.is_pro}
        onOpenProModal={openProModal}
        species={species}
        setSpecies={setSpecies}
        theme={theme}
        setTheme={setTheme}
        avatarStyle={avatarStyle}
        setAvatarStyle={setAvatarStyle}
        callState={callState}
        isAiReady={isAiReady}
        remainingCalls={remainingCalls}
        reunionValid={reunionValid}
        activeReunionToken={activeReunionToken}
        myReunionAgree={myReunionAgree}
        isMuted={isMuted}
        onStartSearch={() => startSearch()}
        onToggleReunionAgree={handleToggleReunionAgree}
        onSkipToNext={() => skipToNext(true)}
        onToggleMute={toggleMute}
        onEndCall={endCall}
      />
    </main>
  );
}