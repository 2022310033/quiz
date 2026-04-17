import { useEffect, useMemo, useState } from 'react'
import { getAllSets, getQuestionsBySet } from '../utils/setManager'

function Exam() {
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  // Sets management
  const [sets, setSets] = useState([])
  const [selectedSetId, setSelectedSetId] = useState(null)
  const [setsLoading, setSetsLoading] = useState(true)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const [secondsLeft, setSecondsLeft] = useState(0)
  const [timePerQuestion, setTimePerQuestion] = useState(30)
  const [running, setRunning] = useState(false)

  const currentQuestion = useMemo(
    () => (questions.length > 0 ? questions[currentIndex] : null),
    [questions, currentIndex],
  )

  useEffect(() => {
    const loadSets = async () => {
      setSetsLoading(true)
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

    loadSets()
  }, [])

  useEffect(() => {
    if (!selectedSetId) return

    const loadQuestions = async () => {
      setStatus('loading')
      setError('')

      try {
        const items = await getQuestionsBySet(selectedSetId)
        
        // Shuffle questions
        const shuffled = items.sort(() => Math.random() - 0.5)
        
        setQuestions(shuffled)
        setStatus('success')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions.')
        setStatus('error')
      }
    }

    loadQuestions()
  }, [selectedSetId])

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
      setSecondsLeft(timePerQuestion)
      setRunning(true)
    }
  }

  const handleAnswer = (answer) => {
    if (!currentQuestion || completed || !running) return

    setRunning(false)

    if (!answer) {
      setFeedback(`Time's up! Correct answer: ${currentQuestion.correctAnswer}`)
      setTimeout(nextQuestion, 1500)
      return
    }

    setSelected(answer)

    if (answer === currentQuestion.correctAnswer) {
      setScore((s) => s + 1)
      setFeedback('Correct!')
    } else {
      setFeedback(`Wrong. Correct answer: ${currentQuestion.correctAnswer}`)
    }

    setTimeout(nextQuestion, 1500)
  }

  return (
    <section className="page panel">
      <h1>Exam</h1>

      {/* Set Selector */}
      {setsLoading && <p className="status-message">Loading question sets...</p>}
      
      {!setsLoading && sets.length === 0 && (
        <div className="error-message" style={{ marginBottom: '1.5rem' }}>
          <p>No question sets found. <a href="/quiz" style={{ color: '#2563eb', textDecoration: 'underline' }}>Create one first</a></p>
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
            onChange={(e) => {
              setSelectedSetId(e.target.value)
              setHasStarted(false)
              setCompleted(false)
            }}
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

      {status === 'loading' && <p>Loading questions...</p>}
      {status === 'error' && <p>Failed to load: {error}</p>}

      {status === 'success' && questions.length === 0 && (
        <p>No questions in this set. Add some in the Quiz page.</p>
      )}

      {status === 'success' && questions.length > 0 && !hasStarted && selectedSetId && (
        <div className="exam-setup">
          <label className="form-label">
            Seconds per question:
            <input
              className="input"
              type="number"
              min="5"
              max="300"
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(Number(e.target.value) || 0)}
            />
          </label>
          <button type="button" className="btn btn-primary" onClick={startExam}>
            Start Exam
          </button>
        </div>
      )}

      {currentQuestion && !completed && hasStarted && (
        <div className="exam-card">
          <p className="exam-meta">
            Question {currentIndex + 1} of {questions.length}
          </p>
          <p className="exam-timer">Time left: {secondsLeft}s</p>

          <h2>{currentQuestion.question}</h2>
          <ul className="option-list">
            <li>
              <button
                type="button"
                className="btn btn-option"
                onClick={() => handleAnswer('A')}
                disabled={!running}
              >
                A. {currentQuestion.letterA}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-option"
                onClick={() => handleAnswer('B')}
                disabled={!running}
              >
                B. {currentQuestion.letterB}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-option"
                onClick={() => handleAnswer('C')}
                disabled={!running}
              >
                C. {currentQuestion.letterC}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-option"
                onClick={() => handleAnswer('D')}
                disabled={!running}
              >
                D. {currentQuestion.letterD}
              </button>
            </li>
          </ul>

          {feedback && <p className="feedback-message">{feedback}</p>}
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
