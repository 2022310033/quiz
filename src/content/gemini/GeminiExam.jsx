import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateExamFromTitle } from './examGenerator'
import './GeminiExam.css'

function GeminiExam() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ title: '', description: '', questionCount: '10' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((previous) => ({ ...previous, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const title = form.title.trim()
    const questionCount = Number(form.questionCount)
    if (!title) {
      setError('Exam title is required')
      return
    }
    if (!Number.isInteger(questionCount) || questionCount < 5 || questionCount > 20) {
      setError('Question count must be between 5 and 20')
      return
    }

    setLoading(true)
    try {
      const questions = await generateExamFromTitle(title, form.description.trim(), questionCount)
      navigate('/gemini/quiz', {
        state: {
          temporaryExam: {
            id: `temporary-${Date.now()}`,
            name: title,
            description: form.description.trim(),
            questions,
          },
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate exam')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="page panel gemini-page">
      <button type="button" className="btn gemini-back-button" onClick={() => navigate('/home')}>
        Back
      </button>
      <div className="gemini-heading">
        <p className="gemini-eyebrow">AI EXAM STUDIO</p>
        <h1>Create an exam from a title</h1>
        <p>System will create a temporary multiple-choice exam. It will not be added to your saved sets.</p>
      </div>

      <form className="gemini-form" onSubmit={handleSubmit}>
        <label htmlFor="gemini-title">Exam title</label>
        <input id="gemini-title" name="title" value={form.title} onChange={handleChange} placeholder="e.g. Human anatomy" />

        <label htmlFor="gemini-description">Focus <span>(optional)</span></label>
        <textarea id="gemini-description" name="description" value={form.description} onChange={handleChange} rows="4" placeholder="e.g. Focus on the nervous system and clinical cases" />

        <label htmlFor="gemini-question-count">Number of questions</label>
        <input id="gemini-question-count" name="questionCount" type="number" min="5" max="20" value={form.questionCount} onChange={handleChange} />

        {error && <p className="gemini-error">{error}</p>}
        <button type="submit" className="btn btn-primary gemini-submit" disabled={loading}>
          {loading ? 'Generating exam...' : 'Generate exam'}
        </button>
      </form>
    </section>
  )
}

export default GeminiExam
