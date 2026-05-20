import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Quiz App!</div>

      <ul className="navbar-links">
        <li><NavLink to="/">Home</NavLink></li>
        <li><NavLink to="/about">Store</NavLink></li>
        <li><NavLink to="/quiz">Quiz</NavLink></li>
        <li><NavLink to="/exam">Exam</NavLink></li>
      </ul>
    </nav>
  )
}

export default Navbar
