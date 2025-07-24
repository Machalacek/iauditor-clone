// src/components/GearDetail/GearImagesTab.jsx
import React from "react";

export default function GearImagesTab({ gear }) {
  // Placeholder: gear.images = [url]
  const images = gear.images || [];

  return (
    <div className="flex flex-wrap gap-4">
      {images.length === 0 ? (
        <div className="text-slate-400">No images uploaded.</div>
      ) : (
        images.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Equipment ${i + 1}`}
            className="w-32 h-32 object-cover rounded-lg border"
          />
        ))
      )}
    </div>
  );
}
