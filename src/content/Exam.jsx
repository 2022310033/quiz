import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/firebase'

function Exam() {
  const [questions, setQuestions] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

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
    const loadQuestions = async () => {
      setStatus('loading')
      setError('')

      try {
        const snapshot = await getDocs(collection(db, 'quiz'))
        let items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        
        // Shuffle questions
        items = items.sort(() => Math.random() - 0.5)
        
        setQuestions(items)
        setStatus('success')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load questions.')
        setStatus('error')
      }
    }

    loadQuestions()
  }, [])

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

      {status === 'loading' && <p>Loading questions...</p>}
      {status === 'error' && <p>Failed to load: {error}</p>}

      {status === 'success' && questions.length === 0 && (
        <p>No questions yet. Add some in the Quiz page.</p>
      )}

      {status === 'success' && questions.length > 0 && !hasStarted && (
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
