import { useRef, useCallback, useState } from "react";
import { useDiagramState } from "./useDiagramState";

export function useSpeechToText() {
  const wsRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const setPartialTranscript = useDiagramState((s) => s.setPartialTranscript);
  const setTranscript = useDiagramState((s) => s.setTranscript);
  const setIsListening = useDiagramState((s) => s.setIsListening);
  const diagram = useDiagramState((s) => s.diagram);
  const setDiagram = useDiagramState((s) => s.setDiagram);
  const setIsProcessing = useDiagramState((s) => s.setIsProcessing);

  const parseDiagram = useCallback(async (text: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: text,
          currentDiagram: useDiagramState.getState().diagram,
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
    }
  }, []);

  const start = useCallback(async () => {
    try {
      // Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Connect to backend STT proxy
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${wsProtocol}//${window.location.host}/api/stt`);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsListening(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "partial") {
            setPartialTranscript(data.text);
          } else if (data.type === "final") {
            setPartialTranscript("");
            const prev = useDiagramState.getState().transcript;
            const updated = prev ? `${prev} ${data.text}` : data.text;
            setTranscript(updated);
            parseDiagram(data.text);
          }
        } catch {}
      };

      ws.onclose = () => {
        setIsConnected(false);
        setIsListening(false);
      };

      // Set up audio capture
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const input = e.inputBuffer.getChannelData(0);
          // Convert Float32 to Int16 PCM
          const pcm = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            pcm[i] = Math.max(-32768, Math.min(32767, Math.round(input[i] * 32767)));
          }
          ws.send(pcm.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    } catch (err) {
      console.error("STT start failed:", err);
    }
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.close();
    processorRef.current?.disconnect();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    setIsListening(false);
    setIsConnected(false);
  }, []);

  return { start, stop, isConnected };
}
