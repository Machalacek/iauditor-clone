// src/pages/FillInspection.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function FillInspection() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/templates/${templateId}`)
      .then(r => r.json())
      .then(data => {
        setTemplate(data.pages[0]);
        // Prepopulate answer structure
        const ans = {};
        data.pages[0].sections.forEach(section =>
          section.questions.forEach(q => {
            ans[q.id] = "";
          })
        );
        setAnswers(ans);
      });
  }, [templateId]);

  function handleChange(qid, val) {
    setAnswers(a => ({ ...a, [qid]: val }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const resp = await fetch("/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          templateName: template.title,
          answers,
          status: "completed"
        }),
      });
      if (!resp.ok) throw new Error("Failed to save inspection");
      alert("Inspection saved!");
      navigate("/inspections");
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!template) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", background: "#fff", borderRadius: 16, boxShadow: "0 4px 32px #0002", padding: 24 }}>
      <div style={{ display: "flex", gap: 18, alignItems: "center", marginBottom: 24 }}>
        {template.logo && <img src={template.logo} alt="logo" style={{ width: 54, height: 54, borderRadius: 12, objectFit: "contain" }} />}
        <div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{template.title}</div>
          <div style={{ color: "#888", fontSize: 16 }}>{template.description}</div>
        </div>
      </div>
      {template.sections.map(section => (
        <div key={section.id} style={{ marginBottom: 34 }}>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 7 }}>{section.title}</div>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 6 }}>{section.description}</div>
          {section.questions.map(q => (
            <div key={q.id} style={{ marginBottom: 18 }}>
              <label style={{ fontWeight: 500 }}>{q.label}{q.required && <span style={{ color: "#d32f2f" }}> *</span>}</label>
              <br />
              <QuestionInput q={q} val={answers[q.id]} setVal={v => handleChange(q.id, v)} />
            </div>
          ))}
        </div>
      ))}
      <button
        disabled={saving}
        style={{
          marginTop: 16,
          background: "#1976d2",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "12px 30px",
          fontWeight: 700,
          fontSize: 18,
          cursor: saving ? "not-allowed" : "pointer"
        }}
        onClick={handleSave}
      >
        {saving ? "Saving..." : "Save Inspection"}
      </button>
    </div>
  );
}

function QuestionInput({ q, val, setVal }) {
  switch (q.type) {
    case "short_text":
      return <input value={val} onChange={e => setVal(e.target.value)} style={{ width: "85%", padding: 6 }} />;
    case "paragraph":
      return <textarea value={val} onChange={e => setVal(e.target.value)} style={{ width: "85%", minHeight: 50, padding: 6 }} />;
    case "multiple_choice":
      // Example: 2 static options for demo
      return (
        <div>
          <label><input type="radio" name={q.id} checked={val === "Option 1"} onChange={() => setVal("Option 1")} /> Option 1</label>
          &nbsp;&nbsp;
          <label><input type="radio" name={q.id} checked={val === "Option 2"} onChange={() => setVal("Option 2")} /> Option 2</label>
        </div>
      );
    case "checkbox":
      // Example: 2 options as array
      return (
        <div>
          <label>
            <input
              type="checkbox"
              checked={Array.isArray(val) && val.includes("A")}
              onChange={e => {
                if (e.target.checked) setVal([...(val || []), "A"]);
                else setVal((val || []).filter(v => v !== "A"));
              }}
            /> Option A
          </label>
          &nbsp;&nbsp;
          <label>
            <input
              type="checkbox"
              checked={Array.isArray(val) && val.includes("B")}
              onChange={e => {
                if (e.target.checked) setVal([...(val || []), "B"]);
                else setVal((val || []).filter(v => v !== "B"));
              }}
            /> Option B
          </label>
        </div>
      );
    case "date":
      return <input type="date" value={val} onChange={e => setVal(e.target.value)} />;
    case "signature":
      return <input type="text" placeholder="Sign (type name)" value={val} onChange={e => setVal(e.target.value)} />;
    case "media":
      return <input type="file" disabled />; // For demo only; can expand to upload logic!
    case "slider":
      return <input type="range" min={0} max={10} step={1} value={val || 0} onChange={e => setVal(e.target.value)} />;
    case "site":
    case "person":
    case "location":
      return <input value={val} onChange={e => setVal(e.target.value)} style={{ width: "85%", padding: 6 }} />;
    case "annotation":
      return <textarea value={val} onChange={e => setVal(e.target.value)} placeholder="Annotation..." style={{ width: "80%" }} />;
    case "document-number":
      return <input value={val} onChange={e => setVal(e.target.value)} placeholder="Document #" />;
    case "instruction":
      return <div style={{ color: "#1976d2", background: "#e7f0fd", padding: 6, borderRadius: 5, fontStyle: "italic", fontSize: 14 }}>Instruction: {q.label}</div>;
    default:
      return <input value={val} onChange={e => setVal(e.target.value)} />;
  }
}
