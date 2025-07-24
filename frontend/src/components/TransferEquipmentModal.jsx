// src/components/TransferEquipmentModal.jsx

import React, { useState, useEffect } from "react";

export default function TransferEquipmentModal({
  gearList,
  team,
  projects,
  initialGearId,
  onClose,
  onTransfer,
}) {
  const [selectedGearId, setSelectedGearId] = useState(initialGearId || "");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newProject, setNewProject] = useState("");
  const [step, setStep] = useState(initialGearId ? 2 : 1);

  useEffect(() => {
    if (initialGearId) {
      setSelectedGearId(initialGearId);
      setStep(2);
    }
  }, [initialGearId]);

  const selectedGear = gearList.find((g) => g.id === selectedGearId);

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedGearId || !newAssignedTo) return;
    onTransfer(selectedGearId, newAssignedTo, newProject);
  }

  function handleBack() {
    if (step === 2 && !initialGearId) {
      setStep(1);
      setSelectedGearId("");
    } else {
      onClose();
    }
  }

  // --- Overlay Modal Wrapper! ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 min-w-[350px] max-w-md w-full relative">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-bold">
            Transfer Equipment
          </div>
          <button
            className="text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {/* Step 1: Select gear (skip if initialGearId is set) */}
        {step === 1 && !initialGearId && (
          <div>
            <label className="block text-sm font-medium mb-2">Select Equipment:</label>
            <select
              className="border rounded px-3 py-2 w-full mb-4"
              value={selectedGearId}
              onChange={e => setSelectedGearId(e.target.value)}
            >
              <option value="">— Select —</option>
              {gearList.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.serialNumber ? `(#${g.serialNumber})` : ""}
                </option>
              ))}
            </select>
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 w-full font-semibold"
              disabled={!selectedGearId}
              onClick={() => setStep(2)}
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: Select recipient/project */}
        {step === 2 && selectedGear && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Equipment:</label>
              <div className="font-semibold mb-1">{selectedGear.name} {selectedGear.serialNumber && <> (#{selectedGear.serialNumber})</>}</div>
              <div className="text-xs text-gray-500 mb-1">{selectedGear.category}</div>
              <div className="text-xs text-gray-400">Current: {selectedGear.assignedTo ? (team.find(u => u.id === selectedGear.assignedTo)?.name || selectedGear.assignedTo) : "—"}</div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Assign To:</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={newAssignedTo}
                onChange={e => setNewAssignedTo(e.target.value)}
                required
              >
                <option value="">— Select Team Member —</option>
                {team.filter(u => u.active !== false).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Project (optional):</label>
              <select
                className="border rounded px-3 py-2 w-full"
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-between mt-4">
              <button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 rounded px-4 py-2 font-semibold"
                onClick={handleBack}
              >
                Back
              </button>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2 font-semibold"
                disabled={!newAssignedTo}
              >
                Transfer
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
