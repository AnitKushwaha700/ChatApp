import React from "react";
import { Check, X } from "lucide-react";

export const evaluatePassword = (password = "") => {
  const criteria = [
    { label: "At least 6 characters", met: password.length >= 6 },
    { label: "Contains a number (0-9)", met: /\d/.test(password) },
    { label: "Contains upper & lower case", met: /[a-z]/.test(password) && /[A-Z]/.test(password) },
    { label: "Contains a special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;
  let label = "Weak";
  let color = "bg-red-500";
  let textColor = "text-red-400";

  if (score === 2) {
    label = "Fair";
    color = "bg-amber-500";
    textColor = "text-amber-400";
  } else if (score === 3) {
    label = "Good";
    color = "bg-lime-500";
    textColor = "text-lime-400";
  } else if (score === 4) {
    label = "Strong";
    color = "bg-[#00a884]";
    textColor = "text-[#00a884]";
  }

  return { criteria, score, label, color, textColor };
};

const PasswordStrength = ({ password = "" }) => {
  if (!password) return null;

  const { criteria, score, label, color, textColor } = evaluatePassword(password);

  return (
    <div className="space-y-2 mt-2 select-none animate-in fade-in duration-200">
      {/* Bars */}
      <div className="flex items-center gap-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              step <= score ? color : "bg-[#2a3942]"
            }`}
          />
        ))}
        <span className={`text-xs font-semibold ml-1.5 shrink-0 ${textColor}`}>
          {label}
        </span>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
        {criteria.map((c, i) => (
          <div
            key={i}
            className={`flex items-center gap-1 transition-colors ${
              c.met ? "text-[#00a884]" : "text-[#8696a0]"
            }`}
          >
            {c.met ? <Check size={12} strokeWidth={2.5} /> : <X size={12} />}
            <span>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
