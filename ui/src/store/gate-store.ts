import { create } from "zustand";
import type { GateRefusalData } from "@/lib/gate";

export interface GateRefusal extends GateRefusalData {
  anchorId: string;
}

interface GateState {
  refusal: GateRefusal | null;
  highlightedAt: number;
  setRefusal: (anchorId: string, refusal: GateRefusalData) => void;
  clearRefusal: () => void;
}

export const useGateStore = create<GateState>((set) => ({
  refusal: null,
  highlightedAt: 0,
  setRefusal: (anchorId, refusal) =>
    set({ refusal: { ...refusal, anchorId }, highlightedAt: Date.now() }),
  clearRefusal: () => set({ refusal: null }),
}));
