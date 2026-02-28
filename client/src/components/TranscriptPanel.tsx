import { useDiagramState } from "../hooks/useDiagramState";

export default function TranscriptPanel() {
  const transcript = useDiagramState((s) => s.transcript);
  const partial = useDiagramState((s) => s.partialTranscript);
  const isListening = useDiagramState((s) => s.isListening);
  const isProcessing = useDiagramState((s) => s.isProcessing);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 600,
        width: "90%",
        background: "rgba(10, 10, 20, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "12px 16px",
        zIndex: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: isListening ? "#44ff88" : isProcessing ? "#ffaa00" : "#555",
            boxShadow: isListening ? "0 0 8px #44ff88" : "none",
          }}
        />
        <span style={{ fontSize: 11, color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>
          {isProcessing ? "Processing..." : isListening ? "Listening" : "Ready"}
        </span>
      </div>
      {transcript && (
        <div style={{ fontSize: 14, color: "#ccc", lineHeight: 1.5 }}>{transcript}</div>
      )}
      {partial && (
        <div style={{ fontSize: 14, color: "#666", fontStyle: "italic" }}>{partial}</div>
      )}
      {!transcript && !partial && (
        <div style={{ fontSize: 13, color: "#555" }}>
          Speak or type a description to generate a diagram...
        </div>
      )}
    </div>
  );
}
