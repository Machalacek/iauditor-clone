// src/components/LogoUploader.jsx
import React from "react";
export default function LogoUploader() {
  return (
    <div className="logo-uploader">
      <input type="file" id="logo-upload" style={{ display: "none" }} />
      <label htmlFor="logo-upload" className="logo-placeholder" title="Upload logo">
        <span role="img" aria-label="upload" style={{ fontSize: 32 }}>🖼️</span>
      </label>
    </div>
  );
}
