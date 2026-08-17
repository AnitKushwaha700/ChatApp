import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

function Header() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) =>
      current === "light" ? "dark" : "light"
    );
  };

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

      {/* Desktop Navigation */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal gap-2">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/chat">Chat</Link>
          </li>
        </ul>
      </div>

      {/* Right Section */}
      <div className="navbar-end gap-2">

        {/* Theme */}
        <button
          onClick={toggleTheme}
          className="btn btn-circle btn-ghost"
          title="Change theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {/* Login */}
        <Link
          to="/login"
          className="btn btn-primary"
        >
          Login
        </Link>

        {/* Register */}
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