import React, { useState } from "react";

export default function AddProjectModal({ onClose, onAdd }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd && onAdd({ name, desc });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg">Add Project</div>
          <button onClick={onClose} className="text-gray-500 hover:text-black">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block font-medium mb-2">Project Name</label>
          <input
            className="border rounded px-3 py-2 mb-4 w-full"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          <label className="block font-medium mb-2">Description</label>
          <textarea
            className="border rounded px-3 py-2 mb-4 w-full"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold">Add Project</button>
          </div>
        </form>
      </div>
    </div>
  );
}
