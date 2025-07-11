// Question.js
import React from 'react';

export default function Question({
  questionText,
  answerText,
  questionType,
  options,
  required,
  sliderMin = 0,
  sliderMax = 10,
  sliderStep = 1,
  onQuestionChange,
  onAnswerChange,
  onOptionsChange,
  onRequiredChange,
}) {
  // Handle adding/removing options for multiple choice, checkboxes, dropdown, custom yes/no
  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onOptionsChange(newOptions);
  };

  const addOption = () => {
    onOptionsChange([...options, '']);
  };

  const removeOption = (index) => {
    const newOptions = [...options];
    newOptions.splice(index, 1);
    onOptionsChange(newOptions);
  };

  // Render input based on questionType
  const renderAnswerInput = () => {
    switch (questionType) {
      case 'short-text':
        return (
          <input
            type="text"
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            style={styles.input}
            required={required}
            placeholder="Short text answer"
          />
        );

      case 'paragraph':
        return (
          <textarea
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            style={{ ...styles.input, height: 80, resize: 'vertical' }}
            required={required}
            placeholder="Paragraph answer"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            style={styles.input}
            required={required}
            placeholder="Enter a number"
          />
        );

      case 'checkbox':
        return (
          <label style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
            <input
              type="checkbox"
              checked={answerText === 'true'}
              onChange={(e) => onAnswerChange(e.target.checked ? 'true' : 'false')}
              style={{ marginRight: 10, width: 24, height: 24 }}
            />
            {required && <span style={{ color: 'red', marginLeft: 6 }}>*</span>}
          </label>
        );

      case 'media':
        return (
          <div style={{ marginTop: 8 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onAnswerChange(e.target.files[0])}
              style={{ width: '100%' }}
            />
            {required && <span style={{ color: 'red' }}>* Required</span>}
          </div>
        );

      case 'slider':
        return (
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={sliderStep}
            value={answerText || sliderMin}
            onChange={(e) => onAnswerChange(e.target.value)}
            style={{ width: '100%', marginTop: 12 }}
          />
        );

      case 'annotation':
        return (
          <div style={{ marginTop: 8 }}>
            {/* Placeholder for annotation component */}
            <textarea
              readOnly
              value="Annotation area (drawing functionality to be implemented)"
              style={{ ...styles.input, height: 100, fontStyle: 'italic', color: '#666' }}
            />
          </div>
        );

      case 'signature':
        return (
          <div style={{ marginTop: 8 }}>
            {/* Placeholder for signature pad */}
            <textarea
              readOnly
              value="Signature pad (to be implemented)"
              style={{ ...styles.input, height: 100, fontStyle: 'italic', color: '#666' }}
            />
          </div>
        );

      case 'multiple-choice':
      case 'dropdown':
      case 'custom-yesno':
        return (
          <div style={{ marginTop: 8 }}>
            {options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <input
                  type={questionType === 'multiple-choice' ? 'radio' : 'checkbox'}
                  name="mc"
                  value={opt}
                  disabled
                  style={{ marginRight: 8, width: 20, height: 20 }}
                />
                <span style={{ flex: 1 }}>{opt || '(empty option)'}</span>
                {/* Disable editing actual answer here, just showing options */}
              </div>
            ))}

            {/* Options editing only if question is in builder */}
            <button
              type="button"
              onClick={addOption}
              style={styles.smallButton}
              aria-label="Add option"
            >
              + Add Option
            </button>
            {options.length > 0 && (
              <button
                type="button"
                onClick={() => removeOption(options.length - 1)}
                style={{ ...styles.smallButton, marginLeft: 8 }}
                aria-label="Remove last option"
              >
                - Remove Option
              </button>
            )}
          </div>
        );

      case 'instructions':
        return (
          <div
            style={{
              marginTop: 8,
              fontWeight: 'bold',
              backgroundColor: '#fffbea',
              padding: 10,
              borderRadius: 4,
              whiteSpace: 'pre-wrap',
            }}
          >
            {questionText || 'Instruction text here...'}
          </div>
        );

      case 'project':
      case 'technician':
      case 'documentNumber':
      case 'dateTime':
      case 'location':
        return (
          <input
            type="text"
            value={answerText}
            onChange={(e) => onAnswerChange(e.target.value)}
            style={styles.input}
            required={required}
            placeholder={questionType}
            disabled
          />
        );

      default:
        return <div style={{ marginTop: 8 }}>Unsupported question type</div>;
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        value={questionText}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder="Enter question text"
        style={styles.input}
      />

      <label style={{ display: 'flex', alignItems: 'center', marginTop: 6, userSelect: 'none' }}>
        <input
          type="checkbox"
          checked={required}
          onChange={(e) => onRequiredChange(e.target.checked)}
          style={{ marginRight: 8, width: 18, height: 18 }}
        />
        Required
      </label>

      {renderAnswerInput()}
    </div>
  );
}

const styles = {
  input: {
    width: '100%',
    padding: 8,
    marginTop: 8,
    boxSizing: 'border-box',
    fontSize: 16,
    borderRadius: 4,
    border: '1px solid #ccc',
  },
  smallButton: {
    padding: '4px 8px',
    fontSize: 14,
    cursor: 'pointer',
    borderRadius: 4,
    border: '1px solid #aaa',
    backgroundColor: '#f0f0f0',
  },
};
