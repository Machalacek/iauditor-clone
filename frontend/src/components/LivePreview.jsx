// src/components/LivePreview.jsx
import React from "react";

// Helper component to render input preview based on question type
function QuestionPreview({ type }) {
  switch (type) {
    case "short_text":
      return <input style={{ width: "80%", padding: 4 }} placeholder="Short answer..." disabled />;
    case "paragraph":
      return <textarea style={{ width: "80%", minHeight: 48, padding: 4 }} placeholder="Paragraph..." disabled />;
    case "multiple_choice":
      return (
        <div>
          <input type="radio" disabled /> Option 1 &nbsp;
          <input type="radio" disabled /> Option 2
        </div>
      );
    case "checkbox":
      return (
        <div>
          <input type="checkbox" disabled /> Option A &nbsp;
          <input type="checkbox" disabled /> Option B
        </div>
      );
    case "date":
      return <input type="date" disabled />;
    case "signature":
      return (
        <div
          style={{
            border: "1px dashed #aaa",
            width: 120,
            height: 36,
            borderRadius: 6,
            margin: "5px 0",
            textAlign: "center",
            color: "#888",
            fontStyle: "italic",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          Signature
        </div>
      );
    case "media":
      return (
        <button
          style={{
            border: "1px solid #ccc",
            background: "#fafafa",
            borderRadius: 8,
            padding: "6px 10px",
            color: "#444",
            fontSize: 14
          }}
          disabled
        >
          📷 Upload photo
        </button>
      );
    case "slider":
      return <input type="range" min={0} max={10} step={1} style={{ width: 110 }} disabled />;
    case "site":
    case "person":
    case "location":
      return <input style={{ width: "80%", padding: 4 }} placeholder={`Pick ${type}`} disabled />;
    case "annotation":
      return (
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 6,
            width: 60,
            height: 40,
            margin: "6px 0",
            background: "#eee",
            textAlign: "center",
            color: "#888",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          Annotation
        </div>
      );
    case "document-number":
      return <input style={{ width: "60%", padding: 4 }} placeholder="Document #" disabled />;
    case "instruction":
      return (
        <div
          style={{
            color: "#1976d2",
            background: "#e7f0fd",
            padding: 6,
            borderRadius: 6,
            fontStyle: "italic",
            fontSize: 14
          }}
        >
          Instruction text goes here
        </div>
      );
    default:
      return <span style={{ color: "#bbb" }}>{type}</span>;
  }
}

export default function LivePreview({ sections, className = "" }) {
  return (
    <aside className={`preview-pane ${className}`}>
      <div className="iphone-mockup">
        <div style={{ height: 28 }} />
        <div className="question-preview-list">
          {sections.flatMap((section) =>
            section.questions.map((q) => (
              <div key={q.id} style={{ marginBottom: 12 }}>
                <b>{q.label}</b>
                {q.required && <span style={{ color: "#d32f2f" }}> *</span>}
                <br />
                <QuestionPreview type={q.type} />
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
