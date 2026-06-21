import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  getAllFolders,
  getAllSets,
  getQuestionsBySet,
  getSetByName,
  getRetakeSetBySourceSetId,
  getQuestionsByOriginalQuestionId,
  addQuestionToSet,
  createSet,
  updateRetakeSetMetadata,
  deleteSet,
} from '../utils/setManager'
import '../components/QuestionSetManager.css'

function Exam() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedSetId = searchParams.get('setId')
  const location = useLocation()
  const fromFolderId = location?.state?.fromFolderId || null
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  // Sets management
  const [sets, setSets] = useState([])
  const [folders, setFolders] = useState([])
  const [selectedSetId, setSelectedSetId] = useState(null)
  const [setsLoading, setSetsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('sets')
  const [activeFolderId, setActiveFolderId] = useState('all')

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('')
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [retakeSet, setRetakeSet] = useState(null)
  const [retakeLoading, setRetakeLoading] = useState(false)

  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [running, setRunning] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const currentQuestion = useMemo(
    () => (questions.length > 0 ? questions[currentIndex] : null),
    [questions, currentIndex],
  )

  const shuffledAnswers = useMemo(() => {
    if (!currentQuestion) return []

    const originalChoices = ['A', 'B', 'C', 'D'].map((letter) => ({
      origLetter: letter,
      text: currentQuestion[`letter${letter}`],
    }))

    for (let i = originalChoices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[originalChoices[i], originalChoices[j]] = [originalChoices[j], originalChoices[i]]
    }

    return originalChoices.map((choice, index) => ({
      displayLetter: ['A', 'B', 'C', 'D'][index],
      origLetter: choice.origLetter,
      text: choice.text,
      isCorrect: choice.origLetter === currentQuestion.correctAnswer,
    }))
  }, [currentQuestion?.id])

  const currentCorrectAnswer = useMemo(
    () => shuffledAnswers.find((choice) => choice.isCorrect)?.displayLetter ?? currentQuestion?.correctAnswer ?? '',
    [shuffledAnswers, currentQuestion],
  )

  const loadSets = async () => {
    setSetsLoading(true)
    try {
      const [data, folderData] = await Promise.all([getAllSets(), getAllFolders()])
      setSets(data)
      setFolders(folderData)
      if (data.length > 0 && !selectedSetId) {
        setSelectedSetId(data[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sets')
    } finally {
      setSetsLoading(false)
    }
  }

  useEffect(() => {
    loadSets()
  }, [])

  useEffect(() => {
    if (!requestedSetId || sets.length === 0) return

    const requestedSet = sets.find((set) => set.id === requestedSetId)
    if (!requestedSet) return

    setActiveTab(isRetakeSet(requestedSet) ? 'retakes' : 'sets')
    setActiveFolderId(requestedSet.folderId || 'unfiled')
    setSelectedSetId(requestedSet.id)
    setHasStarted(false)
    setCompleted(false)
  }, [requestedSetId, sets])

  const isRetakeSet = (set) => set.type === 'retake' || set.name.endsWith(' - Retake')
  const matchesActiveFolder = (set) => {
    if (activeFolderId === 'all') return true
    if (activeFolderId === 'unfiled') return !set.folderId
    return set.folderId === activeFolderId
  }

  const normalSets = sets.filter((set) => !isRetakeSet(set))
  const retakeSets = sets.filter((set) => isRetakeSet(set))
  const activeSets = (activeTab === 'retakes' ? retakeSets : normalSets).filter(matchesActiveFolder)

  const currentSet = useMemo(
    () => sets.find((set) => set.id === selectedSetId) ?? null,
    [sets, selectedSetId],
  )

  const getRetakeSetName = (baseName) =>
    baseName.endsWith(' - Retake') ? baseName : `${baseName} - Retake`

  const syncRetakeSetMetadata = async (reviewSet, baseSet) => {
    if (!reviewSet || !baseSet) return reviewSet

    const expectedFolderId = baseSet.folderId || ''
    const needsSync =
      reviewSet.folderId !== expectedFolderId ||
      reviewSet.type !== 'retake' ||
      reviewSet.sourceSetId !== baseSet.id

    if (!needsSync) return reviewSet

    await updateRetakeSetMetadata(reviewSet.id, baseSet.id, expectedFolderId)

    return {
      ...reviewSet,
      folderId: expectedFolderId,
      type: 'retake',
      sourceSetId: baseSet.id,
    }
  }

  const loadRetakeSet = async (setId) => {
    if (!setId) {
      setRetakeSet(null)
      return
    }

    const baseSet = sets.find((set) => set.id === setId)
    if (!baseSet) {
      setRetakeSet(null)
      return
    }

    try {
      setRetakeLoading(true)
      const reviewName = getRetakeSetName(baseSet.name)
      const reviewSet =
        (await getRetakeSetBySourceSetId(baseSet.id)) || (await getSetByName(reviewName))
      setRetakeSet(await syncRetakeSetMetadata(reviewSet, baseSet))
    } catch (err) {
      console.error(err)
      setRetakeSet(null)
    } finally {
      setRetakeLoading(false)
    }
  }

  const ensureRetakeSet = async () => {
    if (!currentSet) return null

    const reviewName = getRetakeSetName(currentSet.name)
    let reviewSet =
      retakeSet && (retakeSet.sourceSetId === currentSet.id || retakeSet.name === reviewName)
        ? retakeSet
        : await getRetakeSetBySourceSetId(currentSet.id)

    if (!reviewSet) {
      reviewSet = await getSetByName(reviewName)
    }

    if (!reviewSet) {
      reviewSet = await createSet(reviewName, `Retake list for ${currentSet.name}`, {
        folderId: currentSet.folderId || '',
        type: 'retake',
        sourceSetId: currentSet.id,
      })
    } else {
      reviewSet = await syncRetakeSetMetadata(reviewSet, currentSet)
    }

    setRetakeSet(reviewSet)
    return reviewSet
  }

  const saveIncorrectQuestion = async (question) => {
    if (!question || !currentSet) return

    try {
      const reviewSet = await ensureRetakeSet()
      if (!reviewSet) return

      const originalQuestionId = question.originalQuestionId ?? question.id
      const existing = await getQuestionsByOriginalQuestionId(reviewSet.id, originalQuestionId)
      if (existing.length > 0) {
        return
      }

      await addQuestionToSet(reviewSet.id, {
        question: question.question,
        letterA: question.letterA,
        letterB: question.letterB,
        letterC: question.letterC,
        letterD: question.letterD,
        correctAnswer: question.correctAnswer,
        originalQuestionId,
        sourceSetId: currentSet.id,
      })

      await loadRetakeSet(currentSet.id)
    } catch (err) {
      console.error(err instanceof Error ? err.message : 'Unable to save question to retake list')
    }
  }

  const openRetakeReview = async () => {
    if (!retakeSet) return

    try {
      const items = await getQuestionsBySet(retakeSet.id)
      setQuestions(items)
      setCurrentIndex(0)
      setHasStarted(true)
      setCompleted(false)
      setSelected('')
      setFeedback('')
      setFeedbackType('')
      setSecondsLeft(timePerQuestion)
      setRunning(true)
      setReviewMode(true)
    } catch (err) {
      console.error(err)
    }
  }

  const clearRetakeReview = async () => {
    if (!retakeSet) return

    try {
      await deleteSet(retakeSet.id)
      setRetakeSet(null)
      await loadSets()
    } catch (err) {
      console.error(err)
    }
  }

  const loadQuestionsForSet = async (setId) => {
    if (!setId) return

    setStatus('loading')
    setError('')

    try {
      const items = await getQuestionsBySet(setId)
      const shuffled = items.sort(() => Math.random() - 0.5)
      setQuestions(shuffled)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions.')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (!selectedSetId) {
      setQuestions([])
      setStatus('idle')
      setError('')
      setReviewMode(false)
      return
    }
    setReviewMode(false)
    loadRetakeSet(selectedSetId)
    loadQuestionsForSet(selectedSetId)
  }, [selectedSetId, sets])

  useEffect(() => {
    if (!running || secondsLeft <= 0) return

    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id)
          handleAnswer(null)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, secondsLeft])

  const startExam = () => {
    if (questions.length === 0) return
    setHasStarted(true)
    setCurrentIndex(0)
    setScore(0)
    setCompleted(false)
    setSelected('')
    setFeedback('')
    setFeedbackType('')
    setSecondsLeft(timePerQuestion)
    setRunning(true)
  }

  const nextQuestion = () => {
    const nextIndex = currentIndex + 1
    if (nextIndex >= questions.length) {
      setCompleted(true)
      setRunning(false)
      setSecondsLeft(0)
    } else {
      setCurrentIndex(nextIndex)
      setSelected('')
      setFeedback('')
      setFeedbackType('')
      setSecondsLeft(timePerQuestion)
      setRunning(true)
    }
  }

  const handleAnswer = (answer) => {
    if (!currentQuestion || completed || !running) return

    setRunning(false)

    if (!answer) {
      saveIncorrectQuestion(currentQuestion)
      setFeedback(`Time's up! Correct answer: ${currentCorrectAnswer}`)
      setFeedbackType('error')
      setTimeout(nextQuestion, 1500)
      return
    }

    setSelected(answer)

    if (answer === currentCorrectAnswer) {
      setScore((s) => s + 1)
      setFeedback('Correct!')
      setFeedbackType('success')
    } else {
      saveIncorrectQuestion(currentQuestion)
      setFeedback(`Wrong. Correct answer: ${currentCorrectAnswer}`)
      setFeedbackType('error')
    }

    setTimeout(nextQuestion, 1500)
  }

  return (
    <section className="page panel">

<div style={{ marginBottom: '1rem' }}>
  {selectedSetId && (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <button
        type="button"
        className="qsm-button-cancel"
        onClick={() => navigate('/', { state: { activeFolderId: fromFolderId } })}
      >
        Back
      </button>
    </div>
  )}
  {!hasStarted && <h1 style={{ margin: '1rem 0 0 0', textAlign: 'center' }}>Exam</h1>}
</div>

      {/* Set Selector */}
      {setsLoading && <p className="status-message">Loading question sets...</p>}
      
      {!setsLoading && sets.length === 0 && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          <p>No question sets found. <a href="/quiz" style={{ color: '#2563eb', textDecoration: 'underline' }}>Create one first</a></p>
        </div>
      )}

      {!setsLoading && sets.length > 0 && !hasStarted && (
        <div style={{ marginBottom: '1.5rem' }}>

          <div style={{ padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <label htmlFor="setSelector" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select {activeTab === 'retakes' ? 'Retake' : 'Question'} Set
            </label>
            <select
              id="setSelector"
              className="input"
              value={selectedSetId || ''}
              onChange={(e) => {
                setSelectedSetId(e.target.value)
                setHasStarted(false)
                setCompleted(false)
              }}
              style={{ width: '100%' }}
            >
              <option value="">Select a set</option>
              {activeSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name} ({set.questionCount || 0} questions)
                </option>
              ))}
            </select>
            {activeSets.length === 0 && (
              <p className="status-message" style={{ marginTop: '0.75rem' }}>
                No {activeTab === 'retakes' ? 'retake sets' : 'sets'} available.
              </p>
            )}
          </div>
        </div>
      )}

      {reviewMode && (
        <div className="status-message" style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '6px', marginBottom: '1rem' }}>
          <p style={{ margin: '0 0 0.75rem' }}>
            You are reviewing questions you previously missed. Finish this review, or exit to return to the full exam.
          </p>
          <button type="button" className="btn" onClick={() => {
            setReviewMode(false)
            setHasStarted(false)
            setCompleted(false)
            setFeedback('')
            setRunning(false)
            loadQuestionsForSet(selectedSetId)
          }}>
            Exit review mode
          </button>
        </div>
      )}

      {status === 'loading' && <p>Loading questions...</p>}
      {status === 'error' && <p>Failed to load: {error}</p>}

      {status === 'success' && questions.length === 0 && (
        <p>No questions in this set. Add some in the Quiz page.</p>
      )}

      {status === 'success' && questions.length > 0 && !hasStarted && selectedSetId && (
        <div className="exam-setup" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <label className="form-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
            Seconds per question:
            <input
              className="input"
              type="number"
              min="5"
              max="300"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number(e.target.value) || 0)}
              style={{ width: '120px', textAlign: 'center' }}
            />
          </label>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={showNotes}
              onChange={(e) => setShowNotes(e.target.checked)}
            />
            Take exam with notes
          </label>
          <button type="button" className="btn btn-primary" onClick={startExam}>
            Start Exam
          </button>
        </div>
      )}

      {currentQuestion && !completed && hasStarted && (
        <div style={{ position: 'relative', paddingBottom: '1rem' }}>
          <div className="exam-card">
            <p className="exam-meta">
              Question {currentIndex + 1} of {questions.length}
            </p>
            <p className="exam-timer">Time left: {secondsLeft}s</p>

            <h2>{currentQuestion.question}</h2>
            <ul className="option-list">
              {shuffledAnswers.map((choice) => {
                const answered = !running && feedback !== '' && (selected !== '' || feedback.startsWith("Time"))
                const isCorrect = choice.isCorrect
                const isSelected = selected === choice.displayLetter
                const statusClass = answered
                  ? isCorrect
                    ? 'btn-option-correct'
                    : isSelected
                      ? 'btn-option-incorrect'
                      : ''
                  : ''

                return (
                  <li key={choice.displayLetter}>
                    <button
                      type="button"
                      className={`btn btn-option ${statusClass}`}
                      onClick={() => handleAnswer(choice.displayLetter)}
                      disabled={!running}
                    >
                      {choice.displayLetter}. {choice.text}
                    </button>
                  </li>
                )
              })}
            </ul>

            {feedback && (
              <p className={`feedback-message ${feedbackType === 'success' ? 'feedback-success' : feedbackType === 'error' ? 'feedback-error' : ''}`}>
                {feedback}
              </p>
            )}
          </div>

          {showNotes && (
            <div style={{ position: 'absolute', top: '0', right: '-260px', width: '240px', zIndex: 10 }}>
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '16px', padding: '0.85rem', backgroundColor: '#f8fafc', boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)' }}>
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Notes</h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.5', minHeight: '5rem' }}>
                  {currentQuestion.notes ? currentQuestion.notes : 'No notes available for this question.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {completed && (
        <div className="exam-result">
          <h2>Exam finished</h2>
          <p>
            Score: {score} / {questions.length}
          </p>
          <div className="action-row">
            <button type="button" className="btn btn-primary" onClick={startExam}>
              Take Again
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setHasStarted(false)
                setCompleted(false)
                setFeedback('')
                setRunning(false)
              }}
            >
              Back to Setup
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default Exam
