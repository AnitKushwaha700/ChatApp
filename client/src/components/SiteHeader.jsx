import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { User, LogOut, LayoutDashboard, ChevronDown } from "lucide-react";
import api from "../config/api";

const SiteHeader = () => {
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState("light");
  const { openLogin, openRegister } = useModal();
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setSelectedTheme(savedTheme);
  }, []);


  const handleThemeChange = (e) => {
    const theme = e.target.value;
    setSelectedTheme(theme);
    localStorage.setItem("theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    navigate("/");
  };


  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <div className="h-16 bg-base-100/80 backdrop-blur-md sticky top-0 z-40 border-b border-base-200 shadow-sm flex items-center justify-between px-4 sm:px-6">
      <h1
        className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate("/")}
      >
        ChatApp
      </h1>

      <div className="flex items-center gap-2 sm:gap-4">
        {isLogin ? (
          <details className="dropdown dropdown-end">
            <summary
              className="flex items-center gap-2 hover:bg-base-200 p-1.5 pr-3 rounded-full transition-colors border border-base-200 cursor-pointer list-none [&::-webkit-details-marker]:hidden"
            >
              <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-sm">
                <span className="font-semibold text-sm leading-none">{userInitial}</span>
              </div>
              <span className="text-sm font-medium hidden sm:block">
                {user?.fullName?.split(" ")[0] || user?.email?.split("@")[0]}
              </span>
              <ChevronDown className="w-4 h-4 text-base-content/60" />
            </summary>
            <ul
              className="dropdown-content absolute z-[100] menu p-2 shadow-2xl bg-base-100 rounded-box w-52 mt-4 border border-base-200"
            >
              <li className="mb-1">
                <a onClick={() => navigate("/dashboard")} className="flex items-center gap-2 hover:bg-base-200">
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  <span className="font-medium">Dashboard</span>
                </a>
              </li>


              <div className="divider my-0"></div>
              <li className="mt-1">
                <a onClick={handleLogout} className="flex items-center gap-2 hover:bg-error/10 hover:text-error transition-colors">
                  <LogOut className="w-4 h-4" />
                  <span className="font-medium">Logout</span>
                </a>
              </li>
            </ul>
          </details>
        ) : (
          <div className="flex gap-1 sm:gap-2">
            <button
              className="btn btn-xs sm:btn-sm btn-ghost hover:bg-primary/10 hover:text-primary font-medium px-2 sm:px-3"
              onClick={openLogin}
            >
              Login
            </button>
            <button
              className="btn btn-xs sm:btn-sm btn-primary shadow-sm px-2 sm:px-3"
              onClick={openRegister}
            >
              Register
            </button>
          </div>
        )}

        <div className="h-6 w-px bg-base-300 hidden sm:block"></div>

        <select
          name="theme"
          id="theme"
          className="select select-xs sm:select-sm select-bordered w-20 sm:w-full max-w-[100px] sm:max-w-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          value={selectedTheme}
          onChange={handleThemeChange}
        >
          {["light", "dark", "black", "spotify", "claude", "corporate", "ghibli", "pastel"].map(theme => (
            <option key={theme} value={theme}>
              {theme.charAt(0).toUpperCase() + theme.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default SiteHeader;
