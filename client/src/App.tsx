import DiagramCanvas from "./components/DiagramCanvas";
import TranscriptPanel from "./components/TranscriptPanel";
import ControlsOverlay from "./components/ControlsOverlay";
import HandTracker from "./components/HandTracker";

export default function App() {
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <DiagramCanvas />
      <ControlsOverlay />
      <TranscriptPanel />
      <HandTracker />
    </div>
  );
}
