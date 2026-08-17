import { useEffect, useState } from "react";

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

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (selectedTheme) => {
    setTheme(selectedTheme);
  };

  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        className="dropdown-toggle btn btn-outline"
        aria-haspopup="menu"
        aria-expanded="false"
      >
        Theme
      </button>

      <ul
        className="dropdown-menu hidden min-w-52"
        role="menu"
      >
        {themes.map((themeName) => (
          <li key={themeName}>
            <button
              type="button"
              className={`btn btn-text w-full justify-start ${
                theme === themeName ? "bg-base-200" : ""
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