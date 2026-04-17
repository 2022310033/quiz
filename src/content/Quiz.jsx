import { useEffect, useState } from 'react'
import { extractTextFromPDF, parseQuestionsFromText } from '../utils/questionParser'
import {
  getAllSets,
  getQuestionsBySet,
  addQuestionToSet,
  updateQuestion,
  deleteQuestion,
  updateSetQuestionCount,
} from '../utils/setManager'

function Quiz() {
  const [status, setStatus] = useState('idle')
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [formError, setFormError] = useState('')
  const [questions, setQuestions] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    question: '',
    letterA: '',
    letterB: '',
    letterC: '',
    letterD: '',
    correctAnswer: 'A',
  })

  // Sets management
  const [sets, setSets] = useState([])
  const [selectedSetId, setSelectedSetId] = useState(null)
  const [setsLoading, setSetsLoading] = useState(true)

  const [uploadStatus, setUploadStatus] = useState('idle')
  const [uploadError, setUploadError] = useState('')
  const [previewQuestions, setPreviewQuestions] = useState([])
  const [uploadProgress, setUploadProgress] = useState(0)

  const loadSets = async () => {
    setSetsLoading(true)
    setError('')
    try {
      const data = await getAllSets()
      setSets(data)
      if (data.length > 0) {
        setSelectedSetId(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sets')
    } finally {
      setSetsLoading(false)
    }
  }

  const loadQuestions = async (setId) => {
    if (!setId) return
    
    setStatus('loading')
    setError('')

    try {
      const questions = await getQuestionsBySet(setId)
      setQuestions(questions)
      setCount(questions.length)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
      setStatus('error')
    }
  }

  useEffect(() => {
    loadSets()
  }, [])

  useEffect(() => {
    if (selectedSetId) {
      loadQuestions(selectedSetId)
    }
  }, [selectedSetId])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSaveStatus('loading')

    if (!selectedSetId) {
      setSaveStatus('error')
      setFormError('Please select a question set first.')
      return
    }

    const isValid =
      form.question.trim() &&
      form.letterA.trim() &&
      form.letterB.trim() &&
      form.letterC.trim() &&
      form.letterD.trim()

    if (!isValid) {
      setSaveStatus('error')
      setFormError('Please complete all fields.')
      return
    }

    try {
      if (editingId) {
        await updateQuestion(editingId, {
          question: form.question.trim(),
          letterA: form.letterA.trim(),
          letterB: form.letterB.trim(),
          letterC: form.letterC.trim(),
          letterD: form.letterD.trim(),
          correctAnswer: form.correctAnswer,
        })
      } else {
        await addQuestionToSet(selectedSetId, {
          question: form.question.trim(),
          letterA: form.letterA.trim(),
          letterB: form.letterB.trim(),
          letterC: form.letterC.trim(),
          letterD: form.letterD.trim(),
          correctAnswer: form.correctAnswer,
        })
      }

      setSaveStatus('success')
      setForm({
        question: '',
        letterA: '',
        letterB: '',
        letterC: '',
        letterD: '',
        correctAnswer: 'A',
      })
      setEditingId(null)
      await loadQuestions(selectedSetId)
    } catch (err) {
      setSaveStatus('error')
      setFormError(err instanceof Error ? err.message : 'Failed to save question.')
    }
  }

  const startEdit = (question) => {
    setEditingId(question.id)
    setForm({
      question: question.question ?? '',
      letterA: question.letterA ?? '',
      letterB: question.letterB ?? '',
      letterC: question.letterC ?? '',
      letterD: question.letterD ?? '',
      correctAnswer: question.correctAnswer ?? 'A',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({
      question: '',
      letterA: '',
      letterB: '',
      letterC: '',
      letterD: '',
      correctAnswer: 'A',
    })
  }

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Delete this question?')
    if (!confirmDelete) return

    try {
      await deleteQuestion(id, selectedSetId)
      await loadQuestions(selectedSetId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete question.')
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadStatus('loading')
    setUploadError('')
    setPreviewQuestions([])

    try {
      let text = ''

      if (file.type === 'application/pdf') {
        text = await extractTextFromPDF(file)
      } else {
        text = await file.text()
      }

      const parsed = parseQuestionsFromText(text)

      if (parsed.length === 0) {
        setUploadError('No valid questions found. Check the format.')
        setUploadStatus('idle')
        return
      }

      setPreviewQuestions(parsed)
      setUploadStatus('preview')
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse file.')
      setUploadStatus('idle')
    }
  }

  const handleBulkUpload = async () => {
    if (!selectedSetId) {
      setUploadError('Please select a question set first.')
      return
    }

    setUploadStatus('uploading')
    setUploadError('')
    setUploadProgress(0)

    try {
      for (let i = 0; i < previewQuestions.length; i++) {
        const q = previewQuestions[i]
        await addQuestionToSet(selectedSetId, {
          question: q.question.trim(),
          letterA: q.letterA.trim(),
          letterB: q.letterB.trim(),
          letterC: q.letterC.trim(),
          letterD: q.letterD.trim(),
          correctAnswer: q.correctAnswer,
        })
        setUploadProgress(((i + 1) / previewQuestions.length) * 100)
      }

      setUploadStatus('success')
      setPreviewQuestions([])
      await loadQuestions(selectedSetId)

      setTimeout(() => {
        setUploadStatus('idle')
      }, 2000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload questions.')
      setUploadStatus('idle')
    }
  }

  const cancelUpload = () => {
    setPreviewQuestions([])
    setUploadStatus('idle')
    setUploadError('')
  }

  return (
    <section className="page panel">
      <h1>Quiz Manager</h1>
      <p className="section-subtitle">Add, edit, or delete questions</p>

      {/* Set Selector */}
      {setsLoading && <p className="status-message">Loading question sets...</p>}
      
      {!setsLoading && sets.length === 0 && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          <p>No question sets found. <a href="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>Create one first</a></p>
        </div>
      )}

      {!setsLoading && sets.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
          <label htmlFor="setSelector" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
            Select Question Set
          </label>
          <select
            id="setSelector"
            value={selectedSetId || ''}
            onChange={(e) => setSelectedSetId(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontFamily: 'inherit',
              fontSize: 'inherit',
            }}
          >
            <option value="">-- Select a set --</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.questionCount || 0} questions)
              </option>
            ))}
          </select>
        </div>
      )}

      {status === 'loading' && <p className="status-message">Loading questions...</p>}
      {status === 'error' && <p className="error-message">{error}</p>}
      {status === 'success' && selectedSetId && <p style={{ color: '#0ea5e9' }}>Loaded {count} questions</p>}

      {/* Upload Section */}
      {uploadStatus === 'idle' && selectedSetId && (
        <div className="upload-section">
          <h3 style={{ marginTop: '2rem' }}>Bulk Upload from PDF/Text</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
            Upload a PDF or TXT file with questions in this format:
          </p>
          <pre style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', overflow: 'auto' }}>
            {`1. Question text here?
A. Option A
B. Option B
C. Option C
D. Option D
Answer: B`}
          </pre>
          <label className="file-input-label">
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={uploadStatus === 'loading'}
              style={{ display: 'none' }}
            />
            <span className="btn btn-primary">Choose File</span>
          </label>
        </div>
      )}

      {/* Preview Section */}
      {uploadStatus === 'preview' && previewQuestions.length > 0 && (
        <div className="upload-preview">
          <h3>Preview ({previewQuestions.length} questions)</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem' }}>
            {previewQuestions.map((q, idx) => (
              <div key={idx} className="question-card" style={{ marginBottom: '0.75rem' }}>
                <strong>{idx + 1}. {q.question}</strong>
                <div className="option-text">A. {q.letterA}</div>
                <div className="option-text">B. {q.letterB}</div>
                <div className="option-text">C. {q.letterC}</div>
                <div className="option-text">D. {q.letterD}</div>
                <div className="correct-answer">Answer: {q.correctAnswer}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button type="button" className="btn btn-primary" onClick={handleBulkUpload}>
              Upload All
            </button>
            <button type="button" className="btn" onClick={cancelUpload}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadStatus === 'uploading' && (
        <div style={{ textAlign: 'center', margin: '2rem 0' }}>
          <p>Uploading: {Math.round(uploadProgress)}%</p>
          <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                background: '#2563eb',
                height: '100%',
                width: `${uploadProgress}%`,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      )}

      {uploadStatus === 'success' && (
        <p className="success-message">Successfully uploaded {previewQuestions.length} questions!</p>
      )}

      {uploadError && <p className="error-message">{uploadError}</p>}

      {selectedSetId && (
        <form onSubmit={handleSubmit} className="form-grid">
        <input
          className="input"
          name="question"
          value={form.question}
          onChange={handleChange}
          placeholder="Question"
        />
        <input
          className="input"
          name="letterA"
          value={form.letterA}
          onChange={handleChange}
          placeholder="Letter A"
        />
        <input
          className="input"
          name="letterB"
          value={form.letterB}
          onChange={handleChange}
          placeholder="Letter B"
        />
        <input
          className="input"
          name="letterC"
          value={form.letterC}
          onChange={handleChange}
          placeholder="Letter C"
        />
        <input
          className="input"
          name="letterD"
          value={form.letterD}
          onChange={handleChange}
          placeholder="Letter D"
        />

        <label className="form-label">
          Correct Answer
          <select className="input" name="correctAnswer" value={form.correctAnswer} onChange={handleChange}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary" disabled={saveStatus === 'loading'}>
          {saveStatus === 'loading' ? 'Saving...' : editingId ? 'Update Question' : 'Save Question'}
        </button>

        {editingId && (
          <button type="button" className="btn" onClick={cancelEdit}>
            Cancel Edit
          </button>
        )}

        {saveStatus === 'success' && <p className="success-message">Question saved to Firestore.</p>}
        {formError && <p className="error-message">Save failed: {formError}</p>}
      </form>
      )}

      {questions.length > 0 && selectedSetId && (
        <div className="questions-section">
          <h2>Questions</h2>
          <ul className="questions-list">
            {questions.map((q) => (
              <li key={q.id} className="question-card">
                <strong>{q.question}</strong>
                <div className="option-text">A. {q.letterA}</div>
                <div className="option-text">B. {q.letterB}</div>
                <div className="option-text">C. {q.letterC}</div>
                <div className="option-text">D. {q.letterD}</div>
                <div className="correct-answer">Correct: {q.correctAnswer}</div>
                <div className="action-row">
                  <button type="button" className="btn" onClick={() => startEdit(q)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(q.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

export default Quiz
