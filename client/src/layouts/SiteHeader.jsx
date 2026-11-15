import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import { LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
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
    <header className="h-16 bg-[#12151E] sticky top-0 z-50 border-b border-white/5 flex items-center justify-between px-6 sm:px-10 select-none">
      {/* Brand: ChatApp (exact sampled color #4DC375) */}
      <div
        className="cursor-pointer select-none"
        onClick={() => navigate("/")}
      >
        <span className="text-2xl sm:text-3xl font-black text-[#4DC375] tracking-tight">
          ChatApp
        </span>
      </div>

      {/* Auth Actions (exact colors: Login = White, Register = #04BC66) */}
      <div className="flex items-center gap-3">
        {isLogin ? (
          <details className="dropdown dropdown-end">
            <summary className="flex items-center gap-2 hover:bg-white/10 p-1.5 pr-3 rounded-full transition-colors border border-white/10 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="w-8 h-8 rounded-full bg-[#04BC66] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {userInitial}
              </div>
              <span className="text-sm font-medium text-white hidden sm:block">
                {user?.fullName?.split(" ")[0] || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </summary>
            <ul className="dropdown-content absolute z-100 menu p-2 shadow-2xl bg-[#161b22] text-white rounded-2xl w-52 mt-3 border border-white/10">
              <li className="mb-1">
                <a
                  onClick={() => navigate("/chat")}
                  className="flex items-center gap-2 hover:bg-white/10 rounded-xl"
                >
                  <span className="font-medium">Open Chat</span>
                </a>
              </li>
              <li className="mb-1">
                <a
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 hover:bg-white/10 rounded-xl"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#04BC66]" />
                  <span className="font-medium">Dashboard</span>
                </a>
              </li>
              <div className="divider my-1 border-white/10"></div>
              <li>
                <a
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:bg-red-500/10 text-red-400 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Logout</span>
                </a>
              </li>
            </ul>
          </details>
        ) : (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={openLogin}
              className="bg-white hover:bg-gray-100 text-black font-semibold text-xs sm:text-sm px-4 sm:px-5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Login
            </button>
            <button
              type="button"
              onClick={openRegister}
              className="bg-[#04BC66] hover:bg-[#03A85B] text-white font-semibold text-xs sm:text-sm px-4 sm:px-5 py-1.5 rounded-full transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Register
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default SiteHeader;
