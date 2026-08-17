import { useEffect, useState } from "react";

function Header() {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  };

  return (
    <header className="navbar bg-base-100 border-b border-base-300 px-6">
      {/* Logo */}
      <div className="navbar-start">
        <a className="text-2xl font-bold text-primary">ChatApp</a>
      </div>

      {/* Navigation */}
      <div className="navbar-center hidden md:flex">
        <ul className="menu menu-horizontal gap-2">
          <li>
            <a>Home</a>
          </li>
          <li>
            <a>Chats</a>
          </li>
          <li>
            <a>About</a>
          </li>
        </ul>
      </div>

      {/* Right side */}
      <div className="navbar-end gap-3">
        {/* Theme button */}
        <button
          onClick={toggleTheme}
          className="btn btn-outline btn-primary"
          aria-label="Toggle theme"
        >
          theme
        </button>

        {/* Login */}
        <button className="btn btn-primary hidden sm:inline-flex">Login</button>
      </div>
    </header>
  );
}

export default Header;
