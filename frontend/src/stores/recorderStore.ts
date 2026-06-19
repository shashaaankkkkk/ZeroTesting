import { create } from 'zustand';

interface RecordedStep {
  action: string;
  target: string;
  value: string;
  description: string;
}

interface RecorderState {
  sessionId: string | null;
  status: string;
  steps: RecordedStep[];
  setSession: (id: string | null) => void;
  setStatus: (status: string) => void;
  setSteps: (steps: RecordedStep[]) => void;
  reset: () => void;
}

export const useRecorderStore = create<RecorderState>((set) => ({
  sessionId: null,
  status: 'idle',
  steps: [],
  setSession: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setSteps: (steps) => set({ steps }),
  reset: () => set({ sessionId: null, status: 'idle', steps: [] }),
}));
