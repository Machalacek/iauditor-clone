import React, { useState } from "react";

export default function InviteModal({ onClose, onInvite }) {
  const [email, setEmail] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    onInvite && onInvite(email);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-lg">Invite Member</div>
          <button onClick={onClose} className="text-gray-500 hover:text-black">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <label className="block font-medium mb-2">Email</label>
          <input
            className="border rounded px-3 py-2 mb-4 w-full"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <div className="flex justify-end">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold">Invite</button>
          </div>
        </form>
      </div>
    </div>
  );
}
