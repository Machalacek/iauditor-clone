// src/components/TransferEquipmentModal.jsx

import React, { useState } from "react";

export default function TransferEquipmentModal({
  gearList,
  team,
  projects,
  onClose,
  onTransfer,
}) {
  const [selectedGearId, setSelectedGearId] = useState("");
  const [newAssignedTo, setNewAssignedTo] = useState("");
  const [newProject, setNewProject] = useState("");
  const [fromSig, setFromSig] = useState("");
  const [toSig, setToSig] = useState("");
  const selectedGear = gearList.find((g) => g.id === selectedGearId);

  // Only show signatures if both old and new assignedTo are set and not the same
  const showSignatures =
    selectedGear &&
    selectedGear.assignedTo &&
    newAssignedTo &&
    selectedGear.assignedTo !== newAssignedTo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md relative">
        <h3 className="font-semibold text-xl mb-3">Transfer Equipment</h3>
        {/* Step 1: Choose equipment */}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Select Equipment:</label>
          <select
            value={selectedGearId}
            onChange={e => {
              setSelectedGearId(e.target.value);
              setNewAssignedTo("");
              setNewProject("");
            }}
            className="border rounded px-3 py-2 w-full"
          >
            <option value="">Choose...</option>
            {gearList.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        {selectedGear && (
          <>
            <div className="mb-2 text-xs text-gray-500">
              <div>
                <b>Currently Assigned:</b>{" "}
                {team.find(u => u.id === selectedGear.assignedTo)?.name || "—"}
                {" | "}
                <b>Project:</b>{" "}
                {projects.find(p => p.id === selectedGear.assignedProject)?.name || "—"}
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">Transfer To:</label>
              <select
                value={newAssignedTo}
                onChange={e => setNewAssignedTo(e.target.value)}
                className="border rounded px-3 py-2 w-full"
              >
                <option value="">Select Person...</option>
                {team.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <select
                value={newProject}
                onChange={e => setNewProject(e.target.value)}
                className="border rounded px-3 py-2 w-full mt-1"
              >
                <option value="">Select Project...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            {showSignatures && (
              <div className="mb-3 flex flex-col gap-2">
                <div>
                  <label className="block text-xs text-gray-700">Current Holder Signature:</label>
                  <input
                    type="text"
                    className="border rounded px-3 py-1 w-full"
                    value={fromSig}
                    onChange={e => setFromSig(e.target.value)}
                    placeholder="Enter or draw signature"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-700">New Holder Signature:</label>
                  <input
                    type="text"
                    className="border rounded px-3 py-1 w-full"
                    value={toSig}
                    onChange={e => setToSig(e.target.value)}
                    placeholder="Enter or draw signature"
                  />
                </div>
              </div>
            )}
            <button
              className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 font-semibold mt-2"
              disabled={!newAssignedTo && !newProject}
              onClick={() => {
                onTransfer(selectedGear.id, newAssignedTo, newProject, fromSig, toSig);
              }}
            >
              Confirm Transfer
            </button>
          </>
        )}
        <button className="absolute top-2 right-2 p-1" onClick={onClose}>
          <span className="text-gray-400 hover:text-gray-800 text-lg">✕</span>
        </button>
      </div>
    </div>
  );
}
