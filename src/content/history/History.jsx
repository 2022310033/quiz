import './History.css'
import { useState, useEffect } from 'react'
import { getExamHistory, deleteExamHistory } from './historyManager'
import '@fortawesome/fontawesome-free/css/all.min.css'

export default function History() {

    const [historylist, sethistorylist] = useState([])

    useEffect(() => {
        async function loadhistory() {
            const data = await getExamHistory()
            sethistorylist(data)
        }
        loadhistory()
    }, [])

    const handleDelete = async (id) => {
          if (!window.confirm('Delete this history item?')) return

        try {
            await deleteExamHistory(id)
            sethistorylist((prev) => prev.filter((item) => item.id !== id))
        } catch (err) {
            console.error(err)
        }
    }

    const formatDate = (finishedAt) => {
    const date = finishedAt?.toDate?.() ?? new Date(finishedAt)
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
    })
    }
    
return (
    <div>
        <h2>History</h2>
            {historylist.length === 0 ? (<p>Loading...</p>) 
            : 
            (
            <div className="history-table-container">
            <table className='history-table'>
                <thead>
                    <tr>
                        <th>Subject</th>
                        <th>Score</th>
                        <th>Percentage</th>
                        <th>Date</th>
                        <th>Delete</th>
                    </tr>
                </thead>
                    <tbody>
                        {historylist.map((item) => (
                            <tr>
                                <td>{item.subject}</td>
                                <td>{item.score}</td>
                                <td>{item.percentage}</td>
                                <td>{formatDate(item.finishedAt)}</td>
                                <td><button type="button" onClick={() => handleDelete(item.id)}>
                                    <i className="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            )}    
    </div>
  )
}

