import React, { useRef } from "react";
import { useBuilderStore } from "../store/builderStore";

export default function BuilderHeader() {
  const { meta, setMeta } = useBuilderStore();
  const fileInputRef = useRef(null);

  function handleLogoChange(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setMeta({ logo: evt.target.result }); // Save base64 string
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="builder-header">
      <div
        className="logo-uploader"
        title="Upload logo"
        onClick={() => fileInputRef.current.click()}
        style={{ cursor: "pointer" }}
      >
        {meta.logo
          ? <img src={meta.logo} alt="logo" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 12 }} />
          : <span role="img" aria-label="upload" style={{ fontSize: 32 }}>🖼️</span>
        }
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          ref={fileInputRef}
          onChange={handleLogoChange}
        />
      </div>
      <div className="builder-header-texts">
        <input
          className="template-title"
          value={meta.title}
          onChange={e => setMeta({ title: e.target.value })}
          placeholder="Untitled template"
        />
        <input
          className="template-description"
          value={meta.description}
          onChange={e => setMeta({ description: e.target.value })}
          placeholder="Add a description"
        />
      </div>
    </div>
  );
}
