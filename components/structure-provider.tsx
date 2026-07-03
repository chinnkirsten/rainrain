"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { DEFAULT_PHASES, mapOf, type Phase } from "@/lib/phases";

type Ctx = { phases: Phase[]; map: Record<string, Phase>; refresh: () => void };

const StructureCtx = createContext<Ctx>({
  phases: DEFAULT_PHASES,
  map: mapOf(DEFAULT_PHASES),
  refresh: () => {},
});

export function StructureProvider({ children }: { children: ReactNode }) {
  const [phases, setPhases] = useState<Phase[]>(DEFAULT_PHASES);
  const refresh = () => {
    fetch("/api/structure")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.phases) && d.phases.length) setPhases(d.phases);
      })
      .catch(() => {});
  };
  useEffect(() => {
    refresh();
  }, []);
  return (
    <StructureCtx.Provider value={{ phases, map: mapOf(phases), refresh }}>
      {children}
    </StructureCtx.Provider>
  );
}

export const useStructure = () => useContext(StructureCtx);
/** 查某个阶段；未知 id 回退到一个通用样式，绝不崩 */
export function usePhase(id: string): Phase {
  const { map } = useStructure();
  return (
    map[id] ?? {
      id,
      title: id,
      titleEn: "",
      period: "",
      tagline: "",
      intro: "",
      accent: "#7c7c7c",
    }
  );
}
