import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import { LogOut, LayoutDashboard, ChevronDown, Settings, MessageSquare } from "lucide-react";
import { applyTheme } from "../lib/theme";
import ThemeDropdown from "../components/ui/ThemeDropdown";

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
    <header className="h-14 sm:h-16 bg-base-100/95 backdrop-blur-md sticky top-0 z-50 border-b border-base-content/10 flex items-center justify-between px-2.5 sm:px-8 select-none transition-colors duration-200">
      {/* Brand: ChatApp */}
      <div
        className="cursor-pointer select-none flex items-center gap-1.5 sm:gap-2 shrink-0"
        onClick={() => navigate("/")}
      >
        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#04BC66] text-white flex items-center justify-center shadow-xs sm:shadow-md shadow-[#04BC66]/20">
          <MessageSquare size={16} strokeWidth={2.5} className="sm:hidden" />
          <MessageSquare size={18} strokeWidth={2.5} className="hidden sm:block" />
        </div>
        <span className="text-lg sm:text-2xl font-black text-[#04BC66] tracking-tight">
          ChatApp
        </span>
      </div>

      {/* Right Header Navigation: FlyonUI Theme Selector + Auth Actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Exact FlyonUI Theme Dropdown */}
        <ThemeDropdown />

        {isLogin ? (
          <details className="dropdown dropdown-end">
            <summary className="flex items-center gap-1.5 sm:gap-2 hover:bg-base-200 p-1 sm:p-1.5 pr-2 sm:pr-3 rounded-full transition-colors border border-base-content/10 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#04BC66] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-xs">
                {userInitial}
              </div>
              <span className="text-xs sm:text-sm font-medium text-base-content hidden sm:block">
                {user?.fullName?.split(" ")[0] || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-base-content/60" />
            </summary>
            <ul className="dropdown-content absolute z-100 menu p-2 shadow-2xl bg-base-100 text-base-content rounded-2xl w-52 mt-3 border border-base-content/15">
              <li className="mb-1">
                <a
                  onClick={() => navigate("/chat")}
                  className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer"
                >
                  <span className="font-medium">Open Chat</span>
                </a>
              </li>
              <li className="mb-1">
                <a
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 text-[#04BC66]" />
                  <span className="font-medium">Dashboard</span>
                </a>
              </li>
              <li className="mb-1">
                <a
                  onClick={() => navigate("/dashboard")}
                  className="flex items-center gap-2 hover:bg-base-200 rounded-xl cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-[#04BC66]" />
                  <span className="font-medium">Settings</span>
                </a>
              </li>
              <div className="divider my-1 border-base-content/10"></div>
              <li>
                <a
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:bg-red-500/10 text-red-500 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Logout</span>
                </a>
              </li>
            </ul>
          </details>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={openLogin}
              className="bg-base-200 hover:bg-base-300 text-base-content font-semibold text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 rounded-full transition-all cursor-pointer shadow-2xs active:scale-95 border border-base-content/10"
            >
              Login
            </button>
            <button
              type="button"
              onClick={openRegister}
              className="bg-[#04BC66] hover:bg-[#03A85B] text-white font-semibold text-xs sm:text-sm px-2.5 sm:px-4 py-1.5 rounded-full transition-all cursor-pointer shadow-xs shadow-[#04BC66]/20 active:scale-95"
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
