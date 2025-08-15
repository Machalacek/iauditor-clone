// src/pages/NewInspection.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// Helper: Check if all required questions are answered
function allRequiredAnswered(pages, answers) {
  for (const page of pages) {
    const sections = page.sections || [];
    for (const section of sections) {
      const qs = section.questions || [];
      for (const q of qs) {
        if (q.required && (answers[String(q.id)] === "" || answers[String(q.id)] == null)) {
          return false;
        }
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
        const data = await api.get(`/templates/${templateId}`);
        setTemplate(data);
        // Initialize empty answers for all questions (pages -> sections -> questions)
        const init = {};
        (data.pages || []).forEach(page => {
          (page.sections || []).forEach(sec => {
            (sec.questions || []).forEach(q => {
              init[String(q.id)] = "";
            });
          });
        });
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

  const pages = template.pages || [];
  const page = pages[pageIdx] || { sections: [] };
  const questionsOnPage = (page.sections || []).flatMap(sec => sec.questions || []);

  // Render a single question
  function renderQuestion(q) {
    const key = String(q.id);
    const val = answers[key] ?? "";
    const qType = q.type || q.questionType || "text";

    // Basic mapping to keep things working with your current structure
    if (qType.includes("date")) {
      return (
        <input
          type="date"
          value={val}
          required={q.required}
          className="w-full border p-2 rounded"
          onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
        />
      );
    }

    switch (qType) {
      case "short-text":
      case "text":
      case "site":
      case "person":
      case "inspection_location":
        return (
          <input
            type="text"
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
          />
        );
      case "paragraph":
        return (
          <textarea
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
          />
        );
      case "checkbox":
        return (
          <input
            type="checkbox"
            checked={!!val}
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.checked }))}
          />
        );
      case "number":
        return (
          <input
            type="number"
            value={val}
            required={q.required}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
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
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
          />
        );
      case "multiple-choice":
      case "dropdown":
        return (
          <select
            value={val}
            className="w-full border p-2 rounded"
            required={q.required}
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
          >
            <option value="">Select...</option>
            {(q.options || []).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return (
          <input
            type="text"
            value={val}
            className="w-full border p-2 rounded"
            onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
          />
        );
    }
  }


  async function handleSubmit(complete = false) {
    setSubmitting(true);
    try {
      const completeStatus =
        complete && allRequiredAnswered(pages, answers) ? "complete" : "incomplete";

      await api.post("/inspections", {
        templateId,
        templateName: pages[0]?.title || "Untitled",
        answers,
        status: completeStatus,
        createdAt: new Date().toISOString(),
      });

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
          {questionsOnPage.length === 0 ? (
            <div className="text-gray-400">No questions on this page.</div>
          ) : (
            questionsOnPage.map((q) => (
              <div key={q.id} className="mb-3">
                <label className="block font-medium mb-1">
                  {q.label || q.questionText || <em>Untitled question</em>}
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
