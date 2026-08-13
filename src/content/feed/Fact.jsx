import './Feed.css'
import { useEffect, useState } from 'react'

export default function Facts(){

    const [facts, setFacts] = useState('Click me to generate a fact!')
    const [loading, isLoading] = useState(false)

    const fetchFact = async () => {

        isLoading(true)

        try{
            const response = await fetch('https://factfacts.com/api.php')
            const data = await response.json()
            setFacts(data.fact.text)
        } catch {
            setFacts('Error try one more time')
        } finally {
            isLoading(false)
        }

    }

    return(
        <>
        <button className='random-fact-float' onClick={fetchFact}>
            {loading ? 'Holup' : facts}
        </button>
        </>
    )
}