export interface HandGesture {
  palmX: number;       // 0-1 normalized
  palmY: number;       // 0-1 normalized
  pinchDistance: number;
  fingersSpread: boolean;
}

/**
 * Extract gesture information from MediaPipe hand landmarks.
 * Landmark indices: 4=thumb tip, 8=index tip, 9=middle MCP (palm center),
 * 12=middle tip, 16=ring tip, 20=pinky tip
 */
export function extractGesture(landmarks: { x: number; y: number; z: number }[]): HandGesture {
  const palm = landmarks[9];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];

  const pinchDistance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

  const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];
  const avgSpacing = fingerTips.reduce((sum, tip, i, arr) => {
    if (i === 0) return sum;
    return sum + Math.hypot(tip.x - arr[i - 1].x, tip.y - arr[i - 1].y);
  }, 0) / (fingerTips.length - 1);

  return {
    palmX: palm.x,
    palmY: palm.y,
    pinchDistance,
    fingersSpread: avgSpacing > 0.12,
  };
}

export interface CameraUpdate {
  azimuth: number;
  polar: number;
  distance: number;
}

export function gestureToCameraUpdate(
  gesture: HandGesture,
  currentDistance: number
): CameraUpdate {
  const DEAD_ZONE = 0.1;

  let dx = gesture.palmX - 0.5;
  let dy = gesture.palmY - 0.5;

  if (Math.abs(dx) < DEAD_ZONE) dx = 0;
  else dx = dx > 0 ? dx - DEAD_ZONE : dx + DEAD_ZONE;

  if (Math.abs(dy) < DEAD_ZONE) dy = 0;
  else dy = dy > 0 ? dy - DEAD_ZONE : dy + DEAD_ZONE;

  let distance = currentDistance;
  if (gesture.pinchDistance < 0.05) {
    distance = Math.max(3, distance - 0.15);
  } else if (gesture.pinchDistance > 0.15) {
    distance = Math.min(20, distance + 0.15);
  }

  if (gesture.fingersSpread) {
    distance = 10;
  }

  return {
    azimuth: dx * Math.PI * 2,
    polar: Math.PI / 4 + dy * Math.PI * 0.5,
    distance,
  };
}
