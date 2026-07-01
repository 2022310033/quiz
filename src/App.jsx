import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import Home from './content/Home'
import About from './content/About'
import Quiz from './content/Quiz'
import Exam from './content/Exam'
import RealHome from './content/RealHome'
import Feed from './content/feed/Feed'

function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/exam" element={<Exam />} />
          <Route path="/home" element={<RealHome/>} />
          <Route path="/feed" element={<Feed/>} />
          {/* Redirect any unknown routes to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>


    </div>
  )
}

export default App
