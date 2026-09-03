import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './GeminiExam.css'

function GeminiQuiz() {
  const navigate = useNavigate()
  const location = useLocation()
  const temporaryExam = location.state?.temporaryExam
  const questions = temporaryExam?.questions || []
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [score, setScore] = useState(0)
  const [completed, setCompleted] = useState(false)

  const currentQuestion = questions[currentIndex]
  const choices = useMemo(
    () => currentQuestion ? ['A', 'B', 'C', 'D'].map((letter) => ({ letter, text: currentQuestion[`letter${letter}`] })) : [],
    [currentQuestion],
  )

  const answerQuestion = (answer) => {
    if (selected || !currentQuestion) return
    setSelected(answer)
    if (answer === currentQuestion.correctAnswer) setScore((previous) => previous + 1)
  }

  const nextQuestion = () => {
    if (currentIndex + 1 >= questions.length) {
      setCompleted(true)
      return
    }
    setCurrentIndex((previous) => previous + 1)
    setSelected('')
  }

  if (!temporaryExam || questions.length === 0) {
    return (
      <section className="page panel gemini-page">
        <h1>System exam unavailable</h1>
        <p>Generate a new temporary exam to begin.</p>
        <button type="button" className="btn btn-primary" onClick={() => navigate('/gemini')}>Create Gemini exam</button>
      </section>
    )
  }

  if (completed) {
    return (
      <section className="page panel gemini-page gemini-quiz-page">
        <p className="gemini-eyebrow">TEMPORARY EXAM COMPLETE</p>
        <h1>{temporaryExam.name}</h1>
        <p className="gemini-score">Score: {score} / {questions.length}</p>
        <p>This exam was not saved to the database.</p>
        <div className="gemini-quiz-actions">
          <button type="button" className="btn btn-primary" onClick={() => navigate('/gemini')}>Create another</button>
          <button type="button" className="btn" onClick={() => navigate('/home')}>Home</button>
        </div>
      </section>
    )
  }

  return (
    <section className="page panel gemini-page gemini-quiz-page">
      <button type="button" className="btn gemini-back-button" onClick={() => navigate('/gemini')}>Exit</button>
      <p className="gemini-eyebrow">TEMPORARY SYSTEM EXAM</p>
      <h1>{temporaryExam.name}</h1>
      <p className="gemini-question-count">Question {currentIndex + 1} of {questions.length}</p>
      <div className="gemini-question-card">
        <h2>{currentQuestion.question}</h2>
        <div className="gemini-options">
          {choices.map((choice) => {
            const isCorrect = choice.letter === currentQuestion.correctAnswer
            const isSelected = choice.letter === selected
            const statusClass = selected && (isCorrect ? 'is-correct' : isSelected ? 'is-wrong' : '')
            return (
              <button key={choice.letter} type="button" className={`gemini-option ${statusClass}`} onClick={() => answerQuestion(choice.letter)} disabled={Boolean(selected)}>
                <strong>{choice.letter}.</strong> {choice.text}
              </button>
            )
          })}
        </div>
        {selected && (
          <div className="gemini-feedback">
            <p>{selected === currentQuestion.correctAnswer ? 'Correct!' : `Incorrect. The correct answer is ${currentQuestion.correctAnswer}.`}</p>
            {currentQuestion.notes && <p>{currentQuestion.notes}</p>}
            <button type="button" className="btn btn-primary" onClick={nextQuestion}>
              {currentIndex + 1 === questions.length ? 'Finish exam' : 'Next question'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

export default GeminiQuiz
