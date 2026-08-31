import './History.css'
import { useEffect, useMemo, useState } from 'react'
import { deleteExamHistory, getExamHistory } from './historyManager'
import '@fortawesome/fontawesome-free/css/all.min.css'

function getPercentage(item) {
  if (Number.isFinite(Number(item.percentage))) return Number(item.percentage)
  if (!item.totalQuestions) return 0
  return Math.round((Number(item.score || 0) / Number(item.totalQuestions)) * 100)
}

export default function History() {
  const [historyList, setHistoryList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState('')

  useEffect(() => {
    async function loadHistory() {
      try {
        setHistoryList(await getExamHistory())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load exam history.')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [])

  const subjectBests = useMemo(() => {
    const bestsBySubject = new Map()

    historyList.forEach((item) => {
      const subject = item.subject || 'Uncategorized'
      const currentBest = bestsBySubject.get(subject)
      if (!currentBest || getPercentage(item) > getPercentage(currentBest)) {
        bestsBySubject.set(subject, item)
      }
    })

    return [...bestsBySubject.entries()]
      .map(([subject, item]) => ({ subject, item }))
      .sort((a, b) => getPercentage(b.item) - getPercentage(a.item))
  }, [historyList])

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this ${item.subject || 'subject'} exam attempt?`)) return

    try {
      setDeletingId(item.id)
      await deleteExamHistory(item.id)
      setHistoryList((previous) => previous.filter((historyItem) => historyItem.id !== item.id))
    } catch (err) {
      console.error(err)
      setError('Unable to delete this history item. Please try again.')
    } finally {
      setDeletingId('')
    }
  }

  const formatDate = (finishedAt) => {
    const date = finishedAt?.toDate?.() ?? new Date(finishedAt)
    return Number.isNaN(date.getTime())
      ? 'Unknown date'
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="history-page">
      <div className="history-heading">
        <div>
          <p className="history-eyebrow">Exam performance</p>
          <h2>Score History</h2>
          <p>Track every completed exam and your best result in each subject.</p>
        </div>
        <div className="history-attempt-count">{historyList.length} attempts</div>
      </div>

      {loading && <p className="history-status">Loading score history…</p>}
      {error && <p className="history-status history-status-error">{error}</p>}

      {!loading && !error && historyList.length === 0 && (
        <div className="history-empty">
          <i className="fa-solid fa-chart-line" aria-hidden="true" />
          <h3>No exams completed yet</h3>
          <p>Finish an exam and save it to see your progress here.</p>
        </div>
      )}

      {!loading && historyList.length > 0 && (
        <>
          <section className="subject-bests" aria-labelledby="subject-bests-heading">
            <div className="history-section-heading">
              <div>
                <p className="history-eyebrow">Personal bests</p>
                <h3 id="subject-bests-heading">Highest Score by Subject</h3>
              </div>
              <span>Best attempt per subject</span>
            </div>

            <div className="subject-best-grid">
              {subjectBests.map(({ subject, item }) => (
                <article className="subject-best-card" key={subject}>
                  <div>
                    <p className="subject-best-name">{subject}</p>
                    <p className="subject-best-score">
                      {getPercentage(item)}<span>%</span>
                    </p>
                    <p className="subject-best-detail">
                      {item.score}/{item.totalQuestions} correct · {formatDate(item.finishedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="history-delete-button"
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    aria-label={`Delete best attempt for ${subject}`}
                    title="Delete this attempt"
                  >
                    <i className="fa-solid fa-trash" aria-hidden="true" />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="history-attempts" aria-labelledby="attempt-history-heading">
            <div className="history-section-heading">
              <div>
                <p className="history-eyebrow">All attempts</p>
                <h3 id="attempt-history-heading">Exam Attempts</h3>
              </div>
              <span>Newest first</span>
            </div>

            <div className="history-table-container">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Score</th>
                    <th>Result</th>
                    <th>Date</th>
                    <th><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {historyList.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.subject || 'Uncategorized'}</strong></td>
                      <td>{item.score}/{item.totalQuestions}</td>
                      <td>
                        <span className={`history-percent history-percent-${getPercentage(item) >= 75 ? 'good' : 'needs-work'}`}>
                          {getPercentage(item)}%
                        </span>
                      </td>
                      <td>{formatDate(item.finishedAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="history-delete-button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          aria-label={`Delete ${item.subject || 'subject'} attempt from ${formatDate(item.finishedAt)}`}
                          title="Delete this attempt"
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
