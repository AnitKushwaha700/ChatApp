import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { useModal } from "../context/ModalContext";
import { LogOut, LayoutDashboard, ChevronDown } from "lucide-react";

const SiteHeader = () => {
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const navigate = useNavigate();
  const { openLogin, openRegister } = useModal();
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    navigate("/");
  };


  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <div className="h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-base-100/80 backdrop-blur-md sticky top-0 z-40 border-b border-base-200 shadow-sm flex items-center justify-between px-4 sm:px-6">
      <h1
        className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary cursor-pointer hover:opacity-80 transition-opacity"
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
              className="dropdown-content absolute z-100 menu p-2 shadow-2xl bg-base-100 rounded-box w-52 mt-4 border border-base-200"
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
          <div className="flex gap-2 sm:gap-3 shrink-0">
            <button
              className="btn btn-sm sm:btn-md btn-ghost hover:bg-primary/10 hover:text-primary font-medium px-3 sm:px-5 rounded-full"
              onClick={openLogin}
            >
              Login
            </button>
            <button
              className="btn btn-sm sm:btn-md btn-primary shadow-sm px-3 sm:px-5 rounded-full"
              onClick={openRegister}
            >
              Register
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SiteHeader;
