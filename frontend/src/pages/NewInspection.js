// src/pages/NewInspection.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Helper: Check if all required questions are answered
function allRequiredAnswered(pages, answers) {
  for (const page of pages) {
    for (const question of page.questions) {
      if (question.required && !answers[question.id]) {
        return false;
      }
    }
  }
  return true;
}

export default function NewInspection() {
  const { templateId } = useParams();
  const [template, setTemplate] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [pageIdx, setPageIdx] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchTemplate() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:4000/templates/${templateId}`);
        if (!res.ok) throw new Error("Template not found");
        const data = await res.json();
        setTemplate(data);
        // Initialize empty answers for all questions
        const init = {};
        data.pages.forEach(page =>
          page.questions.forEach(q => {
            init[q.id] = "";
          })
        );
        setAnswers(init);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [templateId]);

  if (loading) return <div>Loading template...</div>;
  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!template) return null;

  const pages = template.pages;
  const page = pages[pageIdx];

  // Render a single question
  function renderQuestion(q) {
    const val = answers[q.id] || "";
    switch (q.questionType) {
      case "short-text":
        return (
          <input
            type="text"
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          />
        );
      case "paragraph":
        return (
          <textarea
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          />
        );
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.checked }))}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          />
        );
      case "slider":
        return (
          <input
            type="range"
            min={q.sliderMin || 0}
            max={q.sliderMax || 10}
            step={q.sliderStep || 1}
            value={val || q.sliderMin || 0}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          />
        );
      case "multiple-choice":
        return (
          <select
            value={val}
            className="w-full border p-2 rounded"
            required={q.required}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          >
            <option value="">Select...</option>
            {q.options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case "dropdown":
        return (
          <select
            value={val}
            className="w-full border p-2 rounded"
            required={q.required}
            onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
          >
            <option value="">Select...</option>
            {q.options.map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      // Add other question types here as needed...
      default:
        return <input
          type="text"
          value={val}
          onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
        />;
    }
  }

  async function handleSubmit(complete = false) {
    setSubmitting(true);
    try {
      const completeStatus =
        complete && allRequiredAnswered(pages, answers) ? "complete" : "incomplete";
      // Save to backend
      const res = await fetch("http://localhost:4000/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          templateName: pages[0]?.name || "Untitled",
          answers,
          status: completeStatus,
          createdAt: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to save inspection");
      navigate("/inspections");
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white p-6 rounded-xl shadow my-8">
      <h2 className="font-bold text-xl mb-3">Inspection: {pages[0]?.name || "Untitled"}</h2>
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold text-gray-700 text-lg">
            Page {pageIdx + 1} of {pages.length}
          </span>
          {pages.length > 1 && (
            <div className="space-x-2">
              <button
                className="px-3 py-1 rounded bg-gray-100 mr-2"
                disabled={pageIdx === 0}
                onClick={() => setPageIdx(i => i - 1)}
              >Previous</button>
              <button
                className="px-3 py-1 rounded bg-gray-100"
                disabled={pageIdx === pages.length - 1}
                onClick={() => setPageIdx(i => i + 1)}
              >Next</button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-6">
          {page.questions.length === 0 ? (
            <div className="text-gray-400">No questions on this page.</div>
          ) : (
            page.questions.map((q, i) => (
              <div key={q.id} className="mb-3">
                <label className="block font-medium mb-1">
                  {q.questionText || <em>Untitled question</em>}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderQuestion(q)}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <button
          className="px-5 py-2 bg-gray-300 rounded font-bold"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
        >
          Save (Incomplete)
        </button>
        <button
          className="px-5 py-2 bg-blue-600 text-white rounded font-bold"
          onClick={() => handleSubmit(true)}
          disabled={submitting}
        >
          Complete Inspection
        </button>
        <button
          className="px-5 py-2 bg-gray-100 rounded"
          onClick={() => navigate("/inspections")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
