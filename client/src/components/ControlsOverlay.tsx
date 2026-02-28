import { useState, useRef } from "react";
import { useDiagramState } from "../hooks/useDiagramState";
import { useSpeechToText } from "../hooks/useSpeechToText";

export default function ControlsOverlay() {
  const [textInput, setTextInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessing = useDiagramState((s) => s.isProcessing);
  const setIsProcessing = useDiagramState((s) => s.setIsProcessing);
  const setDiagram = useDiagramState((s) => s.setDiagram);
  const setTranscript = useDiagramState((s) => s.setTranscript);
  const diagram = useDiagramState((s) => s.diagram);
  const handDetected = useDiagramState((s) => s.handDetected);
  const isListening = useDiagramState((s) => s.isListening);
  const undo = useDiagramState((s) => s.undo);
  const redo = useDiagramState((s) => s.redo);
  const historyIndex = useDiagramState((s) => s.historyIndex);
  const historyLength = useDiagramState((s) => s.history.length);

  const { start: startSTT, stop: stopSTT, isConnected } = useSpeechToText();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || isProcessing) return;

    setIsProcessing(true);
    setTranscript(textInput);

    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textInput,
          currentDiagram: diagram,
        }),
      });
      const data = await res.json();
      if (data.diagram) {
        setDiagram(data.diagram);
      }
    } catch (err) {
      console.error("Parse error:", err);
    } finally {
      setIsProcessing(false);
      setTextInput("");
      inputRef.current?.focus();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopSTT();
    } else {
      startSTT();
    }
  };

  return (
    <>
      {/* Top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          background: "rgba(10, 10, 20, 0.7)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: "#e0e0e0" }}>
            Speech-to-Diagram
          </span>
          <span style={{ fontSize: 11, color: "#666", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 4 }}>
            Math & Physics
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Hand tracking indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: handDetected ? "#44ff88" : "#555" }}>
              {handDetected ? "Hand" : "No hand"}
            </span>
          </div>
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: historyIndex > 0 ? "#ccc" : "#444",
              padding: "4px 10px",
              cursor: historyIndex > 0 ? "pointer" : "default",
              fontSize: 13,
            }}
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= historyLength - 1}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6,
              color: historyIndex < historyLength - 1 ? "#ccc" : "#444",
              padding: "4px 10px",
              cursor: historyIndex < historyLength - 1 ? "pointer" : "default",
              fontSize: 13,
            }}
          >
            Redo
          </button>
        </div>
      </div>

      {/* Text input bar + mic button */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: 600,
          width: "90%",
          display: "flex",
          gap: 8,
          zIndex: 10,
        }}
      >
        {/* Mic toggle */}
        <button
          type="button"
          onClick={toggleMic}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: isListening ? "2px solid #ff4444" : "1px solid rgba(255,255,255,0.15)",
            background: isListening ? "rgba(255, 68, 68, 0.25)" : "rgba(15, 15, 25, 0.9)",
            color: isListening ? "#ff6666" : "#888",
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            animation: isListening ? "pulse 1.5s ease-in-out infinite" : "none",
          }}
          title={isListening ? "Stop listening" : "Start voice input"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>

        <input
          ref={inputRef}
          type="text"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder={isListening ? "Listening... speak now" : 'Describe a diagram... or click mic'}
          disabled={isProcessing}
          style={{
            flex: 1,
            background: "rgba(15, 15, 25, 0.9)",
            border: isListening ? "1px solid rgba(255, 68, 68, 0.3)" : "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "10px 14px",
            color: "#e0e0e0",
            fontSize: 14,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={isProcessing || !textInput.trim()}
          style={{
            background: isProcessing ? "rgba(100,100,100,0.4)" : "rgba(68, 136, 255, 0.8)",
            border: "none",
            borderRadius: 8,
            padding: "10px 20px",
            color: "#fff",
            fontSize: 14,
            cursor: isProcessing ? "default" : "pointer",
            fontWeight: 500,
          }}
        >
          {isProcessing ? "..." : "Generate"}
        </button>
      </form>

      {/* Pulse animation for mic */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255, 68, 68, 0); }
        }
      `}</style>
    </>
  );
}
