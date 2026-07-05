import React, { useState, useRef, useEffect } from "react";
import { Wifi } from "lucide-react";
import SwitcherScreen from "./shared/SwitcherScreen.jsx";

// vMix's transition Function names match our button labels directly.
const TRANSITION_FUNCTION_MAP = {
  CUT: "Cut",
  FADE: "Fade",
  MERGE: "Merge",
  WIPE: "Wipe",
};

export default function VMixController({ onBack }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");

  const [ip, setIp] = useState("192.168.1.");
  const [port, setPort] = useState("8088");

  const [sources, setSources] = useState([]);
  const [previewLabel, setPreviewLabel] = useState(null);
  const [programLabel, setProgramLabel] = useState(null);
  const [flash, setFlash] = useState(null);
  const [recording, setRecording] = useState(false);
  const [streaming, setStreaming] = useState(false);

  const baseUrl = `http://${ip}:${port}/api/`;
  const pollRef = useRef(null);

  const callFunction = async (fn, params = {}) => {
    const query = new URLSearchParams({ Function: fn, ...params }).toString();
    await fetch(`${baseUrl}?${query}`);
  };

  const fetchState = async () => {
    const res = await fetch(baseUrl);
    const text = await res.text();
    const xml = new window.DOMParser().parseFromString(text, "text/xml");

    const inputNodes = Array.from(xml.querySelectorAll("input"));
    const mapped = inputNodes.map((node) => ({
      id: node.getAttribute("number"),
      label: node.getAttribute("title") || `Input ${node.getAttribute("number")}`,
    }));
    setSources(mapped);

    const previewNum = xml.querySelector("preview")?.textContent;
    const activeNum = xml.querySelector("active")?.textContent;
    const previewSource = mapped.find((s) => s.id === previewNum);
    const activeSource = mapped.find((s) => s.id === activeNum);
    setPreviewLabel(previewSource ? previewSource.label : null);
    setProgramLabel(activeSource ? activeSource.label : null);

    setRecording(xml.querySelector("recording")?.textContent === "True");
    setStreaming(xml.querySelector("streaming")?.textContent === "True");
  };

  const connect = async () => {
    setConnecting(true);
    setConnectError("");
    try {
      await fetchState();
      setConnected(true);
      pollRef.current = setInterval(fetchState, 1000);
    } catch (err) {
      setConnectError(
        "Could not reach vMix. Check the IP address, that vMix is running, and that your phone is on the same WiFi network."
      );
    } finally {
      setConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const selectPreview = async (source) => {
    setPreviewLabel(source.label);
    try {
      await callFunction("PreviewInput", { Input: source.id });
    } catch (err) {
      console.error("Failed to set preview:", err);
    }
  };

  const doTransition = async (buttonName) => {
    setFlash(buttonName);
    try {
      const fn = TRANSITION_FUNCTION_MAP[buttonName];
      await callFunction(fn, fn === "Cut" ? {} : { Duration: 500 });
    } catch (err) {
      console.error("Transition failed:", err);
    }
    setTimeout(() => setFlash(null), buttonName === "FADE" ? 350 : 120);
  };

  const toggleRecording = async () => {
    try {
      await callFunction(recording ? "StopRecording" : "StartRecording");
    } catch (err) {
      console.error("Toggle record failed:", err);
    }
  };

  const toggleStreaming = async () => {
    try {
      await callFunction(streaming ? "StopStreaming" : "StartStreaming");
    } catch (err) {
      console.error("Toggle stream failed:", err);
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <button onClick={onBack} className="text-gray-500 text-xs text-left mb-2">
            ← Back
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Wifi size={20} className="text-gray-400" />
            <span className="text-gray-300 text-sm tracking-widest font-semibold">
              CONNECT TO VMIX
            </span>
          </div>

          <Field label="PC IP ADDRESS" value={ip} onChange={setIp} placeholder="192.168.1.42" />
          <Field label="PORT" value={port} onChange={setPort} placeholder="8088" />

          {connectError && <div className="text-red-400 text-xs">{connectError}</div>}

          <button
            onClick={connect}
            disabled={connecting}
            className="mt-2 bg-[#e8e6e1] hover:bg-white active:scale-[0.98] transition text-black font-bold tracking-wide rounded-md py-4 text-sm shadow disabled:opacity-50"
          >
            {connecting ? "CONNECTING..." : "CONNECT"}
          </button>

          <div className="text-gray-500 text-[11px] mt-4 leading-relaxed">
            vMix's Web Controller must be enabled: Settings → Web Controller
            in vMix. Port 8088 is the default. Your phone and PC must be on
            the same WiFi network.
          </div>
        </div>
      </div>
    );
  }

  return (
    <SwitcherScreen
      sources={sources}
      previewLabel={previewLabel}
      programLabel={programLabel}
      onSelectPreview={selectPreview}
      onTransition={doTransition}
      flash={flash}
      recording={recording}
      streaming={streaming}
      onToggleRecording={toggleRecording}
      onToggleStreaming={toggleStreaming}
    />
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-gray-500 text-[11px] tracking-widest">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#141414] border border-gray-700 rounded-md px-3 py-3 text-sm text-white outline-none focus:border-gray-400"
      />
    </div>
  );
}
