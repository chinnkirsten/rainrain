"use client";

// 氛围偏好：localStorage 持久化；改动即时生效（documentElement 类/样式 + 自定义事件）。
// 花瓣密度与入场动画由 Sakura/CSS 消费；猫由 rr-no-cat 类隐藏；禅音由 ZenChime 消费。

export type Prefs = {
  petals: "off" | "low" | "std";
  cat: boolean;
  entrance: boolean;
  sound: boolean;
  fontSize: 15 | 16 | 17;
};

// 默认全静：画是静态的，动画/花瓣要在设置里主动打开
export const DEFAULT_PREFS: Prefs = { petals: "off", cat: true, entrance: false, sound: false, fontSize: 16 };

export function getPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...(JSON.parse(localStorage.getItem("rr-prefs") || "{}") as Partial<Prefs>) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...getPrefs(), ...patch };
  try {
    localStorage.setItem("rr-prefs", JSON.stringify(next));
  } catch {}
  const el = document.documentElement;
  el.style.fontSize = next.fontSize === 16 ? "" : `${next.fontSize}px`;
  el.classList.toggle("rr-no-anim", !next.entrance);
  el.classList.toggle("rr-no-cat", !next.cat);
  window.dispatchEvent(new CustomEvent("rr-prefs", { detail: next }));
  return next;
}
