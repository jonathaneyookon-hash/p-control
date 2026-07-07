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

  const [debugLog, setDebugLog] = useState([]);
  const addLog = (msg) =>
    setDebugLog((prev) => [...prev, `${new Date().toLocaleTimeString()}  ${msg}`]);

  // Opens a bare WebSocket with no OBS protocol involved, so we can tell
  // whether the network path itself is open or blocked, independent of
  // anything obs-websocket-js does with auth/handshakes.
  const probeRawSocket = () =>
    new Promise((resolve) => {
      let settled = false;
      let raw;
      try {
        raw = new WebSocket(`ws://${ip}:${port}`);
      } catch (e) {
        addLog(`Raw probe: threw immediately constructing WebSocket — ${e.message}`);
        resolve();
        return;
      }

      const probeTimeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          addLog(
            `Raw probe: still NOT OPEN after 5s (readyState=${raw.readyState}). This means the network path to ${ip}:${port} is being silently blocked — firewall, router AP/client isolation, wrong IP, or a VPN — not an OBS password/protocol issue.`
          );
          resolve();
        }
      }, 5000);

      raw.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(probeTimeout);
          addLog(
            "Raw probe: OPENED successfully. Network path is fine — if OBS still fails past this point, it's an OBS-protocol/auth issue, not networking."
          );
          raw.close();
          resolve();
        }
      };
      raw.onerror = () => {
        if (!settled) {
          settled = true;
          clearTimeout(probeTimeout);
          addLog(
            "Raw probe: error event fired (browsers hide the detail, but this confirms the socket failed at a low level, e.g. connection refused or blocked)."
          );
          resolve();
        }
      };
      raw.onclose = (e) => {
        if (!settled) {
          settled = true;
          clearTimeout(probeTimeout);
          addLog(`Raw probe: closed immediately. code=${e.code} reason="${e.reason || "(none)"}"`);
          resolve();
        }
      };
    });

  const connect = async () => {
    setConnecting(true);
    setConnectError("");
    setDebugLog([]);
    addLog(`Starting connection attempt to ws://${ip}:${port}`);

    await probeRawSocket();

    try {
      const obs = new OBSWebSocket();

      const CONNECT_TIMEOUT_MS = 8000;
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Timed out after ${CONNECT_TIMEOUT_MS / 1000}s. The connection is hanging rather than being refused — this usually means a firewall, router client-isolation setting, or VPN is silently blocking traffic to ${ip}:${port}, not a wrong password.`
              )
            ),
          CONNECT_TIMEOUT_MS
        )
      );

      addLog("Attempting obs-websocket-js connect + auth handshake...");
      await Promise.race([
        obs.connect(`ws://${ip}:${port}`, password || undefined),
        timeout,
      ]);
      addLog("obs-websocket-js: connected and authenticated successfully.");

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
      addLog(`obs-websocket-js error: name=${err?.name || "?"} message=${err?.message || String(err)}`);
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

          {debugLog.length > 0 && (
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-md p-3 mt-2 max-h-56 overflow-y-auto">
              <div className="text-gray-500 text-[10px] tracking-widest mb-2">
                DEBUG LOG (screenshot this if it's still failing)
              </div>
              <pre className="text-[10px] text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                {debugLog.join("\n")}
              </pre>
            </div>
          )}

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
