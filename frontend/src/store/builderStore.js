// src/store/builderStore.js
import { create } from "zustand";

const defaultMeta = {
  title: "Untitled Template",
  description: "",
  logo: null,
};

function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

const defaultSections = [
  {
    id: generateId(),
    title: "Title Page",
    description: "The Title Page is the first page of your inspection report. This section typically includes basic details.",
    questions: [
      { id: generateId(), label: "Site conducted", type: "site", required: true },
      { id: generateId(), label: "Conducted on", type: "date", required: false },
      { id: generateId(), label: "Prepared by", type: "person", required: false },
      { id: generateId(), label: "Location", type: "location", required: false },
    ],
  },
  {
    id: generateId(),
    title: "Untitled Section",
    description: "Add your inspection questions and how you want them answered.",
    questions: [
      { id: generateId(), label: "Signature", type: "signature", required: false },
    ],
  },
];

export const useBuilderStore = create((set, get) => ({
  meta: defaultMeta,
  sections: defaultSections,
  history: [],
  future: [],
    // --- Reset builder state to default (for new templates)
  resetStore: () => set(() => ({
    meta: defaultMeta,
    sections: defaultSections,
    history: [],
    future: [],
  })),
  // --- Set all sections at once (for loading a template)
  setSections: (sections) =>
    set((state) => ({
      ...pushToHistory(state),
      sections: Array.isArray(sections) ? sections : [],
    })),
  // --- Meta actions
  setMeta: (meta) =>
    set((state) => ({
      ...pushToHistory(state),
      meta: { ...state.meta, ...meta },
    })),

  // SECTION ACTIONS
  addSection: () => {
    const newSection = {
      id: generateId(),
      title: "Untitled Section",
      description: "",
      questions: [],
    };
    set((state) => {
      const sections = [...state.sections, newSection];
      return { ...pushToHistory(state), sections };
    });
  },
  renameSection: (sectionId, newTitle) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, title: newTitle } : s
      );
      return { ...pushToHistory(state), sections };
    });
  },
  deleteSection: (sectionId) => {
    set((state) => {
      const sections = state.sections.filter((s) => s.id !== sectionId);
      return { ...pushToHistory(state), sections };
    });
  },
  reorderSections: (newSections) => {
    set((state) => ({
      ...pushToHistory(state),
      sections: [...newSections],
    }));
  },
  setSectionDescription: (sectionId, newDesc) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, description: newDesc } : s
      );
      return { ...pushToHistory(state), sections };
    });
  },

  // QUESTION ACTIONS
  addQuestion: (sectionId) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: [
                ...s.questions,
                {
                  id: generateId(),
                  label: "Untitled Question",
                  type: "short_text",
                  required: false,
                },
              ],
            }
          : s
      );
      return { ...pushToHistory(state), sections };
    });
  },
  updateQuestion: (sectionId, questionId, changes) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              questions: s.questions.map((q) =>
                q.id === questionId ? { ...q, ...changes } : q
              ),
            }
          : s
      );
      return { ...pushToHistory(state), sections };
    });
  },
  deleteQuestion: (sectionId, questionId) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId
          ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
          : s
      );
      return { ...pushToHistory(state), sections };
    });
  },
  reorderQuestions: (sectionId, newQuestions) => {
    set((state) => {
      const sections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, questions: [...newQuestions] } : s
      );
      return { ...pushToHistory(state), sections };
    });
  },

  // UNDO/REDO
  undo: () => {
    set((state) => {
      if (!state.history.length) return {};
      const previous = state.history[state.history.length - 1];
      const newHistory = state.history.slice(0, -1);
      return {
        ...state,
        future: [state.sections, ...state.future],
        sections: previous,
        history: newHistory,
      };
    });
  },
  redo: () => {
    set((state) => {
      if (!state.future.length) return {};
      const [next, ...future] = state.future;
      return {
        ...state,
        history: [...state.history, state.sections],
        sections: next,
        future,
      };
    });
  },
}));

// Helper to push the current state to the history stack for undo/redo
function pushToHistory(state) {
  return {
    history: [...state.history, state.sections],
    future: [],
  };
}
