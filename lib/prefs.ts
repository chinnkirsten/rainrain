"use client";

// 本机偏好：界面字号 + 禅音。localStorage 持久化，改动即时生效。

export type Prefs = {
  sound: boolean;
  fontSize: 15 | 16 | 17;
};

export const DEFAULT_PREFS: Prefs = { sound: false, fontSize: 16 };

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
  document.documentElement.style.fontSize = next.fontSize === 16 ? "" : `${next.fontSize}px`;
  window.dispatchEvent(new CustomEvent("rr-prefs", { detail: next }));
  return next;
}
