import { useEffect, useRef, useState } from "react";
import { useHandTracking } from "../hooks/useHandTracking";

const GESTURES = [
  { icon: "✊", label: "Fist + move", desc: "Pan on ground (XZ)" },
  { icon: "🤏", label: "Pinch + up/down", desc: "Elevation (Y)" },
  { icon: "🤏", label: "Pinch + tilt", desc: "Orbit / rotate" },
  { icon: "🤚", label: "Open hand", desc: "Mouse controls" },
];

export default function HandTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { startTracking, stopTracking, isReady } = useHandTracking(videoRef, canvasRef);
  const [showGuide, setShowGuide] = useState(true);

  useEffect(() => {
    startTracking();
    return () => stopTracking();
  }, []);

  return (
    <>
      {/* Webcam PiP */}
      <div
        style={{
          position: "absolute",
          bottom: 160,
          right: 16,
          width: 192,
          height: 144,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.15)",
          background: "#000",
          zIndex: 15,
          opacity: 0.85,
        }}
      >
        <video
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)",
          }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            transform: "scaleX(-1)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 4,
            left: 6,
            fontSize: 9,
            color: isReady ? "#44ff88" : "#888",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {isReady ? "Hand Tracking" : "Loading..."}
        </div>
      </div>

      {/* Gesture guide */}
      <div
        style={{
          position: "absolute",
          bottom: 312,
          right: 16,
          width: 192,
          background: "rgba(10, 10, 20, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10,
          zIndex: 15,
          overflow: "hidden",
        }}
      >
        <button
          onClick={() => setShowGuide((v) => !v)}
          style={{
            width: "100%",
            padding: "8px 10px",
            background: "none",
            border: "none",
            borderBottom: showGuide ? "1px solid rgba(255,255,255,0.06)" : "none",
            color: "#aaa",
            fontSize: 11,
            textAlign: "left",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>Hand Gestures</span>
          <span style={{ fontSize: 10 }}>{showGuide ? "▲" : "▼"}</span>
        </button>
        {showGuide && (
          <div style={{ padding: "6px 10px 10px" }}>
            {GESTURES.map((g) => (
              <div
                key={g.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 0",
                }}
              >
                <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{g.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: "#ccc" }}>{g.label}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
