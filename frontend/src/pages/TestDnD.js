import React from "react";
import { create } from "zustand";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// This store ONLY exists for this page
const useTestStore = create((set) => ({
  items: [
    { id: "1", text: "First" },
    { id: "2", text: "Second" },
    { id: "3", text: "Third" }
  ],
  setItems: (items) => set({ items })
}));

export default function TestDnD() {
  const { items, setItems } = useTestStore();

  function onDragEnd(result) {
    if (!result.destination) return;
    const arr = Array.from(items);
    const [removed] = arr.splice(result.source.index, 1);
    arr.splice(result.destination.index, 0, removed);
    setItems(arr);
  }

  return (
    <div style={{ maxWidth: 400, margin: "60px auto" }}>
      <h2>Minimal Zustand DnD Test</h2>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="droppable">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((item, idx) => (
                <Draggable key={item.id} draggableId={item.id} index={idx}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        ...provided.draggableProps.style,
                        border: "1px solid #888",
                        margin: 8,
                        padding: 16,
                        borderRadius: 8,
                        background: "#fff"
                      }}
                    >
                      {item.text}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
