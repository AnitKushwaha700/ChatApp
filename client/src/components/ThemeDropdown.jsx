import { useEffect, useState, useRef } from "react";

const themes = [
  "light",
  "dark",
  "black",
  "claude",
  "corporate",
  "ghibli",
  "gourmet",
  "luxury",
  "mintlify",
  "pastel",
  "perplexity",
  "shadcn",
  "slack",
  "soft",
  "spotify",
  "valorant",
  "vscode",
];

function ThemeDropdown() {
  const [theme, setTheme] = useState(
    localStorage.getItem("theme") || "light"
  );
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleOutsideClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
    setOpen(false);
  };

  return (
    <div ref={ref} className="dropdown dropdown-end relative">
      <button
        type="button"
        className="btn btn-outline"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Theme
      </button>

      <ul
        className={`dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52 absolute right-0 mt-2 z-50 ${open ? "block" : "hidden"}`}
        role="menu"
        aria-hidden={!open}
      >
        {themes.map((themeName) => (
          <li key={themeName}>
            <button
              type="button"
              className={`w-full text-left px-2 py-1 rounded ${
                theme === themeName ? "bg-base-200" : "hover:bg-base-200"
              }`}
              onClick={() => handleThemeChange(themeName)}
            >
              {themeName.charAt(0).toUpperCase() +
                themeName.slice(1)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ThemeDropdown;