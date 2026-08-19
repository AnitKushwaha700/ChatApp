import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";

const SiteHeader = () => {
  const { user, isLogin } = useAuth();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState("light");
  const { openLogin, openRegister } = useModal();

  useEffect(() => {
    const savedTheme = localStorage.getItem("mingoTheme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    setSelectedTheme(savedTheme);
  }, []);

  const handleThemeChange = (e) => {
    const theme = e.target.value;
    setSelectedTheme(theme);
    localStorage.setItem("mingoTheme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  };

  return (
    <div className="bg-primary p-2 flex items-center justify-between">
      <h1
        className="text-2xl font-bold text-primary-content cursor-pointer"
        onClick={() => navigate("/")}
      >
        ChatApp
      </h1>

      <div className="flex items-center gap-3">
        {isLogin ? (
          <div
            className="flex items-center gap-3 cursor-pointer p-1 border border-primary-content rounded-md transition hover:opacity-80"
            onClick={() => navigate("/dashboard")}
          >
            <span className="text-primary-content text-lg font-semibold text-nowrap">
              Welcome,{" "}
              {user?.fullName?.split(" ")[0] || user?.email?.split("@")[0]}
            </span>
          </div>
        ) : (
          <>
            <button
              className="btn btn-sm btn-outline btn-primary-content text-primary-content border-primary-content"
              onClick={openLogin}
            >
              Login
            </button>
            <button
              className="btn btn-sm btn-outline btn-primary-content text-primary-content border-primary-content"
              onClick={openRegister}
            >
              Register
            </button>
          </>
        )}

        <select
          name="theme"
          id="theme"
          className="select select-bordered w-fit"
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
