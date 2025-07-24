// src/components/GearDetail/GearDocumentsTab.jsx
import React from "react";

export default function GearDocumentsTab({ gear }) {
  // Placeholder: gear.documents = [{name, url}]
  const docs = gear.documents || [];

  return (
    <div>
      {docs.length === 0 ? (
        <div className="text-slate-400">No documents uploaded.</div>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc, i) => (
            <li key={i}>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {doc.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
