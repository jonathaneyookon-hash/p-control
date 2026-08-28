import React, { useState, useRef } from "react";
import OBSWebSocket from "obs-websocket-js";
import { Wifi } from "lucide-react";
import SwitcherScreen from "./shared/SwitcherScreen.jsx";

const TRANSITION_NAME_MAP = { CUT: "Cut", FADE: "Fade", MERGE: "Fade", WIPE: "Slide" };

export default function OBSController({ onBack }) {
  const obsRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [ip, setIp] = useState("192.168.1.");
  const [port, setPort] = useState("4455");
  const [password, setPassword] = useState("");
  const [sources, setSources] = useState([]);
  const [previewName, setPreviewName] = useState(null);
  const [programName, setProgramName] = useState(null);
  const [flash, setFlash] = useState(null);
  const [recording, setRecording] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const addLog = (msg) => setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);

  const probeRawSocket = () => new Promise((resolve) => {
    let settled = false;
    let raw;
    try { raw = new WebSocket(`ws://${ip}:${port}`); } catch (e) { addLog(`Raw probe: ${e.message}`); resolve(); return; }
    const probeTimeout = setTimeout(() => {
      if (!settled) { settled = true; addLog(`Raw probe: NOT OPEN after 5s (readyState=${raw.readyState}). Check firewall, router isolation, IP, or VPN.`); resolve(); }
    }, 5000);
    raw.onopen = () => { if (!settled) { settled = true; clearTimeout(probeTimeout); addLog("Raw probe: network path is OPEN."); raw.close(); resolve(); } };
    raw.onerror = () => { if (!settled) { settled = true; clearTimeout(probeTimeout); addLog("Raw probe: low-level socket error."); resolve(); } };
    raw.onclose = (e) => { if (!settled) { settled = true; clearTimeout(probeTimeout); addLog(`Raw probe: closed. code=${e.code}`); resolve(); } };
  });

  const connect = async () => {
    setConnecting(true); setConnectError(""); setDebugLog([]); addLog(`Connecting to ws://${ip}:${port}`);
    await probeRawSocket();
    try {
      const obs = new OBSWebSocket();
      await Promise.race([
        obs.connect(`ws://${ip}:${port}`, password || undefined),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Connection timed out after 8 seconds. Check network/firewall.")), 8000)),
      ]);
      addLog("OBS connected and authenticated.");
      await obs.call("SetStudioModeEnabled", { studioModeEnabled: true });
      const { scenes } = await obs.call("GetSceneList");
      setSources(scenes.slice().reverse().map((s, i) => ({ id: i + 1, label: s.sceneName })));
      const { currentPreviewSceneName } = await obs.call("GetCurrentPreviewScene");
      const { currentProgramSceneName } = await obs.call("GetCurrentProgramScene");
      setPreviewName(currentPreviewSceneName); setProgramName(currentProgramSceneName);
      obs.on("CurrentProgramSceneChanged", (data) => setProgramName(data.sceneName));
      obs.on("CurrentPreviewSceneChanged", (data) => setPreviewName(data.sceneName));
      obs.on("RecordStateChanged", (data) => setRecording(data.outputActive));
      obs.on("StreamStateChanged", (data) => setStreaming(data.outputActive));
      obsRef.current = obs; setConnected(true);
    } catch (err) {
      addLog(`OBS error: ${err?.message || String(err)}`);
      setConnectError(err.message || "Could not connect. Check IP, port, and password.");
    } finally { setConnecting(false); }
  };

  const selectPreview = async (source) => {
    setPreviewName(source.label);
    try { await obsRef.current.call("SetCurrentPreviewScene", { sceneName: source.label }); } catch (err) { console.error(err); }
  };
  const doTransition = async (buttonName) => {
    setFlash(buttonName);
    try {
      await obsRef.current.call("SetCurrentSceneTransition", { transitionName: TRANSITION_NAME_MAP[buttonName] });
      await obsRef.current.call("TriggerStudioModeTransition");
    } catch (err) { console.error(err); }
    setTimeout(() => setFlash(null), buttonName === "FADE" ? 350 : 120);
  };
  const toggleRecording = async () => { try { await obsRef.current.call("ToggleRecord"); } catch (err) { console.error(err); } };
  const toggleStreaming = async () => { try { await obsRef.current.call("ToggleStream"); } catch (err) { console.error(err); } };

  if (!connected) return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <button onClick={onBack} className="text-gray-500 text-xs text-left mb-2">← Back</button>
        <div className="flex items-center gap-2 mb-2"><Wifi size={20} className="text-gray-400" /><span className="text-gray-300 text-sm tracking-widest font-semibold">CONNECT TO OBS</span></div>
        <Field label="PC IP ADDRESS" value={ip} onChange={setIp} placeholder="192.168.1.42" />
        <Field label="PORT" value={port} onChange={setPort} placeholder="4455" />
        <Field label="PASSWORD" value={password} onChange={setPassword} placeholder="From OBS WebSocket settings" isPassword />
        {connectError && <div className="text-red-400 text-xs">{connectError}</div>}
        <button onClick={connect} disabled={connecting} className="mt-2 bg-[#e8e6e1] hover:bg-white active:scale-[0.98] transition text-black font-bold tracking-wide rounded-md py-4 text-sm shadow disabled:opacity-50">{connecting ? "CONNECTING..." : "CONNECT"}</button>
        {debugLog.length > 0 && <div className="bg-[#0a0a0a] border border-gray-800 rounded-md p-3 mt-2 max-h-56 overflow-y-auto"><div className="text-gray-500 text-[10px] tracking-widest mb-2">DEBUG LOG</div><pre className="text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">{debugLog.join("\n")}</pre></div>}
        <div className="text-gray-500 text-[11px] mt-4 leading-relaxed">In OBS: Tools → WebSocket Server Settings → enable it, then copy the port and password. Your phone and PC must be on the same WiFi network.</div>
      </div>
    </div>
  );

  return <SwitcherScreen backend="obs" ip={ip} port={port} obs={obsRef.current} sources={sources} previewLabel={previewName} programLabel={programName} onSelectPreview={selectPreview} onTransition={doTransition} flash={flash} recording={recording} streaming={streaming} onToggleRecording={toggleRecording} onToggleStreaming={toggleStreaming} />;
}

function Field({ label, value, onChange, placeholder, isPassword }) {
  return <div className="flex flex-col gap-1"><label className="text-gray-500 text-[11px] tracking-widest">{label}</label><input type={isPassword ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="bg-[#141414] border border-gray-700 rounded-md px-3 py-3 text-sm text-white outline-none focus:border-gray-400" /></div>;
}
