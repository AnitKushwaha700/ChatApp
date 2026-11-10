import api from "./api";

export const THEME_LIST = [
  {
    id: "dark",
    name: "Dark",
    desc: "Classic WhatsApp Web dark mode",
    type: "dark",
    color: "#111b21",
    accent: "#00a884",
  },
  {
    id: "light",
    name: "Light",
    desc: "Classic WhatsApp Web light mode",
    type: "light",
    color: "#ffffff",
    accent: "#00a884",
  },
  {
    id: "system",
    name: "System default",
    desc: "Syncs with your device theme",
    type: "system",
    color: "#202c33",
    accent: "#00a884",
  },
  {
    id: "black",
    name: "Midnight OLED",
    desc: "Pure deep black with green accents",
    type: "dark",
    color: "#000000",
    accent: "#00a884",
  },
  {
    id: "spotify",
    name: "WhatsApp Emerald",
    desc: "Signature emerald green vibrancy",
    type: "dark",
    color: "#121212",
    accent: "#1db954",
  },
  {
    id: "claude",
    name: "Claude Warm",
    desc: "Sophisticated terracotta & ivory",
    type: "light",
    color: "#fbfaf8",
    accent: "#d97757",
  },
  {
    id: "corporate",
    name: "Corporate Blue",
    desc: "Crisp modern blue & pure white",
    type: "light",
    color: "#ffffff",
    accent: "#2563eb",
  },
  {
    id: "ghibli",
    name: "Ghibli Garden",
    desc: "Calm sage green & natural warmth",
    type: "light",
    color: "#f4f7f4",
    accent: "#059669",
  },
  {
    id: "pastel",
    name: "Soft Pastel",
    desc: "Gentle lavender & dreamy tones",
    type: "light",
    color: "#faf5ff",
    accent: "#a855f7",
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

  const isDark = ["dark", "black", "spotify", "halloween"].includes(effectiveTheme);
  if (isDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }

  if (persistToServer) {
    api.put("/user/profile", { theme: themeId }).catch(() => {
      // Ignore background persistence errors
    });
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
