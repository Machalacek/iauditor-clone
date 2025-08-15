// src/components/QuestionRow.jsx
import React from "react";
import { Trash2, GripVertical } from "lucide-react";
import { useBuilderStore } from "../store/builderStore";

const QUESTION_TYPES = [
  { value: "short_text", label: "Short Text" },
  { value: "paragraph", label: "Paragraph" },
  { value: "multiple_choice", label: "Multiple Choice" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date", label: "Date" },
  { value: "signature", label: "Signature" },
  { value: "media", label: "Media Upload" },
  { value: "slider", label: "Slider" },
  { value: "site", label: "Site" },
  { value: "person", label: "Person" },
  { value: "location", label: "Location" },
  { value: "annotation", label: "Annotation" },
  { value: "document-number", label: "Document Number" },
  { value: "instruction", label: "Instruction" },
];

export default function QuestionRow({ question, sectionId, dragHandleProps }) {
  const { updateQuestion, deleteQuestion } = useBuilderStore();

  return (
    <div className="question-row">
      <span className="drag-handle" {...dragHandleProps}>
        <GripVertical size={18} />
      </span>
      <input
        className="question-label"
        value={question.label}
        onChange={(e) =>
          updateQuestion(sectionId, question.id, { label: e.target.value })
        }
      />
      <select
        className="question-type"
        value={question.type}
        onChange={(e) =>
          updateQuestion(sectionId, question.id, { type: e.target.value })
        }
      >
        {QUESTION_TYPES.map((qt) => (
          <option value={qt.value} key={qt.value}>
            {qt.label}
          </option>
        ))}
      </select>
      <label className="required-checkbox">
        <input
          type="checkbox"
          checked={question.required}
          onChange={() =>
            updateQuestion(sectionId, question.id, {
              required: !question.required,
            })
          }
        />{" "}
        Required
      </label>
      <button
        className="icon-btn"
        title="Delete Question"
        onClick={() => deleteQuestion(sectionId, question.id)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
