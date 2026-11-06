import React, { useState } from "react";
import { Check, Moon, Sun, Monitor, Palette, Sparkles, X } from "lucide-react";
import { THEME_LIST, applyTheme, getSavedTheme } from "../../lib/theme";

const ThemeModal = ({ isOpen, onClose, onThemeChanged }) => {
  const [selectedTheme, setSelectedTheme] = useState(() => getSavedTheme());

  if (!isOpen) return null;

  const handleSelect = (themeId) => {
    setSelectedTheme(themeId);
    applyTheme(themeId, true);
    if (onThemeChanged) onThemeChanged(themeId);
  };

  const mainThemes = THEME_LIST.slice(0, 3);
  const extraThemes = THEME_LIST.slice(3);

  const getThemeIcon = (id) => {
    if (id === "dark") return <Moon className="w-5 h-5 text-[#00a884]" />;
    if (id === "light") return <Sun className="w-5 h-5 text-[#f59e0b]" />;
    if (id === "system") return <Monitor className="w-5 h-5 text-[#00a884]" />;
    return <Sparkles className="w-4 h-4 text-[#00a884]" />;
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4 animate-in fade-in duration-150">
      <div
        className="bg-[#202c33] dark:bg-[#202c33] text-[#e9edef] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-[#2a3942] flex flex-col gap-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2a3942] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00a884]/15 flex items-center justify-center text-[#00a884]">
              <Palette className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-medium text-[#e9edef] tracking-tight">Theme</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="overflow-y-auto whatsapp-scrollbar flex flex-col gap-4 pr-1">
          {/* WhatsApp Primary Radio Options */}
          <div className="space-y-1">
            <span className="text-xs uppercase font-semibold text-[#8696a0] tracking-wider block mb-2 px-1">
              General
            </span>
            {mainThemes.map((theme) => {
              const isSelected = selectedTheme === theme.id;
              return (
                <label
                  key={theme.id}
                  onClick={() => handleSelect(theme.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-[#2a3942]/60 text-white" : "hover:bg-[#2a3942]/30 text-[#d1d7db]"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {getThemeIcon(theme.id)}
                    <div>
                      <p className="text-sm font-medium">{theme.name}</p>
                      <p className="text-xs text-[#8696a0]">{theme.desc}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? "border-[#00a884] bg-[#00a884]"
                        : "border-[#8696a0] bg-transparent"
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Color Palettes */}
          <div className="space-y-2 pt-2 border-t border-[#2a3942]/60">
            <span className="text-xs uppercase font-semibold text-[#8696a0] tracking-wider block mb-1 px-1">
              Custom WhatsApp Palettes
            </span>
            <div className="grid grid-cols-2 gap-2">
              {extraThemes.map((theme) => {
                const isSelected = selectedTheme === theme.id;
                return (
                  <div
                    key={theme.id}
                    onClick={() => handleSelect(theme.id)}
                    className={`p-3 rounded-xl border flex flex-col justify-between h-20 cursor-pointer transition-all ${
                      isSelected
                        ? "border-[#00a884] bg-[#2a3942]/80 shadow-md ring-1 ring-[#00a884]"
                        : "border-[#2a3942] bg-[#111b21]/60 hover:border-[#8696a0]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <span className="text-xs font-medium text-[#e9edef] truncate max-w-[100px]">
                          {theme.name}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#00a884] flex items-center justify-center text-black">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-[#8696a0] line-clamp-1">
                      {theme.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-[#2a3942]">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium text-[#00a884] hover:bg-[#2a3942] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-sm font-semibold bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] transition-colors cursor-pointer shadow-md"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThemeModal;
