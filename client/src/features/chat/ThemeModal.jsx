import React, { useState } from "react";
import { Check, Palette, X } from "lucide-react";
import { THEME_LIST, applyTheme, getSavedTheme } from "../../lib/theme";

const ThemeModal = ({ isOpen, onClose, onThemeChanged }) => {
  const [selectedTheme, setSelectedTheme] = useState(() => getSavedTheme());
  const [activeCategory, setActiveCategory] = useState("all");

  if (!isOpen) return null;

  const handleSelect = (themeId) => {
    setSelectedTheme(themeId);
    applyTheme(themeId, true);
    if (onThemeChanged) onThemeChanged(themeId);
  };

  const filteredThemes = THEME_LIST.filter((t) => {
    if (activeCategory === "dark") return t.type === "dark";
    if (activeCategory === "light") return t.type === "light";
    return true;
  });

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/75 backdrop-blur-xs px-3 sm:px-4 animate-in fade-in duration-200">
      <div
        className="bg-base-100 text-base-content w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border border-base-content/15 flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-base-content/10 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/15 flex items-center justify-center text-primary shadow-xs">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-base-content tracking-tight">
                FlyonUI Themes
              </h3>
              <p className="text-xs text-base-content/60">
                Official FlyonUI color themes & typography
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-base-200 text-base-content/60 hover:text-base-content transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 shrink-0">
          {[
            { id: "all", label: `All (${THEME_LIST.length})` },
            { id: "dark", label: "🌙 Dark" },
            { id: "light", label: "☀️ Light" },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-content font-bold shadow-sm"
                  : "bg-base-200 hover:bg-base-300 text-base-content/70 hover:text-base-content"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Themes Grid */}
        <div className="overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1 flex-1">
          {filteredThemes.map((theme) => {
            const isSelected = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelect(theme.id)}
                style={{
                  backgroundColor: theme.bg,
                  color: theme.text,
                  borderColor: isSelected ? "var(--color-primary, #7c3aed)" : theme.border,
                }}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between border transition-all duration-150 cursor-pointer font-medium shadow-xs hover:scale-[1.01] active:scale-[0.99] ${
                  isSelected
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-base-100 font-bold shadow-md"
                    : "hover:border-base-content/30 opacity-95 hover:opacity-100"
                } ${theme.fontClass || ""}`}
              >
                {/* Theme Name & Indicator */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-primary bg-primary text-primary-content"
                        : "border-base-content/30 bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="text-sm font-semibold">{theme.name}</span>
                </div>

                {/* FlyonUI 4-Stripe Color Palette Preview */}
                <div className="flex items-center gap-1.5 shrink-0 ml-3">
                  {theme.colors.map((color, idx) => (
                    <span
                      key={idx}
                      className="w-2 h-5 rounded-xs shadow-2xs inline-block"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
