type ProgressState = {
  progress: number;
  status: string;
  currentChunk: number;
  totalChunks: number;
};

const states = new Map<string, ProgressState>();

const DEFAULT: ProgressState = {
  progress: 0,
  status: "idle",
  currentChunk: 0,
  totalChunks: 0,
};

export function getProgress(summaryId: string): ProgressState {
  return { ...(states.get(summaryId) ?? DEFAULT) };
}

export function setProgress(summaryId: string, update: Partial<ProgressState>) {
  const current = states.get(summaryId) ?? { ...DEFAULT };
  states.set(summaryId, { ...current, ...update });
}

export function resetProgress(summaryId: string) {
  states.set(summaryId, { ...DEFAULT });
}

export function clearProgress(summaryId: string) {
  states.delete(summaryId);
}
