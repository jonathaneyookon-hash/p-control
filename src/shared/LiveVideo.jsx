import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function LiveVideo({ backend, ip, port, obs, sourceName, label, accent = "green" }) {
  const [imageData, setImageData] = useState("");
  const [status, setStatus] = useState("WAITING FOR VIDEO");
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const timerRef = useRef(null);
  const busyRef = useRef(false);

  useEffect(() => {
    setImageData("");
    setStatus("WAITING FOR VIDEO");
    if (timerRef.current) clearTimeout(timerRef.current);
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (backend !== "obs" || !obs || !sourceName) return undefined;

    let cancelled = false;
    const refresh = async () => {
      if (cancelled || busyRef.current) return;
      busyRef.current = true;
      try {
        const response = await obs.call("GetSourceScreenshot", {
          sourceName,
          imageFormat: "jpeg",
          imageWidth: 640,
          imageHeight: 360,
          imageCompressionQuality: 65,
        });
        if (!cancelled && response?.imageData) {
          setImageData(response.imageData);
          setStatus("LIVE MONITOR");
        }
      } catch {
        if (!cancelled) setStatus("VIDEO UNAVAILABLE");
      } finally {
        busyRef.current = false;
        if (!cancelled) timerRef.current = setTimeout(refresh, 300);
      }
    };
    refresh();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [backend, obs, sourceName]);

  useEffect(() => {
    if (backend !== "vmix" || !ip || !port || !videoRef.current) return undefined;
    const video = videoRef.current;
    const url = `http://${ip}:${port}/livelan/stream.m3u8`;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.play().catch(() => {});
      setStatus("LIVE OUTPUT");
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 30, maxBufferLength: 8 });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("LIVE OUTPUT");
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) setStatus("START LIVELAN IN VMIX");
      });
    } else {
      setStatus("HLS NOT SUPPORTED");
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [backend, ip, port]);

  const border = accent === "red" ? "border-red-600" : "border-green-600";
  const text = accent === "red" ? "text-red-500" : "text-green-500";

  return (
    <div className="flex-1 min-w-0">
      <div className={`flex items-center justify-between text-xs tracking-widest font-semibold mb-1 ${text}`}>
        <span>{label}</span>
        <span className="text-[9px] tracking-wider text-gray-500">{status}</span>
      </div>
      <div className={`relative aspect-video bg-[#050505] border-2 ${border} rounded-sm overflow-hidden`}>
        {backend === "vmix" ? (
          <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline autoPlay />
        ) : imageData ? (
          <img src={imageData} alt={`${label} live monitor`} className="absolute inset-0 w-full h-full object-cover" />
        ) : null}
        {status !== "LIVE OUTPUT" && status !== "LIVE MONITOR" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-gray-600 text-[10px] tracking-widest text-center px-3">{status}</span>
          </div>
        )}
      </div>
    </div>
  );
}
