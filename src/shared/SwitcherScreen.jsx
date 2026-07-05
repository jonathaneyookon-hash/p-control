import React from "react";
import { Settings, Play, RotateCcw, Infinity as InfinityIcon } from "lucide-react";

export const TRANSITIONS = ["CUT", "FADE", "MERGE", "WIPE"];
export const OVERLAYS = ["O1", "O2", "O3", "O4"];

export default function SwitcherScreen({
  sources,
  previewLabel,
  programLabel,
  onSelectPreview,
  onTransition,
  flash,
  recording,
  streaming,
  onToggleRecording,
  onToggleStreaming,
}) {
  return (
    <div className="min-h-screen w-full bg-black text-white flex font-sans select-none">
      {/* Left: preview/program + sources */}
      <div className="flex-1 p-3 flex flex-col gap-3 min-w-0">
        <div className="flex gap-3">
          <VideoBox
            label="PREVIEW"
            color="border-red-600"
            labelColor="text-red-500"
            sourceLabel={previewLabel}
            flashing={flash !== null}
          />
          <VideoBox
            label="PROGRAM"
            color="border-green-600"
            labelColor="text-green-500"
            sourceLabel={programLabel}
            flashing={flash !== null}
          />
        </div>

        <div>
          <div className="text-gray-400 text-xs tracking-widest mb-2">
            SOURCES ({sources.length})
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {sources.map((s) => (
              <SourceTile
                key={s.id}
                source={s}
                isPreview={s.label === previewLabel}
                isProgram={s.label === programLabel}
                onClick={() => onSelectPreview(s)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right: control panel */}
      <div className="w-[320px] sm:w-[380px] bg-[#0c0c0c] border-l border-gray-800 p-5 flex flex-col gap-6 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-gray-300 text-sm tracking-widest font-semibold">
            TRANSITIONS
          </span>
          <Settings size={18} className="text-gray-400" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TRANSITIONS.map((t) => (
            <button
              key={t}
              onClick={() => onTransition(t)}
              className="bg-[#e8e6e1] hover:bg-white active:scale-[0.97] transition text-black font-bold tracking-wide rounded-md py-4 text-sm shadow"
            >
              {t}
            </button>
          ))}
        </div>

        <div>
          <div className="text-gray-400 text-xs tracking-widest mb-3">
            OVERLAYS
          </div>
          <div className="grid grid-cols-4 gap-3">
            {OVERLAYS.map((o) => (
              <button
                key={o}
                className="bg-[#1a1a1a] hover:bg-[#242424] border border-gray-700 rounded-md py-3 text-sm text-gray-200 font-semibold"
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Transport bar (placeholder) */}
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gray-500 rounded-full" />
          <div className="flex-1 h-2 bg-gray-800 rounded-full relative">
            <div className="absolute left-0 top-0 h-2 w-[92%] bg-gray-400 rounded-full" />
            <div className="absolute right-0 -top-1 w-4 h-4 rounded-full bg-white" />
          </div>
        </div>
        <div className="flex items-center justify-between px-2 -mt-3">
          <RotateCcw size={18} className="text-gray-400" />
          <Play size={18} className="text-gray-400" />
          <InfinityIcon size={18} className="text-gray-400" />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-auto">
          <button
            onClick={onToggleRecording}
            className={`rounded-md py-4 font-bold text-sm tracking-wide transition ${
              recording
                ? "bg-red-500 text-white"
                : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
            }`}
          >
            REC
          </button>
          <button
            onClick={onToggleStreaming}
            className={`rounded-md py-4 font-bold text-sm tracking-wide transition ${
              streaming
                ? "bg-red-500 text-white"
                : "bg-[#2a2a2a] text-gray-300 hover:bg-[#333333]"
            }`}
          >
            STR
          </button>
          <button className="rounded-md py-4 font-bold text-sm tracking-wide bg-[#2a2a2a] text-gray-300">
            EXT
          </button>
        </div>
      </div>
    </div>
  );
}

function VideoBox({ label, color, labelColor, sourceLabel, flashing }) {
  return (
    <div className="flex-1 min-w-0">
      <div className={`text-xs tracking-widest font-semibold mb-1 ${labelColor}`}>
        {label}
      </div>
      <div
        className={`aspect-video bg-black border-2 ${color} rounded-sm flex items-center justify-center transition-opacity duration-150 ${
          flashing ? "opacity-40" : "opacity-100"
        }`}
      >
        <span className="text-gray-600 text-xs tracking-widest uppercase">
          {sourceLabel || "No source"}
        </span>
      </div>
    </div>
  );
}

function SourceTile({ source, isPreview, isProgram, onClick }) {
  const borderClass = isProgram ? "border-red-500" : "border-transparent";
  const ringClass = isPreview ? "ring-2 ring-green-400 ring-inset" : "";

  return (
    <button
      onClick={onClick}
      className={`relative bg-[#141414] rounded-md border-2 ${borderClass} ${ringClass} p-2 text-left hover:bg-[#1c1c1c] transition`}
    >
      <div className="text-gray-500 text-[11px] font-semibold mb-6">
        {source.id}
      </div>
      <div className="text-[13px] leading-tight text-gray-100 font-medium truncate">
        {source.label}
      </div>
    </button>
  );
}
