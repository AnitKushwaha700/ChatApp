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
  const [allUsers, setAllUsers] = useState([]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("mingoTheme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setSelectedTheme(savedTheme);
  }, []);

  useEffect(() => {
    if (isLogin) {
      const fetchUsers = async () => {
        try {
          const res = await api.get("/user/allUsers");
          setAllUsers(res.data.data);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [isLogin]);

  const handleThemeChange = (e) => {
    const theme = e.target.value;
    setSelectedTheme(theme);
    localStorage.setItem("mingoTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    navigate("/");
  };

  const handleSwitchUser = async (userId) => {
    try {
      const res = await api.post("/auth/switch", { userId });
      const switchedUser = res.data.data;
      setUser(switchedUser);
      sessionStorage.setItem("AppUser", JSON.stringify(switchedUser));
      window.location.reload();
    } catch (error) {
      console.error("Failed to switch user", error);
    }
  };

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <div className="bg-base-100/80 backdrop-blur-md sticky top-0 z-40 border-b border-base-200 shadow-sm p-3 flex items-center justify-between px-6">
      <h1
        className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary cursor-pointer hover:opacity-80 transition-opacity"
        onClick={() => navigate("/")}
      >
        ChatApp
      </h1>

      <div className="flex items-center gap-4">
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
              
              {allUsers.length > 0 && (
                <>
                  <div className="divider my-0 text-[10px] text-base-content/40 uppercase font-bold px-4 py-1">Switch Account</div>
                  <div className="max-h-32 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {allUsers.map((u) => (
                      <li key={u._id} className="mb-0.5">
                        <a onClick={() => handleSwitchUser(u._id)} className="flex items-center gap-2 hover:bg-base-200 px-3 py-2">
                          <div className="w-6 h-6 rounded-full bg-secondary text-secondary-content flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold leading-none">{u.fullName?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-xs truncate max-w-[110px]">{u.fullName || u.email}</span>
                        </a>
                      </li>
                    ))}
                  </div>
                </>
              )}

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
          <div className="flex gap-2">
            <button
              className="btn btn-sm btn-ghost hover:bg-primary/10 hover:text-primary font-medium"
              onClick={openLogin}
            >
              Login
            </button>
            <button
              className="btn btn-sm btn-primary shadow-sm"
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
          className="select select-sm select-bordered w-full max-w-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
          value={selectedTheme}
          onChange={handleThemeChange}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="black">Black</option>
          <option value="spotify">Spotify</option>
          <option value="claude">Claude</option>
          <option value="corporate">Corporate</option>
          <option value="ghibli">Ghibli</option>
          <option value="halloween">Halloween</option>
        </select>
      </div>
    </div>
  );
};

export default SiteHeader;
