import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Home from './content/Home'
import About from './content/About'
import Quiz from './content/Quiz'
import Exam from './content/Exam'
import RealHome from './content/RealHome'
import Feed from './content/feed/Feed'
import History from './content/history/History'
import GeminiExam from './content/gemini/GeminiExam'
import GeminiQuiz from './content/gemini/GeminiQuiz'


function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<RealHome />} />
          <Route path="/sets" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/history" element={<History />} />
          <Route path="/gemini" element={<GeminiExam />} />
          <Route path="/gemini/quiz" element={<GeminiQuiz />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/feed" element={<Feed />} />
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>


    </div>
  )
}

export default App
