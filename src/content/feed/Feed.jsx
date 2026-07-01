import './Feed.css'
import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../firebase/firebase'
import { getAllSets } from '../../utils/setManager'

export default function Feed() {

    const profileImage = `${import.meta.env.BASE_URL}pfp.jpg` // Use the correct path to your profile image

    const [questions, setQuestions] = useState([])
    const [sets, setSets] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [flippedIds, setFlippedIds] = useState([])

    const shuffleArray = (items) => {

        const shuffled = [...items]

        for (let index = shuffled.length - 1; index > 0; index -= 1) {

            const randomIndex = Math.floor(Math.random() * (index + 1))
            ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
        }

        return shuffled
    }

    useEffect(() => {

        const loadFeedData = async () => {

            setLoading(true)
            setError('')

            try {
                const [questionSnapshot, setData] = await Promise.all([
                    getDocs(collection(db, 'questions')),
                    getAllSets(),
                ])

                const items = shuffleArray(
                    questionSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
                ).slice(0, 20)

                setQuestions(items)
                setSets(setData)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load questions.')
            } finally {
                setLoading(false)
            }
        }

        loadFeedData()
    }, [])

    const toggleCard = (questionId) => {
        setFlippedIds((current) =>
            current.includes(questionId)
                ? current.filter((id) => id !== questionId)
                : [...current, questionId]
        )
    }

    const getAnswerText = (question) => question?.[`letter${question.correctAnswer}`] || ''

    const getSubjectName = (setId) => {
        const matchedSet = sets.find((item) => item.id === setId)
        return matchedSet?.name || 'Unknown subject'
    }

    return (
        <div className="feed-container">
            {/* Top section of the feed */}
            <div className="feed-top-container">
                <div className="pfp">
                    <img src={profileImage} alt="Profile Picture" height="80" width="80" />
                </div>
                <div className='greetings'>
                    Hello, Mikaella!
                </div>

            </div>

            {/* Bottom section of the feed */}
            {loading && <p className="feed-status">Loading questions...</p>}

            {error && <p className="feed-status feed-error">{error}</p>}

            {!loading && !error && questions.length === 0 && (<p className="feed-status">No questions found.</p>)}

            <div className="feed-scroll-list">
                {questions.map((question) => {

                    const isFlipped = flippedIds.includes(question.id)

                    return (
                        <div className="feed-bottom-container" key={question.id}>
                            <div className="subject-name">
                                <h2>{getSubjectName(question.setId)}</h2>
                            </div>

                            <div
                                className={`content${isFlipped ? ' flipped' : ''}`}

                                onClick={() => toggleCard(question.id)}

                                role="button"

                                tabIndex={0}

                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault()
                                        toggleCard(question.id)
                                    }
                                }} >

                                <div className="content-inner">
                                    <div className="content-face content-front">
                                        <p className="question-label">Question: </p>
                                        <p>{question.question}</p>
                                    </div>

                                    <div className="content-face content-back">
                                        <p className="question-label">Correct Answer: </p>
                                        <p>
                                            {getAnswerText(question)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}