import React, { useState } from "react";
import OBSController from "./OBSController.jsx";
import VMixController from "./VMixController.jsx";

export default function App() {
  const [backend, setBackend] = useState(null); // null | "obs" | "vmix"

  if (backend === "obs") {
    return <OBSController onBack={() => setBackend(null)} />;
  }

  if (backend === "vmix") {
    return <VMixController onBack={() => setBackend(null)} />;
  }

  return (
    <div className="min-h-screen w-full bg-black text-white flex items-center justify-center font-sans p-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="text-gray-300 text-sm tracking-widest font-semibold mb-4 text-center">
          CHOOSE YOUR SWITCHER
        </div>

        <button
          onClick={() => setBackend("obs")}
          className="bg-[#e8e6e1] hover:bg-white active:scale-[0.98] transition text-black font-bold tracking-wide rounded-md py-6 text-base shadow"
        >
          OBS
        </button>

        <button
          onClick={() => setBackend("vmix")}
          className="bg-[#e8e6e1] hover:bg-white active:scale-[0.98] transition text-black font-bold tracking-wide rounded-md py-6 text-base shadow"
        >
          VMIX
        </button>
      </div>
    </div>
  );
}
