import { useEffect, useState } from 'react'
import { getAllSets, createSet, updateSet, deleteSet } from '../utils/setManager'
import './QuestionSetManager.css'

function QuestionSetManager() {
  const [sets, setSets] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({
    name: '',
    description: '',
  })

  // Load all sets on mount
  useEffect(() => {
    loadSets()
  }, [])

  const loadSets = async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await getAllSets()
      setSets(data)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sets')
      setStatus('error')
    }
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Set name is required')
      return
    }

    setStatus('loading')

    try {
      if (editingId) {
        await updateSet(editingId, form.name.trim(), form.description.trim())
      } else {
        await createSet(form.name.trim(), form.description.trim())
      }

      setForm({ name: '', description: '' })
      setEditingId(null)
      setShowForm(false)
      await loadSets()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save set')
      setStatus('idle')
    }
  }

  const startEdit = (set) => {
    setEditingId(set.id)
    setForm({
      name: set.name || '',
      description: set.description || '',
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ name: '', description: '' })
    setShowForm(false)
    setFormError('')
  }

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      'Delete this question set and all its questions? This cannot be undone.'
    )
    if (!confirmed) return

    setStatus('loading')
    try {
      await deleteSet(id)
      await loadSets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete set')
      setStatus('idle')
    }
  }

  return (
    <div className="qsm-container">
      {/* Status Messages */}
      {status === 'loading' && <p className="status-message">Loading...</p>}
      {status === 'error' && <p className="error-message">Error: {error}</p>}

      {/* Create Button */}
      {!showForm && (
        <button className="btn btn-primary qsm-create-button" onClick={() => setShowForm(true)}>
          + Create New Set
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="qsm-form-container">
          {/* Form Header */}
          <div className="qsm-form-header">
            <h3>{editingId ? 'Edit Question Set' : 'Create New Question Set'}</h3>
            <p>{editingId ? 'Update set details' : 'Create a new set to organize your questions'}</p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="qsm-form-body">
            {/* Name Field */}
            <div className="qsm-form-group">
              <label htmlFor="name" className="qsm-label">
                Set Name <span className="qsm-label-required">*</span>
              </label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g., Biology Final Exam"
                className="qsm-input"
              />
            </div>

            {/* Description Field */}
            <div className="qsm-form-group">
              <label htmlFor="description" className="qsm-label">
                Description <span className="qsm-label-optional">(optional)</span>
              </label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Add a description... (e.g., Covers chapters 1-5, includes practice problems)"
                rows="3"
                className="qsm-textarea"
              />
            </div>

            {/* Error Message */}
            {formError && (
              <div className="qsm-error-message">
                {formError}
              </div>
            )}

            {/* Buttons */}
            <div className="qsm-button-group">
              <button
                type="button"
                onClick={cancelEdit}
                className="qsm-button-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="qsm-button-submit"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sets List */}
      {!showForm && (
        <div>
          {sets.length === 0 ? (
            <p className="qsm-empty-state">
              No question sets yet. Create one to get started!
            </p>
          ) : (
            <div className="qsm-sets-grid">
              {sets.map((set) => (
                <div key={set.id} className="question-card">
                  <div className="qsm-set-card">
                    <div className="qsm-set-info">
                      <h3 className="qsm-set-name">{set.name}</h3>
                      {set.description && (
                        <p className="qsm-set-description">
                          {set.description}
                        </p>
                      )}
                      <p className="qsm-set-count">
                        {set.questionCount || 0} questions
                      </p>
                    </div>
                    <div className="qsm-set-actions">
                      <button
                        className="btn qsm-button-small"
                        onClick={() => startEdit(set)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn qsm-button-small qsm-button-delete"
                        onClick={() => handleDelete(set.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionSetManager
