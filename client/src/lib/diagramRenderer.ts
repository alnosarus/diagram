import katex from "katex";

/**
 * Renders a LaTeX string to a canvas and returns it.
 * Used by Three.js CanvasTexture for equation labels.
 */
export function renderLatexToCanvas(
  latex: string,
  fontSize: number = 24
): HTMLCanvasElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.fontSize = `${fontSize}px`;
  container.style.color = "#ffffff";
  container.style.background = "transparent";
  document.body.appendChild(container);

  katex.render(latex, container, {
    throwOnError: false,
    displayMode: true,
  });

  const rect = container.getBoundingClientRect();
  const width = Math.ceil(rect.width) + 16;
  const height = Math.ceil(rect.height) + 16;

  const canvas = document.createElement("canvas");
  const scale = 2; // retina
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // Draw the HTML content via svg foreignObject
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-size:${fontSize}px;color:#ffffff;padding:8px;">
          ${container.innerHTML}
        </div>
      </foreignObject>
    </svg>`;

  const img = new Image();
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  document.body.removeChild(container);

  return Object.assign(canvas, { __loadPromise: loadSvgToCanvas(url, canvas, ctx, width, height, scale) });
}

async function loadSvgToCanvas(
  url: string,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number
): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      // Fallback: draw plain text
      ctx.fillStyle = "#ffffff";
      ctx.font = `${16 * scale}px monospace`;
      ctx.fillText(url.substring(0, 30), 8, 24);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.src = url;
  });
}

/**
 * Simpler approach: render LaTeX to a canvas using 2D context directly.
 * This avoids SVG foreignObject security issues.
 */
export function renderTextToCanvas(
  text: string,
  fontSize: number = 20,
  color: string = "#ffffff"
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const scale = 2;
  const ctx = canvas.getContext("2d")!;

  ctx.font = `${fontSize * scale}px "KaTeX_Main", serif`;
  const metrics = ctx.measureText(text);
  const width = Math.ceil(metrics.width) + 20;
  const height = fontSize * scale + 20;

  canvas.width = width;
  canvas.height = height;

  ctx.font = `${fontSize * scale}px "KaTeX_Main", serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, 10, height / 2);

  return canvas;
}
