"use client";

// 禅音：极稀疏的五声音阶风铃（WebAudio 合成，无音频资源）。默认关；设置里打开。
// 浏览器要求用户手势后才能出声——首次交互时惰性启动。
import { useEffect, useRef } from "react";
import { getPrefs } from "@/lib/prefs";

export function ZenChime() {
  const ctxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onRef = useRef(false);

  useEffect(() => {
    onRef.current = getPrefs().sound;

    const NOTES = [659.3, 784, 880, 1046.5, 1174.7]; // E5 G5 A5 C6 D6

    const strike = () => {
      const ctx = ctxRef.current;
      if (!ctx || !onRef.current) return;
      const f = NOTES[(Math.random() * NOTES.length) | 0];
      const t0 = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.05, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 4200;
      [0, 1.003].forEach((detune) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f * detune;
        osc.connect(lp);
        osc.start(t0);
        osc.stop(t0 + 3.4);
      });
      lp.connect(gain).connect(ctx.destination);
    };

    const loop = () => {
      timerRef.current = setTimeout(() => {
        strike();
        loop();
      }, 9000 + Math.random() * 14000);
    };

    const arm = () => {
      if (!onRef.current || ctxRef.current) return;
      try {
        ctxRef.current = new AudioContext();
        strike();
        loop();
      } catch {}
    };
    const onPrefs = (e: Event) => {
      onRef.current = (e as CustomEvent).detail?.sound === true;
      if (onRef.current) arm();
    };

    window.addEventListener("pointerdown", arm, { passive: true });
    window.addEventListener("rr-prefs", onPrefs);
    return () => {
      window.removeEventListener("pointerdown", arm);
      window.removeEventListener("rr-prefs", onPrefs);
      if (timerRef.current) clearTimeout(timerRef.current);
      ctxRef.current?.close().catch(() => {});
    };
  }, []);

  return null;
}
