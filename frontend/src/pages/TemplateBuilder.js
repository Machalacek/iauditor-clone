// src/pages/TemplateBuilder.js
import React, { useEffect, useState } from "react";
import Toolbar from "../components/Toolbar";
import BuilderHeader from "../components/BuilderHeader";
import SectionCard from "../components/SectionCard";
import LivePreview from "../components/LivePreview";
import { useBuilderStore } from "../store/builderStore";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import "../styles/TemplateBuilder.css";

export default function TemplateBuilder() {
  const sections = useBuilderStore((s) => s.sections);
  const meta = useBuilderStore((s) => s.meta);
  const setSections = useBuilderStore((s) => s.setSections);
  const setMeta = useBuilderStore((s) => s.setMeta);
  const addSection = useBuilderStore((s) => s.addSection);
  const undo = useBuilderStore((s) => s.undo);
  const redo = useBuilderStore((s) => s.redo);
  const history = useBuilderStore((s) => s.history);
  const future = useBuilderStore((s) => s.future);
  const resetStore = useBuilderStore((s) => s.resetStore);

  const access = meta.access || "all";
  const setAccess = (newAccess) => setMeta({ access: newAccess });

  const { templateId } = useParams();
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(true);

  // If no templateId, start a brand-new template
  useEffect(() => {
    if (!templateId || templateId === "undefined" || templateId === "null") {
      resetStore();
    }
  }, [templateId, resetStore]);

  // Load existing template for editing
  useEffect(() => {
    (async () => {
      try {
        if (!templateId || templateId === "undefined" || templateId === "null") return;
        const data = await api.get(`/templates/${templateId}`);
        if (!data) throw new Error("Template not found");

        const firstPage =
          Array.isArray(data.pages) && data.pages.length > 0 ? data.pages[0] : {};

        const normalizedMeta = {
          title: data.title || firstPage.title || "Untitled Template",
          description: data.description || firstPage.description || "",
          logo: data.logo || firstPage.logo || null,
          access: data.access || "all",
        };
        setMeta(normalizedMeta);

        const normalizeIds = (arr) =>
          (arr || []).map((section) => ({
            ...section,
            id: String(section.id),
            questions: (section.questions || []).map((q) => ({
              ...q,
              id: String(q.id),
            })),
          }));

        const normalizedSections = normalizeIds(firstPage.sections || []);
        setSections(normalizedSections);
      } catch (err) {
        alert("Failed to load template for editing: " + err.message);
        navigate("/templates");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const handlePublish = async () => {
    try {
      if (!meta?.title || sections.length === 0) {
        alert("Template must have a title and at least one section.");
        return;
      }

      const payload = {
        title: meta.title,
        description: meta.description,
        logo: meta.logo,
        access,
        pages: [
          {
            title: meta.title,
            description: meta.description,
            logo: meta.logo,
            sections,
          },
        ],
      };

      if (templateId && !isNaN(Number(templateId))) {
        await api.put(`/templates/${templateId}`, payload);
        navigate("/templates", { state: { toast: "Template updated" } });
      } else {
        await api.post("/templates", payload);
        navigate("/templates", { state: { toast: "Template saved" } });
      }
    } catch (err) {
      alert("Publish failed: " + err.message);
    }
  };

  const onDragEnd = (result) => {
    if (!result || !result.destination) return;
    const latest = useBuilderStore.getState().sections;

    if (result.type === "section") {
      const reordered = Array.from(latest);
      const [moved] = reordered.splice(result.source.index, 1);
      reordered.splice(result.destination.index, 0, moved);
      useBuilderStore.getState().reorderSections(reordered);
      return;
    }

    if (result.type === "questions") {
      const fromSectionId = result.source.droppableId.replace("questions-", "");
      const toSectionId = result.destination.droppableId.replace("questions-", "");

      if (fromSectionId === toSectionId) {
        const section = latest.find((s) => s.id === fromSectionId);
        if (!section) return;
        const qs = Array.from(section.questions);
        const [moved] = qs.splice(result.source.index, 1);
        qs.splice(result.destination.index, 0, moved);
        useBuilderStore.getState().reorderQuestions(fromSectionId, qs);
        return;
      }

      useBuilderStore.getState().moveQuestion(
        fromSectionId,
        toSectionId,
        result.source.index,
        result.destination.index
      );
    }
  };

  return (
    <div className="template-builder-outer">
      <Toolbar
        undo={undo}
        redo={redo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
        onPublish={handlePublish}
        access={access}
        setAccess={setAccess}
        previewVisible={showPreview}
        onTogglePreview={() => setShowPreview((v) => !v)}
      />

      <div className="template-builder-main">
        <div className="builder-canvas">
          <BuilderHeader />

          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sections" type="section">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {sections.map((section, index) => (
                    <Draggable key={section.id} draggableId={section.id} index={index}>
                      {(provided2) => (
                        <div
                          ref={provided2.innerRef}
                          {...provided2.draggableProps}
                          style={{ marginBottom: 16, ...provided2.draggableProps.style }}
                        >
                          <SectionCard
                            section={section}
                            dragHandleProps={provided2.dragHandleProps}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          <button className="add-section-btn" onClick={addSection}>
            + Add Section
          </button>
        </div>

        {showPreview && <LivePreview sections={sections} />}
      </div>
    </div>
  );
}
