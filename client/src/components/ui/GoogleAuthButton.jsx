import { useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../../features/auth/AuthContext";
import { useModal } from "../../context/ModalContext";
import { useNavigate } from "react-router-dom";

const GoogleAuthButton = ({
  text = "Continue with Google",
  onSuccessCallback,
  className = "",
  disabled = false,
}) => {
  const { setUser, setIsLogin } = useAuth();
  const { closeLogin, closeRegister } = useModal();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSuccess = async (tokenResponse) => {
    try {
      setIsLoading(true);

      // Fetch user profile from Google UserInfo endpoint
      const { data: userInfo } = await axios.get(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`,
          },
        }
      );

      // Authenticate with backend API
      const res = await api.post("/auth/google", {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.sub,
        access_token: tokenResponse.access_token,
      });

      toast.success(res.data.message || "Signed in with Google successfully!");
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
      setUser(res.data.data);
      setIsLogin(true);

      if (closeLogin) closeLogin();
      if (closeRegister) closeRegister();
      if (onSuccessCallback) onSuccessCallback(res.data);

      navigate("/chat");
    } catch (error) {
      console.error("Google authentication error:", error);
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Google sign-in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: handleLoginSuccess,
    onError: (error) => {
      console.error("Google login failed:", error);
      toast.error("Google login cancelled or failed.");
      setIsLoading(false);
    },
    onNonOAuthError: (nonOAuthError) => {
      console.warn("Google popup closed or failed to open:", nonOAuthError);
      setIsLoading(false);
    },
  });

  const handleClick = (e) => {
    e.preventDefault();
    if (disabled || isLoading) return;
    try {
      setIsLoading(true);
      login();
    } catch (err) {
      console.error("Failed to start Google login:", err);
      setIsLoading(false);
      toast.error("Unable to initiate Google sign-in.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-label={text}
      className={`group relative flex w-full items-center justify-center gap-3 h-11 px-4 rounded-xl border border-base-300 bg-base-100 hover:bg-base-200/80 active:bg-base-300/60 text-base-content font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:border-primary/40 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none ${className}`}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm text-primary"></span>
          <span className="text-base-content/80 font-medium">Connecting with Google...</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.28-2.1 3.66-5.2 3.66-9.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
            />
          </svg>
          <span className="text-base-content/90 font-medium tracking-wide">
            {text}
          </span>
        </>
      )}
    </button>
  );
};

export default GoogleAuthButton;
