// src/components/Toolbar.jsx
import { useNavigate } from "react-router-dom";
import React from "react";

const ACCESS_OPTIONS = [
  { value: "admin", label: "Admin only" },
  { value: "manager", label: "Admin & Manager" },
  { value: "all", label: "All users" }
];

export default function Toolbar({
  undo, redo, canUndo, canRedo, onPublish,
  access, setAccess,
  previewVisible = true,
  onTogglePreview
}) {
  const navigate = useNavigate();

  return (
    <nav className="toolbar">
      {/* Back */}
      <button className="toolbar-btn" onClick={() => navigate(-1)}>◀ Back</button>

      {/* Undo / Redo */}
      <button
        className="toolbar-btn"
        onClick={undo}
        disabled={!canUndo}
        title="Undo"
        aria-label="Undo"
      >
        ⟲ Undo
      </button>
      <button
        className="toolbar-btn"
        onClick={redo}
        disabled={!canRedo}
        title="Redo"
        aria-label="Redo"
      >
        ⟳ Redo
      </button>

      {/* Access dropdown */}
      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        Access:
        <select
          value={access}
          onChange={(e) => setAccess?.(e.target.value)}
          className="toolbar-btn"
          style={{ padding: "6px 10px" }}
        >
          {ACCESS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </label>

      {/* Toggle preview */}
      <button
        className="toolbar-btn"
        onClick={onTogglePreview}
        aria-pressed={previewVisible}
        title={previewVisible ? "Hide mobile preview" : "Show mobile preview"}
      >
        {previewVisible ? "Hide mobile preview" : "Show mobile preview"}
      </button>

      <div className="toolbar-spacer" />

      <span className="toolbar-status">Unpublished changes saved</span>

      <button
        className="toolbar-btn primary"
        onClick={() => onPublish?.()}
      >
        Publish
      </button>
    </nav>
  );
}
