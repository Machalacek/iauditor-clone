// src/pages/TemplateBuilder.js
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Question from '../Question';
import { v4 as uuidv4 } from 'uuid';
import './TemplateBuilder.css';

const UNIQUE_QUESTION_TYPES = [
  { type: 'project', label: 'Project' },
  { type: 'technician', label: 'Technician' },
  { type: 'documentNumber', label: 'Document Number' },
  { type: 'dateTime', label: 'Date and Time' },
  { type: 'location', label: 'Location' },
];

const OTHER_QUESTION_TYPES = [
  { type: 'short-text', label: 'Short Text' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'number', label: 'Number' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'media', label: 'Media' },
  { type: 'slider', label: 'Slider' },
  { type: 'annotation', label: 'Annotation' },
  { type: 'signature', label: 'Signature' },
  { type: 'multiple-choice', label: 'Multiple Choice' },
  { type: 'instructions', label: 'Instructions' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'custom-yesno', label: 'Custom Yes/No' },
];

export default function TemplateBuilder({ templateId, onBack }) {
  const [pages, setPages] = useState([{ id: uuidv4(), name: 'Page 1', questions: [] }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch template by ID if editing existing
  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    setError(null);
    fetch(`http://localhost:4000/templates/${templateId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load template');
        return res.json();
      })
      .then((data) => {
        setPages(data.pages.length ? data.pages : [{ id: uuidv4(), name: 'Page 1', questions: [] }]);
        setCurrentPageIndex(0);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [templateId]);

  const currentPage = pages[currentPageIndex];

  const isUniqueQuestionUsed = (type) =>
    currentPage.questions.some((q) => q.questionType === type);

  const handleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    if (
      (source.droppableId === 'questionBank' || source.droppableId === 'questionBank2') &&
      destination.droppableId === 'formBuilder'
    ) {
      if (UNIQUE_QUESTION_TYPES.some((uq) => uq.type === draggableId) && isUniqueQuestionUsed(draggableId)) {
        alert(`The unique question "${draggableId}" is already added on this page.`);
        return;
      }
      const newQuestion = {
        id: uuidv4(),
        questionType: draggableId,
        questionText: '',
        answerText: '',
        options: [],
        required: false,
        sliderMin: 0,
        sliderMax: 10,
        sliderStep: 1,
      };
      const newQuestions = [...currentPage.questions];
      newQuestions.splice(destination.index, 0, newQuestion);

      const newPages = [...pages];
      newPages[currentPageIndex] = {
        ...currentPage,
        questions: newQuestions,
      };
      setPages(newPages);
      return;
    }

    if (source.droppableId === 'formBuilder' && destination.droppableId === 'formBuilder') {
      const reordered = Array.from(currentPage.questions);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);

      const newPages = [...pages];
      newPages[currentPageIndex] = {
        ...currentPage,
        questions: reordered,
      };
      setPages(newPages);
    }
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...currentPage.questions];
    newQuestions[index][field] = value;
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      questions: newQuestions,
    };
    setPages(newPages);
  };

  const updateOptions = (index, newOptions) => {
    const newQuestions = [...currentPage.questions];
    newQuestions[index].options = newOptions;
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      questions: newQuestions,
    };
    setPages(newPages);
  };

  const deleteQuestion = (index) => {
    const newQuestions = [...currentPage.questions];
    newQuestions.splice(index, 1);
    const newPages = [...pages];
    newPages[currentPageIndex] = {
      ...currentPage,
      questions: newQuestions,
    };
    setPages(newPages);
  };

  const addPage = () => {
    const newPage = {
      id: uuidv4(),
      name: `Page ${pages.length + 1}`,
      questions: [],
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const deletePage = (index) => {
    if (pages.length === 1) {
      alert("Can't delete the last page.");
      return;
    }

    const newPages = [...pages];
    newPages.splice(index, 1);

    let newCurrentIndex = currentPageIndex;
    if (currentPageIndex >= newPages.length) {
      newCurrentIndex = newPages.length - 1;
    }

    setPages(newPages);
    setCurrentPageIndex(newCurrentIndex);
  };

  const saveTemplate = async () => {
    setLoading(true);
    setError(null);

    try {
      const method = templateId ? 'PUT' : 'POST';
      const url = templateId
        ? `http://localhost:4000/templates/${templateId}`
        : 'http://localhost:4000/templates';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pages }),
      });

      if (!res.ok) throw new Error('Failed to save template');

      const savedTemplate = await res.json();
      alert('Template saved!');
      if (!templateId) {
        // Redirect to edit new template or reload
        window.location.href = `/template-builder/${savedTemplate.id}`;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="template-builder-container">
        <div className="question-bank">
          <h3>Unique Question Types</h3>
          <Droppable droppableId="questionBank" isDropDisabled={true}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="unique-question-list"
              >
                {UNIQUE_QUESTION_TYPES.map((q, index) => {
                  const isDisabled = isUniqueQuestionUsed(q.type);
                  return (
                    <Draggable
                      key={q.type}
                      draggableId={q.type}
                      index={index}
                      isDragDisabled={isDisabled}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`unique-question ${isDisabled ? 'disabled' : ''}`}
                          title={isDisabled ? 'Already added to template' : ''}
                        >
                          {q.label}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <h3>Other Question Types</h3>
          <Droppable droppableId="questionBank2" isDropDisabled={true}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="other-question-list"
              >
                {OTHER_QUESTION_TYPES.map((q, index) => (
                  <Draggable key={q.type} draggableId={q.type} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="other-question"
                      >
                        {q.label}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className="builder-area">
          <div className="builder-topbar">
            <div className="pages-container">
              {pages.map((page, i) => (
                <button
                  key={page.id}
                  className={`page-tab ${i === currentPageIndex ? 'active' : ''}`}
                  onClick={() => setCurrentPageIndex(i)}
                  title={page.name}
                >
                  {page.name}
                </button>
              ))}
              <button className="add-page-btn" onClick={addPage}>
                + Add Page
              </button>
            </div>

            <button className="save-template-btn" onClick={saveTemplate}>
              Save Template
            </button>
          </div>

          <Droppable droppableId="formBuilder">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="form-builder-drop-area"
              >
                {currentPage.questions.length === 0 && (
                  <p className="empty-builder-text">Drag questions here to build your template</p>
                )}
                {currentPage.questions.map((q, index) => (
                  <Draggable key={q.id} draggableId={q.id} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="builder-question"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Question
                            questionText={q.questionText}
                            answerText={q.answerText}
                            questionType={q.questionType}
                            options={q.options}
                            required={q.required}
                            sliderMin={q.sliderMin}
                            sliderMax={q.sliderMax}
                            sliderStep={q.sliderStep}
                            onQuestionChange={(val) => updateQuestion(index, 'questionText', val)}
                            onAnswerChange={(val) => updateQuestion(index, 'answerText', val)}
                            onOptionsChange={(opts) => updateOptions(index, opts)}
                            onRequiredChange={(val) => updateQuestion(index, 'required', val)}
                            onSliderChange={(val) => updateQuestion(index, 'answerText', val)}
                          />
                        </div>
                        <div className="delete-button-container">
                          <button
                            className="btn-delete-question"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestion(index);
                            }}
                            title="Delete question"
                            aria-label="Delete question"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              width="20px"
                              height="20px"
                            >
                              <path d="M3 6h18v2H3V6zm2 3h14l-1.5 12.5a1 1 0 01-1 .5H7a1 1 0 01-1-.5L4 9zm5 2v7h2v-7H9zm4 0v7h2v-7h-2zM10 4V3a2 2 0 114 0v1h5v2H5V4h5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </DragDropContext>
  );
}
