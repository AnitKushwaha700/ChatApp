import { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import api from "../../lib/api";
import { useAuth } from "../../features/auth/AuthContext";
import { useModal } from "../../context/ModalContext";

// How long we wait after the tab regains focus before assuming the Google
// popup went away without ever calling us back (blocked popup, or a
// Cross-Origin-Opener-Policy that severs the popup from this page).
const POPUP_SETTLE_DELAY = 4000;

// Official Google "G" mark. Brand colours are kept as-is so the logo stays
// recognizable on every theme (light and dark) the app supports.
const GoogleIcon = ({ className = "w-5 h-5" }) => (
  <svg
    className={`${className} shrink-0`}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
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
);

/**
 * Custom "Continue with Google" button that follows the same design language
 * as the login / register modals.
 *
 * The OAuth access token is sent to the backend, which resolves the profile
 * directly from Google instead of trusting identity fields from the browser.
 */
const GoogleAuthButton = ({
  text = "Continue with Google",
  className = "",
  disabled = false,
  onSuccess,
  onError,
}) => {
  const { setUser, setIsLogin } = useAuth();
  const { closeLogin, closeRegister } = useModal();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const isConfigured = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const awaitingPopupRef = useRef(false);

  const stopWaiting = () => {
    awaitingPopupRef.current = false;
    setIsLoading(false);
  };

  // Avoid leaving the button spinning if a popup disappears without a GIS
  // callback (for example, when blocked by the browser or the host page).
  useEffect(() => {
    if (!isLoading) return;

    let timer;

    const handleFocus = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (awaitingPopupRef.current) {
          awaitingPopupRef.current = false;
          setIsLoading(false);
          toast.error(
            "Google sign-in didn't finish. Check popup permissions and try again."
          );
        }
      }, POPUP_SETTLE_DELAY);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      window.clearTimeout(timer);
    };
  }, [isLoading]);

  const postGoogleToken = async (accessToken) => {
    const payload = { access_token: accessToken };

    try {
      return await api.post("/auth/google", payload);
    } catch (error) {
      // In local development, retry via Vite's same-origin proxy if the direct
      // API connection failed before returning an HTTP response.
      if (
        import.meta.env.DEV &&
        (error?.message?.includes("Network Error") || !error?.response)
      ) {
        return axios.post("/auth/google", payload, { withCredentials: true });
      }

      throw error;
    }
  };

  const authenticateWithBackend = async (accessToken) => {
    awaitingPopupRef.current = false;

    try {
      setIsLoading(true);
      const res = await postGoogleToken(accessToken);

      toast.success(res.data.message || "Signed in with Google");
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
      setUser(res.data.data);
      setIsLogin(true);

      if (closeLogin) closeLogin();
      if (closeRegister) closeRegister();
      if (onSuccess) onSuccess(res.data);

      navigate("/chat");
    } catch (error) {
      console.error("Google authentication error:", error);
      toast.error(
        error?.response?.data?.message ||
          "Google sign-in failed. Please try again."
      );
      if (onError) onError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useGoogleLogin({
    onSuccess: (tokenResponse) =>
      authenticateWithBackend(tokenResponse.access_token),
    onError: (error) => {
      console.error("Google login failed:", error);
      stopWaiting();
      toast.error("Google sign-in was cancelled or failed.");
      if (onError) onError(error);
    },
    onNonOAuthError: (nonOAuthError) => {
      // GIS reports popup closure as a non-OAuth error. It can mean the user
      // cancelled, but if it closes immediately, check deployed COOP/origin
      // configuration.
      stopWaiting();

      if (nonOAuthError?.type === "popup_failed_to_open") {
        toast.error(
          "Couldn't open the Google popup. Allow popups for this site and try again."
        );
      } else if (nonOAuthError?.type === "popup_closed") {
        toast.error(
          "Google closed the sign-in window before returning a response. If you didn't cancel, check the site's COOP header and Google OAuth authorized origin."
        );
      } else {
        console.error("Unexpected Google popup error:", nonOAuthError);
        toast.error("Google sign-in could not complete. Please try again.");
      }
    },
  });

  const handleClick = () => {
    if (disabled || isLoading) return;

    if (!isConfigured) {
      console.error("VITE_GOOGLE_CLIENT_ID is missing — Google sign-in is disabled.");
      toast.error("Google sign-in is not configured for this build.");
      return;
    }

    // The Google Identity Services script can still be loading (or be blocked).
    if (!window.google?.accounts?.oauth2) {
      toast.error("Google sign-in is still loading. Please try again in a moment.");
      return;
    }

    try {
      awaitingPopupRef.current = true;
      setIsLoading(true);
      login();
    } catch (error) {
      console.error("Failed to start Google login:", error);
      stopWaiting();
      toast.error("Unable to start Google sign-in.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={text}
      title={
        isConfigured
          ? undefined
          : "Add VITE_GOOGLE_CLIENT_ID to the client .env to enable Google sign-in"
      }
      className={`group relative flex w-full items-center justify-center gap-3 h-12 px-5 rounded-xl border border-base-content/15 bg-base-200/60 hover:bg-base-200 active:bg-base-300/80 text-base-content font-semibold text-sm sm:text-base transition-all duration-200 shadow-xs hover:shadow-md hover:shadow-primary/5 hover:border-primary/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-primary/40 focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-linear-to-r from-transparent via-base-content/5 to-transparent transition-transform duration-700 ease-in-out pointer-events-none" />

      {isLoading ? (
        <div className="flex items-center gap-2.5">
          <span className="loading loading-spinner loading-sm text-primary"></span>
          <span className="text-base-content/80 font-medium text-sm">
            Connecting with Google...
          </span>
        </div>
      ) : (
        <>
          <GoogleIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
          <span className="text-base-content/90 font-medium tracking-wide group-hover:text-base-content transition-colors">
            {text}
          </span>
        </>
      )}
    </button>
  );
};

export default GoogleAuthButton;
