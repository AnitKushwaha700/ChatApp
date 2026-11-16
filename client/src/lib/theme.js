import api from "./api";

// Official FlyonUI Themes with their native 4-stripe color palettes and typography
export const THEME_LIST = [
  {
    id: "light",
    name: "Light",
    bg: "#ffffff",
    text: "#1f2937",
    border: "#e5e7eb",
    colors: ["#7c3aed", "#6b7280", "#3b82f6", "#374151"],
    type: "light",
    fontClass: "font-sans",
  },
  {
    id: "dark",
    name: "Dark",
    bg: "#1f1d2b",
    text: "#ffffff",
    border: "#2d2b3b",
    colors: ["#7c3aed", "#6b7280", "#3b82f6", "#9ca3af"],
    type: "dark",
    fontClass: "font-sans",
  },
  {
    id: "black",
    name: "Black",
    bg: "#000000",
    text: "#ffffff",
    border: "#27272a",
    colors: ["#7c3aed", "#0d9488", "#3b82f6", "#ffffff"],
    type: "dark",
    fontClass: "font-sans",
  },
  {
    id: "claude",
    name: "Claude",
    bg: "#f9f6f0",
    text: "#3f3934",
    border: "#e7ded5",
    colors: ["#d97757", "#8b5cf6", "#0e7490", "#111827"],
    type: "light",
    fontClass: "font-serif",
  },
  {
    id: "corporate",
    name: "Corporate",
    bg: "#ffffff",
    text: "#1e3a8a",
    border: "#e2e8f0",
    colors: ["#2563eb", "#6b7280", "#ec4899", "#1e293b"],
    type: "light",
    fontClass: "font-sans",
  },
  {
    id: "ghibli",
    name: "Ghibli",
    bg: "#f2eee3",
    text: "#4a4833",
    border: "#dcd6c5",
    colors: ["#848942", "#334155", "#0d9488", "#334155"],
    type: "light",
    fontClass: "font-serif italic",
  },
  {
    id: "gourmet",
    name: "Gourmet",
    bg: "#fff7ed",
    text: "#9a3412",
    border: "#fed7aa",
    colors: ["#ea580c", "#6b7280", "#ec4899", "#1f2937"],
    type: "light",
    fontClass: "font-sans",
  },
  {
    id: "spotify",
    name: "Spotify",
    bg: "#121212",
    text: "#22c55e",
    border: "#27272a",
    colors: ["#22c55e", "#3f3f46", "#a1a1aa", "#ffffff"],
    type: "dark",
    fontClass: "font-sans tracking-tight",
  },
  {
    id: "luxury",
    name: "Luxury",
    bg: "#09090b",
    text: "#fef08a",
    border: "#27272a",
    colors: ["#eab308", "#71717a", "#f59e0b", "#27272a"],
    type: "dark",
    fontClass: "font-serif",
  },
  {
    id: "pastel",
    name: "Pastel",
    bg: "#faf5ff",
    text: "#581c87",
    border: "#e9d5ff",
    colors: ["#c084fc", "#818cf8", "#38bdf8", "#475569"],
    type: "light",
    fontClass: "font-sans",
  },
  {
    id: "cyberpunk",
    name: "Cyberpunk",
    bg: "#ffee00",
    text: "#000000",
    border: "#eab308",
    colors: ["#ff7597", "#00d5ff", "#ff0055", "#1a103c"],
    type: "light",
    fontClass: "font-mono font-bold",
  },
  {
    id: "synthwave",
    name: "Synthwave",
    bg: "#1a103c",
    text: "#f472b6",
    border: "#31215b",
    colors: ["#e779c1", "#58c7f3", "#f3cc30", "#20134e"],
    type: "dark",
    fontClass: "font-sans tracking-wide",
  },
  {
    id: "retro",
    name: "Retro",
    bg: "#ece3ca",
    text: "#282420",
    border: "#d3c8a9",
    colors: ["#ef9995", "#a4cbb4", "#ebdc99", "#7d7259"],
    type: "light",
    fontClass: "font-serif",
  },
  {
    id: "halloween",
    name: "Halloween",
    bg: "#211f26",
    text: "#f3f0f7",
    border: "#3e3b46",
    colors: ["#f28c18", "#6d3a9c", "#51a800", "#1b1d1d"],
    type: "dark",
    fontClass: "font-sans",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "#171212",
    text: "#31dc64",
    border: "#262222",
    colors: ["#1eb854", "#1db88e", "#1db8ab", "#19362d"],
    type: "dark",
    fontClass: "font-sans",
  },
  {
    id: "aqua",
    name: "Aqua",
    bg: "#1e3a8a",
    text: "#e0f2fe",
    border: "#1d4ed8",
    colors: ["#09ecf3", "#966fb3", "#ffe999", "#3b8ac4"],
    type: "dark",
    fontClass: "font-sans",
  },
];

export const applyTheme = (themeId, persistToServer = false) => {
  let effectiveTheme = themeId;
  if (themeId === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    effectiveTheme = prefersDark ? "dark" : "light";
  }

  document.documentElement.setAttribute("data-theme", effectiveTheme);
  localStorage.setItem("theme", themeId);
  localStorage.setItem("mingoTheme", effectiveTheme);

  const darkThemes = [
    "dark",
    "black",
    "spotify",
    "cyberpunk",
    "synthwave",
    "luxury",
    "halloween",
    "forest",
    "aqua",
  ];

  if (darkThemes.includes(effectiveTheme)) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  // Broadcast custom event so all components react instantly
  window.dispatchEvent(
    new CustomEvent("theme-change", { detail: effectiveTheme })
  );

  if (persistToServer) {
    // Only attempt profile persistence when a real logged-in session exists
    const isUserLoggedIn =
      typeof window !== "undefined" &&
      Boolean(sessionStorage.getItem("AppUser"));
    if (isUserLoggedIn) {
      api.put("/user/profile", { theme: themeId }).catch(() => {
        // Silently ignore background persistence errors
      });
    }
  }
};

export const getSavedTheme = () => {
  return localStorage.getItem("theme") || "dark";
};

if (typeof window !== "undefined" && window.matchMedia) {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (localStorage.getItem("theme") === "system") {
      applyTheme("system", false);
    }
  });
}
