import { create } from "zustand";
import type { DiagramSpec } from "../lib/diagramSchema";

export type HandGesture = "none" | "fist" | "pinch" | "open";

interface HandCommand {
  gesture: HandGesture;
  dx: number;       // palm movement delta X (left/right)
  dy: number;       // palm movement delta Y (up/down)
  dAngle: number;   // hand rotation delta (wrist-to-fingers tilt change)
}

interface DiagramState {
  diagram: DiagramSpec | null;
  history: DiagramSpec[];
  historyIndex: number;
  transcript: string;
  partialTranscript: string;
  isListening: boolean;
  isProcessing: boolean;
  handDetected: boolean;
  handCommand: HandCommand;

  setDiagram: (spec: DiagramSpec) => void;
  setTranscript: (text: string) => void;
  setPartialTranscript: (text: string) => void;
  setIsListening: (v: boolean) => void;
  setIsProcessing: (v: boolean) => void;
  setHandDetected: (v: boolean) => void;
  setHandCommand: (cmd: HandCommand) => void;
  undo: () => void;
  redo: () => void;
}

export const useDiagramState = create<DiagramState>((set, get) => ({
  diagram: null,
  history: [],
  historyIndex: -1,
  transcript: "",
  partialTranscript: "",
  isListening: false,
  isProcessing: false,
  handDetected: false,
  handCommand: { gesture: "none", dx: 0, dy: 0, dAngle: 0 },

  setDiagram: (spec) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(spec);
    set({
      diagram: spec,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  setTranscript: (text) => set({ transcript: text }),
  setPartialTranscript: (text) => set({ partialTranscript: text }),
  setIsListening: (v) => set({ isListening: v }),
  setIsProcessing: (v) => set({ isProcessing: v }),
  setHandDetected: (v) => set({ handDetected: v }),
  setHandCommand: (cmd) => set({ handCommand: cmd }),

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      set({
        historyIndex: historyIndex - 1,
        diagram: history[historyIndex - 1],
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      set({
        historyIndex: historyIndex + 1,
        diagram: history[historyIndex + 1],
      });
    }
  },
}));
