import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import { LogOut, LayoutDashboard, ChevronDown, Settings, MessageSquare, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { applyTheme } from "../lib/theme";

const SiteHeader = () => {
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const navigate = useNavigate();
  const { openLogin, openRegister } = useModal();

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme, false);
  }, []);

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    navigate("/");
  };

  const userInitial = user?.fullName
    ? user.fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase();

  return (
    <header className="h-14 sm:h-16 sticky top-0 z-50 select-none bg-base-100/80 backdrop-blur-xl border-b border-base-content/10 shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-200">
      <div className="h-full max-w-7xl mx-auto px-3 sm:px-8 flex items-center justify-between">
        {/* 3D Brand Logo */}
        <motion.div
          className="cursor-pointer flex items-center gap-2 group"
          onClick={() => navigate("/")}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 3D Embossed Icon Badge with Specular Reflection */}
          <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#05df7a] via-[#04BC66] to-[#028f4d] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(4,188,102,0.38),inset_0_1px_1px_rgba(255,255,255,0.6),0_2px_0_0_#016938] transition-transform duration-200 group-hover:rotate-[-4deg]">
            <MessageSquare size={18} strokeWidth={2.4} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            <div className="absolute top-0.5 left-1 w-3 h-1 bg-white/40 rounded-full blur-[0.5px] pointer-events-none" />
          </div>

          {/* 3D Styled Brand Name */}
          <div className="flex items-center gap-1.5">
            <span className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-b from-[#04BC66] to-[#018b49] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(4,188,102,0.25)]">
              ChatApp
            </span>
            <span className="hidden xs:flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#04BC66]/15 text-[#04BC66] border border-[#04BC66]/25 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#04BC66] animate-pulse" />
              3D
            </span>
          </div>
        </motion.div>

        {/* Right Header Navigation: 3D Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLogin ? (
            <details className="dropdown dropdown-end">
              <summary className="flex items-center gap-2 p-1 sm:p-1.5 pr-2.5 sm:pr-3 rounded-full cursor-pointer list-none [&::-webkit-details-marker]:hidden bg-base-200/80 hover:bg-base-200 border border-base-content/10 shadow-[0_3px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all duration-150 active:translate-y-0.5">
                {/* 3D User Avatar Sphere */}
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#028f4d] via-[#04BC66] to-[#4eed9c] text-white flex items-center justify-center font-black text-xs shadow-[0_2px_6px_rgba(4,188,102,0.4),inset_0_1px_1px_rgba(255,255,255,0.5)]">
                  {userInitial}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#04BC66] border-2 border-base-100 rounded-full" />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-base-content hidden sm:block">
                  {user?.fullName?.split(" ")[0] || user?.email?.split("@")[0]}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-base-content/60" />
              </summary>
              <ul className="dropdown-content absolute z-100 menu p-2 shadow-2xl bg-base-100/95 backdrop-blur-md text-base-content rounded-2xl w-52 mt-3 border border-base-content/15 animate-in fade-in zoom-in-95 duration-150">
                <li className="mb-1">
                  <a
                    onClick={() => navigate("/chat")}
                    className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer font-medium"
                  >
                    <MessageSquare className="w-4 h-4 text-[#04BC66]" />
                    <span>Open Chat</span>
                  </a>
                </li>
                <li className="mb-1">
                  <a
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer font-medium"
                  >
                    <LayoutDashboard className="w-4 h-4 text-[#04BC66]" />
                    <span>Dashboard</span>
                  </a>
                </li>
                <li className="mb-1">
                  <a
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer font-medium"
                  >
                    <Settings className="w-4 h-4 text-[#04BC66]" />
                    <span>Settings</span>
                  </a>
                </li>
                <div className="divider my-1 border-base-content/10"></div>
                <li>
                  <a
                    onClick={handleLogout}
                    className="flex items-center gap-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors cursor-pointer font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </a>
                </li>
              </ul>
            </details>
          ) : (
            <div className="flex items-center gap-2">
              {/* 3D Glass Login Button */}
              <motion.button
                type="button"
                onClick={openLogin}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="bg-base-200/90 hover:bg-base-300/90 text-base-content font-semibold text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-base-content/10 shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.2)] transition-all cursor-pointer"
              >
                Login
              </motion.button>

              {/* 3D Tactile Register Button */}
              <motion.button
                type="button"
                onClick={openRegister}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                className="relative overflow-hidden bg-gradient-to-b from-[#05df7a] via-[#04BC66] to-[#018e4d] text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-1.5 sm:py-2 rounded-xl shadow-[0_4px_14px_rgba(4,188,102,0.4),0_2px_0_0_#016f3c,inset_0_1px_1px_rgba(255,255,255,0.45)] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={14} className="text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]" />
                <span>Register</span>
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/15 pointer-events-none" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;
