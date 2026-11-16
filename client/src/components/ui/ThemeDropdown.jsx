import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, ChevronUp, Check } from "lucide-react";
import { THEME_LIST, applyTheme, getSavedTheme } from "../../lib/theme";

const ThemeDropdown = ({ className = "" }) => {
  const [currentTheme, setCurrentTheme] = useState(() => getSavedTheme());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Listen for external theme changes
  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail) setCurrentTheme(e.detail);
    };
    window.addEventListener("theme-change", handleThemeChange);
    return () => window.removeEventListener("theme-change", handleThemeChange);
  }, []);

  const handleSelectTheme = (themeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId, true);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block text-left select-none ${className}`}>
      {/* Exact FlyonUI Theme Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#7c3aed]/40 hover:border-[#7c3aed] bg-base-100 hover:bg-[#7c3aed]/10 active:bg-[#7c3aed]/20 text-[#7c3aed] font-medium text-xs sm:text-sm transition-all duration-150 shadow-2xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed]/50"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Theme Selector"
      >
        <span>Theme</span>
        {isOpen ? (
          <ChevronUp size={15} className="text-[#7c3aed] transition-transform" />
        ) : (
          <ChevronDown size={15} className="text-[#7c3aed] transition-transform" />
        )}
      </button>

      {/* FlyonUI Popover Dropdown (Responsive: Floats properly within screen on mobile, anchors right on desktop) */}
      {isOpen && (
        <>
          {/* Mobile backdrop to easily dismiss */}
          <div
            className="fixed inset-0 z-[90] sm:hidden bg-black/20"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed sm:absolute top-16 sm:top-full left-3 right-3 sm:left-auto sm:right-0 sm:mt-2 z-[100] sm:w-72 rounded-2xl bg-base-100 border border-base-content/15 shadow-2xl p-2.5 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md">
            {/* Header */}
            <div className="px-2.5 py-1.5 mb-1.5 border-b border-base-content/10 flex items-center justify-between text-xs text-base-content/70 font-medium">
              <span>FlyonUI Themes</span>
              <span className="text-[10px] uppercase font-bold text-primary tracking-wider">
                {currentTheme}
              </span>
            </div>

            {/* Scrollable List of FlyonUI Themes */}
            <div className="max-h-80 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
              {THEME_LIST.map((theme) => {
                const isSelected = currentTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectTheme(theme.id)}
                    style={{
                      backgroundColor: theme.bg,
                      color: theme.text,
                      borderColor: isSelected ? "var(--color-primary, #7c3aed)" : theme.border,
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between border transition-all duration-150 cursor-pointer font-medium text-sm shadow-2xs hover:scale-[1.01] active:scale-[0.99] group ${
                      isSelected
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-base-100 font-bold"
                        : "hover:border-base-content/30"
                    } ${theme.fontClass || ""}`}
                  >
                    {/* Theme Label & Active Checkmark */}
                    <div className="flex items-center gap-2 truncate">
                      {isSelected ? (
                        <Check size={14} className="stroke-[3] shrink-0 text-primary" />
                      ) : (
                        <span className="w-3.5 inline-block shrink-0" />
                      )}
                      <span className="truncate">{theme.name}</span>
                    </div>

                    {/* FlyonUI 4-Stripe Color Palette Preview */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {theme.colors.map((color, idx) => (
                        <span
                          key={idx}
                          className="w-1.5 h-4.5 rounded-xs shadow-2xs inline-block"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeDropdown;
