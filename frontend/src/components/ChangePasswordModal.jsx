// src/components/ChangePasswordModal.jsx

import React, { useState } from "react";
import { auth } from "../firebase";

export default function ChangePasswordModal({ open, onClose }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (!open) return null;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!password || !confirm) {
      setError("Fill out both fields.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await auth.currentUser.updatePassword(password);
      setSuccess("Password changed!");
      setPassword("");
      setConfirm("");
      setTimeout(onClose, 1000);
    } catch (e) {
      setError(e.message || "Could not change password.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <form
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xs space-y-4"
        onSubmit={handleChangePassword}
      >
        <div className="text-lg font-bold mb-2">Change Password</div>
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <input
          type="password"
          className="w-full border rounded p-2"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {success && <div className="text-green-500 text-sm">{success}</div>}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            className="flex-1 bg-gray-200 rounded py-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white rounded py-2"
          >
            Change
          </button>
        </div>
      </form>
    </div>
  );
}
