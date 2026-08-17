import { Link } from "react-router-dom";
import ThemeDropdown from "./ThemeDropdown";

function Header() {
  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-4 md:px-8">

      {/* Logo */}
      <div className="navbar-start">
        <Link
          to="/"
          className="text-2xl font-bold text-primary"
        >
          ChatApp
        </Link>
      </div>

      {/* Navigation */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal">
          <li>
            <Link to="/" className="font-medium">Home</Link>
          </li>

          <li>
            <Link to="/chat" className="font-medium">Chat</Link>
          </li>
        </ul>
      </div>

      {/* Right */}
      <div className="navbar-end gap-2">

        <ThemeDropdown />

        <Link
          to="/login"
          className="btn btn-primary"
        >
          Login
        </Link>

        <Link
          to="/register"
          className="btn btn-outline btn-primary hidden sm:flex"
        >
          Register
        </Link>

      </div>
    </header>
  );
}

export default Header;