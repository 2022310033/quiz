import { NavLink } from 'react-router-dom'
import './Navbar.css'

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">Quiz App!</div>

      <ul className="navbar-links">
        <li><NavLink to="/home">Home</NavLink></li>
        <li><NavLink to="/">Sets</NavLink></li>
        <li><NavLink to="/feed">Feed</NavLink></li>
        <li><NavLink to="/about">Store</NavLink></li>
      </ul>
    </nav>
  )
}

export default Navbar
