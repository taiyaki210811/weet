export type VoicePreset = "normal" | "high" | "low" | "radio";

export const VOICE_PRESETS: {
  id: VoicePreset;
  label: string;
  emoji: string;
  isPro: boolean;
}[] = [
  { id: "normal", label: "ナチュラル（地声）", emoji: "🎙️", isPro: false },
  { id: "high", label: "ハイトーン（かわいい系）", emoji: "✨", isPro: true },
  { id: "low", label: "ローボイス（落ち着き系）", emoji: "🌙", isPro: true },
  { id: "radio", label: "レトロラジオ風", emoji: "📻", isPro: true },
];

export class RealtimeVoiceChanger {
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private shaperNode: WaveShaperNode | null = null;
  private gainNode: GainNode | null = null;
  private oscNode: OscillatorNode | null = null;
  private oscGainNode: GainNode | null = null;

  public init(rawStream: MediaStream): MediaStreamTrack {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtx();
    this.source = this.ctx.createMediaStreamSource(rawStream);
    this.destination = this.ctx.createMediaStreamDestination();

    this.filterNode = this.ctx.createBiquadFilter();
    this.shaperNode = this.ctx.createWaveShaper();
    this.gainNode = this.ctx.createGain();

    // ピッチニュアンス変調用の微弱オシレーター
    this.oscNode = this.ctx.createOscillator();
    this.oscGainNode = this.ctx.createGain();
    this.oscGainNode.gain.value = 0;
    this.oscNode.connect(this.oscGainNode);
    this.oscGainNode.connect(this.gainNode.gain);
    this.oscNode.start();

    this.source.connect(this.filterNode);
    this.filterNode.connect(this.shaperNode);
    this.shaperNode.connect(this.gainNode);
    this.gainNode.connect(this.destination);

    this.setPreset("normal");
    return this.destination.stream.getAudioTracks()[0];
  }

  public setPreset(preset: VoicePreset) {
    if (!this.ctx || !this.filterNode || !this.shaperNode || !this.gainNode || !this.oscNode || !this.oscGainNode) {
      return;
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    this.shaperNode.curve = null;
    this.oscGainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.setValueAtTime(1.0, now);

    if (preset === "normal") {
      this.filterNode.type = "allpass";
    } else if (preset === "high") {
      // フォルマントを明るく持ち上げて軽やかな声質に
      this.filterNode.type = "highshelf";
      this.filterNode.frequency.setValueAtTime(950, now);
      this.filterNode.gain.setValueAtTime(14, now);
      this.oscNode.frequency.setValueAtTime(65, now);
      this.oscGainNode.gain.setValueAtTime(0.18, now);
      this.gainNode.gain.setValueAtTime(1.15, now);
    } else if (preset === "low") {
      // 低域を強調し高域を抑えて深いイケボ風に
      this.filterNode.type = "lowpass";
      this.filterNode.frequency.setValueAtTime(680, now);
      this.filterNode.Q.setValueAtTime(2.5, now);
      this.oscNode.frequency.setValueAtTime(38, now);
      this.oscGainNode.gain.setValueAtTime(0.22, now);
      this.gainNode.gain.setValueAtTime(1.4, now);
    } else if (preset === "radio") {
      // バンドパス＋軽い歪みでトランシーバー・ラジオ風に
      this.filterNode.type = "bandpass";
      this.filterNode.frequency.setValueAtTime(1400, now);
      this.filterNode.Q.setValueAtTime(3.2, now);
      this.shaperNode.curve = this.makeDistortionCurve(35) as Float32Array<ArrayBuffer>;
      this.gainNode.gain.setValueAtTime(1.5, now);
    }
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
  }

  public dispose() {
    try {
      this.oscNode?.stop();
      this.ctx?.close();
    } catch {}
    this.ctx = null;
  }
}