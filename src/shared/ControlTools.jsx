import React, { useEffect, useMemo, useState } from "react";
const STORAGE_KEY = "pcontrol-profiles-v1";
function readProfiles() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {}; } catch { return {}; } }
export function useProfiles(backend) {
  const [profiles, setProfiles] = useState(() => readProfiles());
  const [name, setName] = useState(() => localStorage.getItem(`${STORAGE_KEY}-active-${backend}`) || "Default");
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles)); localStorage.setItem(`${STORAGE_KEY}-active-${backend}`, name); }, [profiles, name, backend]);
  const backendProfiles = profiles[backend] || {};
  const active = backendProfiles[name] || { layout: "standard", transition: "CUT", duration: 500, macros: [] };
  const save = (patch = {}) => setProfiles((all) => ({ ...all, [backend]: { ...(all[backend] || {}), [name]: { ...active, ...patch } } }));
  const create = (profileName) => { const clean = profileName.trim(); if (!clean) return; setProfiles((all) => ({ ...all, [backend]: { ...(all[backend] || {}), [clean]: { layout: "standard", transition: "CUT", duration: 500, macros: [] } } })); setName(clean); };
  const remove = () => { if (name === "Default") return; setProfiles((all) => { const copy = { ...all, [backend]: { ...(all[backend] || {}) } }; delete copy[backend][name]; return copy; }); setName("Default"); };
  return { names: Object.keys(backendProfiles).length ? Object.keys(backendProfiles) : ["Default"], name, setName, active, save, create, remove };
}
export function ProfilesPanel({ profiles, onRunMacro }) {
  const [newName, setNewName] = useState(""); const [open, setOpen] = useState(false); const [macroName, setMacroName] = useState("");
  const macros = useMemo(() => profiles.active.macros || [], [profiles.active.macros]);
  const addMacro = () => { const n = macroName.trim(); if (!n) return; profiles.save({ macros: [...macros, { name: n, actions: [{ type: "TAKE" }] }] }); setMacroName(""); };
  return <div className="border-t border-gray-800 pt-4">
    <button onClick={() => setOpen(!open)} className="w-full flex justify-between text-gray-300 text-xs tracking-widest font-semibold"><span>PROFILES & MACROS</span><span>{open ? "−" : "+"}</span></button>
    {open && <div className="mt-3 space-y-3">
      <div className="flex gap-2"><select value={profiles.name} onChange={(e) => profiles.setName(e.target.value)} className="flex-1 bg-[#141414] border border-gray-700 rounded px-2 py-2 text-xs text-white">{profiles.names.map((n) => <option key={n}>{n}</option>)}</select><button onClick={profiles.remove} className="px-2 rounded bg-[#222] text-xs text-gray-400">DEL</button></div>
      <div className="flex gap-2"><input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New profile" className="flex-1 bg-[#141414] border border-gray-700 rounded px-2 py-2 text-xs text-white" /><button onClick={() => { profiles.create(newName); setNewName(""); }} className="px-3 rounded bg-[#e8e6e1] text-black text-xs font-bold">ADD</button></div>
      <div className="text-gray-500 text-[10px] tracking-widest">MACROS</div>
      {macros.map((m) => <button key={m.name} onClick={() => onRunMacro(m)} className="w-full text-left px-3 py-2 rounded bg-[#181818] border border-gray-700 text-xs text-gray-200">▶ {m.name}</button>)}
      <div className="flex gap-2"><input value={macroName} onChange={(e) => setMacroName(e.target.value)} placeholder="New macro" className="flex-1 bg-[#141414] border border-gray-700 rounded px-2 py-2 text-xs text-white" /><button onClick={addMacro} className="px-3 rounded bg-[#242424] text-gray-200 text-xs">ADD</button></div>
      <button onClick={() => profiles.save({ layout: profiles.active.layout === "compact" ? "standard" : "compact" })} className="w-full py-2 rounded bg-[#181818] border border-gray-700 text-[10px] tracking-widest text-gray-300">LAYOUT: {String(profiles.active.layout).toUpperCase()}</button>
    </div>}
  </div>;
}
