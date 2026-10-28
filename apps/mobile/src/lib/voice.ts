// Voice check-ins: capture raw PCM from the mic (expo-audio's AudioStream), resample to 16 kHz mono 16-bit, wrap it in a
// WAV header and hand the file to the server, which sends it to Muse Voice Transcribe. Works in Expo Go.
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream, type AudioStreamBuffer } from "expo-audio";
import { File, Paths } from "expo-file-system";

const TARGET = 16000;

export function useVoiceRecorder() {
  const chunks = useRef<{ data: Int16Array; rate: number }[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const { stream } = useAudioStream({
    sampleRate: TARGET, channels: 1, encoding: "int16",
    onBuffer: (b: AudioStreamBuffer) => {
      const mono = toMono(new Int16Array(b.data.slice(0)), b.channels);
      chunks.current.push({ data: mono, rate: b.sampleRate });
      setSeconds(s => s + mono.length / b.sampleRate);
    },
  });
  const supported = Platform.OS !== "web" && !!stream;

  const start = useCallback(async () => {
    if (!stream) throw new Error("Voice needs the Bulbu app on a phone.");
    const p = await requestRecordingPermissionsAsync();
    if (!p.granted) throw new Error("Microphone permission was denied. Turn it on in Settings to talk to Bulbu.");
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    chunks.current = []; setSeconds(0);
    await stream.start();
    setRecording(true);
  }, [stream]);

  /** Stops and returns the recording as a WAV file the API client can upload. */
  const stop = useCallback(async (): Promise<{ uri: string; seconds: number } | null> => {
    if (!stream) return null;
    stream.stop();
    setRecording(false);
    await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    const pcm = concatResampled(chunks.current, TARGET);
    chunks.current = [];
    if (pcm.length < TARGET * 0.4) return null;                       // under 0.4 s: nothing said
    const file = new File(Paths.cache, `voice-${Date.now()}.wav`);
    await file.write(wav(pcm, TARGET));
    return { uri: file.uri, seconds: pcm.length / TARGET };
  }, [stream]);

  return { supported, recording, seconds, start, stop };
}

function toMono(d: Int16Array, ch: number): Int16Array {
  if (ch <= 1) return d;
  const out = new Int16Array(Math.floor(d.length / ch));
  for (let i = 0; i < out.length; i++) { let s = 0; for (let c = 0; c < ch; c++) s += d[i * ch + c]; out[i] = s / ch; }
  return out;
}

/** Joins the buffers, converting any that arrived at another rate (the hardware may not do 16 kHz) by linear interpolation. */
function concatResampled(parts: { data: Int16Array; rate: number }[], rate: number): Int16Array {
  const conv = parts.map(p => {
    if (p.rate === rate) return p.data;
    const n = Math.floor(p.data.length * rate / p.rate), out = new Int16Array(n), k = p.rate / rate;
    for (let i = 0; i < n; i++) { const x = i * k, i0 = Math.floor(x), f = x - i0; out[i] = (p.data[i0] ?? 0) * (1 - f) + (p.data[Math.min(i0 + 1, p.data.length - 1)] ?? 0) * f; }
    return out;
  });
  const out = new Int16Array(conv.reduce((s, c) => s + c.length, 0));
  let o = 0; for (const c of conv) { out.set(c, o); o += c.length; }
  return out;
}

function wav(pcm: Int16Array, rate: number): Uint8Array {
  const b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = (o: number, s: string) => { for (let i = 0; i < 4; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length * 2, true);
  new Int16Array(b, 44).set(pcm);
  return new Uint8Array(b);
}
