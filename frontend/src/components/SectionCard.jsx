// src/components/SectionCard.jsx
import React from "react";
import QuestionRow from "./QuestionRow";
import { Trash2, GripVertical } from "lucide-react";
import { useBuilderStore } from "../store/builderStore";
import { Droppable, Draggable } from "@hello-pangea/dnd";

export default function SectionCard({ section, dragHandleProps }) {
  // Always fetch the latest section from Zustand, not just the prop!
  const currentSection = useBuilderStore(
    React.useCallback(
      state => state.sections.find(s => s.id === section.id),
      [section.id]
    )
  );

  const {
    renameSection,
    deleteSection,
    addQuestion,
    setSectionDescription,
  } = useBuilderStore();

  if (!currentSection) return null; // Section might be deleted

  return (
    <section className="section-card">
      <div className="section-header" style={{ gap: 12 }}>
        <span className="drag-handle" {...dragHandleProps}>
          <GripVertical size={20} />
        </span>
        <input
          className="section-title"
          value={currentSection.title}
          onChange={e => renameSection(currentSection.id, e.target.value)}
          style={{ width: 230, fontWeight: 600, fontSize: 18 }}
        />
        <button
          className="icon-btn"
          title="Delete Section"
          onClick={() => deleteSection(currentSection.id)}
        >
          <Trash2 size={18} />
        </button>
      </div>
      <input
        className="section-desc"
        value={currentSection.description || ""}
        onChange={e => setSectionDescription(currentSection.id, e.target.value)}
        placeholder="Add a section description"
        style={{ width: "100%" }}
      />
      <Droppable droppableId={`questions-${currentSection.id}`} type="questions">
        {provided => (
          <div
            className="section-questions"
            ref={provided.innerRef}
            {...provided.droppableProps}
          >
            {currentSection.questions.map((q, idx) => (
              <Draggable
                key={q.id}
                draggableId={q.id}
                index={idx}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    style={{
                      ...provided.draggableProps.style,
                      marginBottom: 10,
                    }}
                  >
                    <QuestionRow
                      question={q}
                      sectionId={currentSection.id}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
      <button
        className="add-question-btn"
        onClick={() => addQuestion(currentSection.id)}
      >
        + Add Question
      </button>
    </section>
  );
}
