import React, { useState, useRef } from "react";
import OBSWebSocket from "obs-websocket-js";
import { Wifi } from "lucide-react";
import SwitcherScreen from "./shared/SwitcherScreen.jsx";

// Maps our button labels to OBS's built-in transition names.
// If your OBS has custom-named transitions, adjust these to match.
const TRANSITION_NAME_MAP = {
  CUT: "Cut",
  FADE: "Fade",
  MERGE: "Fade", // OBS has no "Merge" transition; falls back to Fade
  WIPE: "Slide", // swap to "Luma Wipe" or your own custom transition name if you have one
};

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

  const connect = async () => {
    setConnecting(true);
    setConnectError("");
    try {
      const obs = new OBSWebSocket();
      await obs.connect(`ws://${ip}:${port}`, password || undefined);

      await obs.call("SetStudioModeEnabled", { studioModeEnabled: true });

      const { scenes } = await obs.call("GetSceneList");
      const mapped = scenes
        .slice()
        .reverse()
        .map((s, i) => ({ id: i + 1, label: s.sceneName }));
      setSources(mapped);

      const { currentPreviewSceneName } = await obs.call("GetCurrentPreviewScene");
      const { currentProgramSceneName } = await obs.call("GetCurrentProgramScene");
      setPreviewName(currentPreviewSceneName);
      setProgramName(currentProgramSceneName);

      obs.on("CurrentProgramSceneChanged", (data) => setProgramName(data.sceneName));
      obs.on("CurrentPreviewSceneChanged", (data) => setPreviewName(data.sceneName));
      obs.on("RecordStateChanged", (data) => setRecording(data.outputActive));
      obs.on("StreamStateChanged", (data) => setStreaming(data.outputActive));

      obsRef.current = obs;
      setConnected(true);
    } catch (err) {
      setConnectError(err.message || "Could not connect. Check IP, port, and password.");
    } finally {
      setConnecting(false);
    }
  };

  const selectPreview = async (source) => {
    setPreviewName(source.label);
    try {
      await obsRef.current.call("SetCurrentPreviewScene", { sceneName: source.label });
    } catch (err) {
      console.error("Failed to set preview:", err);
    }
  };

  const doTransition = async (buttonName) => {
    setFlash(buttonName);
    try {
      const obsTransitionName = TRANSITION_NAME_MAP[buttonName];
      await obsRef.current.call("SetCurrentSceneTransition", { transitionName: obsTransitionName });
      await obsRef.current.call("TriggerStudioModeTransition");
    } catch (err) {
      console.error("Transition failed:", err);
    }
    setTimeout(() => setFlash(null), buttonName === "FADE" ? 350 : 120);
  };

  const toggleRecording = async () => {
    try {
      await obsRef.current.call("ToggleRecord");
    } catch (err) {
      console.error("Toggle record failed:", err);
    }
  };

  const toggleStreaming = async () => {
    try {
      await obsRef.current.call("ToggleStream");
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
              CONNECT TO OBS
            </span>
          </div>

          <Field label="PC IP ADDRESS" value={ip} onChange={setIp} placeholder="192.168.1.42" />
          <Field label="PORT" value={port} onChange={setPort} placeholder="4455" />
          <Field
            label="PASSWORD"
            value={password}
            onChange={setPassword}
            placeholder="From OBS WebSocket settings"
            isPassword
          />

          {connectError && <div className="text-red-400 text-xs">{connectError}</div>}

          <button
            onClick={connect}
            disabled={connecting}
            className="mt-2 bg-[#e8e6e1] hover:bg-white active:scale-[0.98] transition text-black font-bold tracking-wide rounded-md py-4 text-sm shadow disabled:opacity-50"
          >
            {connecting ? "CONNECTING..." : "CONNECT"}
          </button>

          <div className="text-gray-500 text-[11px] mt-4 leading-relaxed">
            In OBS: Tools → WebSocket Server Settings → make sure it's enabled,
            then copy the port and password shown there. Your phone and PC must
            be on the same WiFi network.
          </div>
        </div>
      </div>
    );
  }

  return (
    <SwitcherScreen
      sources={sources}
      previewLabel={previewName}
      programLabel={programName}
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

function Field({ label, value, onChange, placeholder, isPassword }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-gray-500 text-[11px] tracking-widest">{label}</label>
      <input
        type={isPassword ? "password" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-[#141414] border border-gray-700 rounded-md px-3 py-3 text-sm text-white outline-none focus:border-gray-400"
      />
    </div>
  );
}
