import { useRef, useCallback, useState } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { useDiagramState } from "./useDiagramState";
import type { HandGesture } from "./useDiagramState";

type Lm = { x: number; y: number; z: number };

const PINCH_THRESHOLD = 0.06;

/**
 * Gesture detection:
 * - Fist: all 4 fingertips curled below their MCP joints
 * - Pinch: thumb tip (4) close to index tip (8)
 * - Open: everything else
 */
function detectGesture(landmarks: Lm[]): HandGesture {
  const tipIds = [8, 12, 16, 20];
  const mcpIds = [5, 9, 13, 17];

  // Check fist
  let curledCount = 0;
  for (let i = 0; i < tipIds.length; i++) {
    if (landmarks[tipIds[i]].y > landmarks[mcpIds[i]].y) {
      curledCount++;
    }
  }
  if (curledCount >= 4) return "fist";

  // Check pinch (thumb tip to index tip distance)
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
  if (pinchDist < PINCH_THRESHOLD) return "pinch";

  return "open";
}

/**
 * Hand tilt angle: angle of the vector from wrist (0) to middle finger MCP (9)
 * relative to vertical in screen space. This changes when user rotates their hand
 * like turning a doorknob.
 */
function getHandAngle(landmarks: Lm[]): number {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  return Math.atan2(middleMcp.x - wrist.x, -(middleMcp.y - wrist.y));
}

function gestureLabel(g: HandGesture): string {
  switch (g) {
    case "fist": return "FIST → PAN";
    case "pinch": return "PINCH → ELEV / ORBIT";
    case "open": return "OPEN";
    default: return "";
  }
}

function gestureColor(g: HandGesture): string {
  switch (g) {
    case "fist": return "#ff6666";
    case "pinch": return "#ffcc44";
    default: return "#44ff88";
  }
}

export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animFrameRef = useRef<number>(0);
  const [isReady, setIsReady] = useState(false);

  const prevPalmRef = useRef<{ x: number; y: number } | null>(null);
  const prevAngleRef = useRef<number | null>(null);
  const prevGestureRef = useRef<HandGesture>("none");

  const setHandCommand = useDiagramState((s) => s.setHandCommand);
  const setHandDetected = useDiagramState((s) => s.setHandDetected);

  const startTracking = useCallback(async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
      handLandmarkerRef.current = handLandmarker;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsReady(true);
      detect();
    } catch (err) {
      console.warn("Hand tracking init failed:", err);
    }
  }, []);

  const detect = useCallback(() => {
    const video = videoRef.current;
    const handLandmarker = handLandmarkerRef.current;
    const canvas = canvasRef.current;

    if (!video || !handLandmarker || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(detect);
      return;
    }

    const result = handLandmarker.detectForVideo(video, performance.now());
    const ctx = canvas?.getContext("2d");

    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (result.landmarks && result.landmarks.length > 0) {
      const landmarks = result.landmarks[0];
      setHandDetected(true);

      const gesture = detectGesture(landmarks);
      const angle = getHandAngle(landmarks);

      // Draw landmarks
      if (ctx && canvas) {
        ctx.fillStyle = gestureColor(gesture);
        for (const lm of landmarks) {
          ctx.beginPath();
          ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Draw tilt indicator line for pinch
        if (gesture === "pinch") {
          const wrist = landmarks[0];
          const middleMcp = landmarks[9];
          ctx.strokeStyle = "#ffcc44";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(wrist.x * canvas.width, wrist.y * canvas.height);
          ctx.lineTo(middleMcp.x * canvas.width, middleMcp.y * canvas.height);
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(gestureLabel(gesture), 8, canvas.height - 8);
      }

      // Palm center
      const palm = landmarks[9];

      // Compute deltas (only if same gesture as previous frame)
      let dx = 0;
      let dy = 0;
      let dAngle = 0;
      const sameGesture = prevGestureRef.current === gesture;

      if (prevPalmRef.current && sameGesture) {
        dx = palm.x - prevPalmRef.current.x;
        dy = palm.y - prevPalmRef.current.y;
      }
      if (prevAngleRef.current !== null && sameGesture) {
        dAngle = angle - prevAngleRef.current;
        // Wrap-around protection
        if (dAngle > Math.PI) dAngle -= Math.PI * 2;
        if (dAngle < -Math.PI) dAngle += Math.PI * 2;
      }

      prevPalmRef.current = { x: palm.x, y: palm.y };
      prevAngleRef.current = angle;
      prevGestureRef.current = gesture;

      setHandCommand({ gesture, dx, dy, dAngle });
    } else {
      setHandDetected(false);
      prevPalmRef.current = null;
      prevAngleRef.current = null;
      prevGestureRef.current = "none";
      setHandCommand({ gesture: "none", dx: 0, dy: 0, dAngle: 0 });
    }

    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  const stopTracking = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    }
    handLandmarkerRef.current?.close();
  }, []);

  return { startTracking, stopTracking, isReady };
}
