import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import {
  getAllFolders,
  getAllSets,
  createFolder,
  createSet,
  updateSet,
  deleteSet,
} from '../utils/setManager'
import './QuestionSetManager.css'

function QuestionSetManager() {

  const navigate = useNavigate()

  const location = useLocation()

  const [sets, setSets] = useState([])

  const [folders, setFolders] = useState([])

  const [status, setStatus] = useState('idle')

  const [error, setError] = useState('')

  const [formError, setFormError] = useState('')

  const [folderError, setFolderError] = useState('')

  const [folderName, setFolderName] = useState('')

  const [showForm, setShowForm] = useState(false)

  const [editingId, setEditingId] = useState(null)

  const [activeTab, setActiveTab] = useState('sets')

  const [activeFolderId, setActiveFolderId] = useState(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    folderId: '',
  })

  // (initial load moved below with location handling) (RESOURCE FUNCTIONS BELOW TO LOAD DATA)
  // This loadSets is called in places to refresh data
  const loadSets = async () => {

    setStatus('loading')

    setError('')

    try {
      const [data, folderData] = await Promise.all([getAllSets(), getAllFolders()])
      setSets(data)
      setFolders(folderData)
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
        await updateSet(editingId, form.name.trim(), form.description.trim(), form.folderId)
      } else {
        await createSet(form.name.trim(), form.description.trim(), { folderId: form.folderId })
      }

      setForm({ name: '', description: '', folderId: '' })
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
      folderId: set.folderId || '',
    })
    setShowForm(true)
  }

  const isRetakeSet = (set) => set.type === 'retake' || set.name.endsWith(' - Retake')
  const matchesActiveFolder = (set) => {
    if (!activeFolderId) return false
    if (activeFolderId === 'unsorted') return !set.folderId
    return set.folderId === activeFolderId
  }

  const normalSets = sets.filter((set) => !isRetakeSet(set) && matchesActiveFolder(set))
  const retakeSets = sets.filter((set) => isRetakeSet(set) && matchesActiveFolder(set))
  const activeSets = (activeTab === 'retakes' ? retakeSets : normalSets).filter(matchesActiveFolder)

  const getFolderName = (folderId) =>
    folders.find((folder) => folder.id === folderId)?.name || 'Unsorted'

  const activeFolderName =
    activeFolderId === 'unsorted'
      ? 'Unsorted'
      : folders.find((folder) => folder.id === activeFolderId)?.name || ''

  const getFolderSetCount = (folderId) =>
    sets.filter((set) => {
      if (folderId === 'unsorted') return !set.folderId
      return set.folderId === folderId
    }).length

  const openFolder = (folderId) => {
    setActiveFolderId(folderId)
    setActiveTab('sets')
    setShowForm(false)
    setEditingId(null)
    setFormError('')
  }

  const goBackToFolders = () => {
    setActiveFolderId(null)
    setShowForm(false)
    setEditingId(null)
    setForm({ name: '', description: '', folderId: '' })
    setFormError('')
  }

  const openCreateSetForm = () => {
    setEditingId(null)
    setForm({
      name: '',
      description: '',
      folderId: activeFolderId === 'unsorted' ? '' : activeFolderId || '',
    })
    setShowForm(true)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setForm({ name: '', description: '', folderId: '' })
    setShowForm(false)
    setFormError('')
  }

  const handleCreateFolder = async (event) => {
    event.preventDefault()
    setFolderError('')

    if (!folderName.trim()) {
      setFolderError('Folder name is required')
      return
    }

    try {
      const folder = await createFolder(folderName)
      setFolderName('')
      await loadSets()
      setActiveFolderId(folder.id)
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Failed to create folder')
    }
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

  const openSetInQuizManager = (setId) => {
    navigate(`/quiz?setId=${encodeURIComponent(setId)}`, {
      state: { fromFolderId: activeFolderId || null, fromTab: activeTab },
    })
  }

  const openSetInExam = (setId) => {
    navigate(`/exam?setId=${encodeURIComponent(setId)}`, {
      state: { fromFolderId: activeFolderId || null, fromTab: activeTab },
    })
  }
  
  // loadSets is called to initially load data

  useEffect(() => {

    loadSets()

    // If navigated here with a folder in location state, open that folder
    if (location?.state?.activeFolderId) {
      setActiveFolderId(location.state.activeFolderId)
    }
  }, [])


  // Displaying data and UI below

  return (

    <div className="qsm-container">

      {/* Status Messages */}
      {status === 'loading' && <p className="status-message">Loading...</p>}

      {status === 'error' && <p className="error-message">Error: {error}</p>}


{/* Folder List */}
      {!activeFolderId && (
        <div className="qsm-folder-panel">

          {/* opening of form to handle input for creating a new folder */}
          <form className="qsm-folder-form" onSubmit={handleCreateFolder}>

            <input className="qsm-input" value={folderName} onChange={(event) => setFolderName(event.target.value)}
              placeholder="New folder name"/>

            <button type="submit" className="btn btn-primary">Create Folder</button>
          </form>
          {/* closing of form to handle input for creating a new folder */}

          {folderError && <p className="qsm-error-message">{folderError}</p>}


          {/* Folder from the useEffect are loaded here */}
          <div className="qsm-folder-list qsm-folder-list-vertical">

            {folders.map((folder) => (

              <button key={folder.id} type="button" className="qsm-folder-row"

                onClick={() => openFolder(folder.id)}>

                <span>{folder.name}</span>

                <span className="qsm-folder-count">{getFolderSetCount(folder.id)} sets</span>

              </button>
            ))}

            <button type="button" className="qsm-folder-row"
              onClick={() => openFolder('unsorted')}>
              <span>Unsorted</span>
              <span className="qsm-folder-count">{getFolderSetCount('unsorted')} sets</span>
            </button>
          </div>
        </div>
      )}
      
      {activeFolderId && (
        <>
          <div className="qsm-folder-header qsm-folder-header-vertical">
            <button type="button" className="qsm-button-cancel" onClick={goBackToFolders}>Back </button>
            
            <div className="qsm-folder-info">
              <h2>{activeFolderName}</h2>
              <p>{getFolderSetCount(activeFolderId)} sets in this folder</p>
            </div>
          </div>

          <div className="qsm-tab-list">
            <button
              type="button"
              className={`qsm-tab ${activeTab === 'sets' ? 'active' : ''}`}
              onClick={() => setActiveTab('sets')}
            >
              Sets ({normalSets.length})
            </button>
            <button
              type="button"
              className={`qsm-tab ${activeTab === 'retakes' ? 'active' : ''}`}
              onClick={() => setActiveTab('retakes')}
            >
              Retake Sets ({retakeSets.length})
            </button>
          </div>
        </>
      )}

      {activeFolderId && !showForm && activeTab === 'sets' && (
        <button className="btn btn-primary qsm-create-button" onClick={openCreateSetForm}>
          + Create New Set
        </button>
      )}

      {activeFolderId && (
        <div>
          {showForm && (
            <div className="qsm-form-container">
              {/* Form Header */}
              <div className="qsm-form-header">
                <h3>{editingId ? 'Edit Question Set' : 'Create New Question Set'}</h3>
                <p>{editingId ? 'Update set details' : `Create a new set inside ${activeFolderName}`}</p>
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

                <div className="qsm-form-group">
                  <label htmlFor="folderId" className="qsm-label">
                    Folder <span className="qsm-label-optional">(optional)</span>
                  </label>
                  <select
                    id="folderId"
                    name="folderId"
                    value={form.folderId}
                    onChange={handleChange}
                    className="qsm-input"
                  >
                    <option value="">Unsorted</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
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

          {!showForm && (
            <div>
              {activeSets.length === 0 ? (
                <p className="qsm-empty-state">
                  {activeTab === 'sets'
                    ? 'No question sets in this folder yet.'
                    : 'No retake sets in this folder yet.'}
                </p>
              ) : (
                <div className="qsm-sets-grid">
                  {activeSets.map((set) => (
                    <div key={set.id} className="question-card">
                      <div className="qsm-set-card">
                        <div
                          className="qsm-set-info qsm-clickable-set"
                          role="button"
                          tabIndex={0}
                          onClick={() => openSetInQuizManager(set.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              openSetInQuizManager(set.id)
                            }
                          }}
                        >
                          <h3 className="qsm-set-name">{set.name}</h3>
                          {set.description && (
                            <p className="qsm-set-description">
                              {set.description}
                            </p>
                          )}
                          <p className="qsm-set-count">
                            {set.questionCount || 0} questions
                          </p>
                          <p className="qsm-set-folder">
                            Folder: {getFolderName(set.folderId)}
                          </p>
                        </div>
                        <div className="qsm-set-actions">
                          <button
                            type="button"
                            className="btn qsm-button-small"
                            onClick={() => openSetInExam(set.id)}
                          >
                            Take Exam
                          </button>
                          {activeTab === 'sets' && (
                            <button
                              className="btn qsm-button-small"
                              onClick={() => startEdit(set)}
                            >
                              Edit
                            </button>
                          )}
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
      )}
    </div>
  )
}

export default QuestionSetManager
