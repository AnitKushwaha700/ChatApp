import { useEffect, useRef, useState } from "react";
import { useGoogleLogin } from "@react-oauth/google";
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
 * as the login / register modals (flyonui `btn`, full width, theme aware).
 *
 * It uses the OAuth access-token flow so the button can be styled freely —
 * Google's pre-rendered <GoogleLogin /> iframe button cannot be themed.
 * Only the access token is sent to the backend; the profile (email, name,
 * picture) is resolved server-side by Google, never trusted from the browser.
 *
 * @param {string}   text     Button label
 * @param {string}   className Extra classes appended to the button
 * @param {boolean}  disabled Disable the button (e.g. while a form submits)
 * @param {Function} onSuccess Called with the API response data after sign-in
 * @param {Function} onError   Called with the error when sign-in fails
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

  // True while Google's popup is open and we are waiting for a callback.
  const awaitingPopupRef = useRef(false);

  const stopWaiting = () => {
    awaitingPopupRef.current = false;
    setIsLoading(false);
  };

  // Safety net: when the popup goes away Google normally answers through
  // onSuccess / onError / onNonOAuthError. If it never does (popup blocker, or
  // a Cross-Origin-Opener-Policy that cuts the popup off from this page) the
  // button would spin forever — so release it once the tab is back in focus.
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
            "Google sign-in didn't finish. Allow popups for this site and try again."
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

  const authenticateWithBackend = async (accessToken) => {
    awaitingPopupRef.current = false;

    try {
      setIsLoading(true);

      const res = await api.post("/auth/google", { access_token: accessToken });

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
      // cancelled, but if the popup closes immediately, the deployed COOP
      // header or Google OAuth origin settings may be wrong.
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
    if (isLoading) return;

    if (!isConfigured) {
      console.error("VITE_GOOGLE_CLIENT_ID is missing — Google sign-in is disabled.");
      toast.error("Google sign-in is not configured for this build.");
      return;
    }

    // The Google Identity Services script can still be loading (or be blocked).
    // Calling login() before then does nothing, so guard the spinner.
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
      className={`btn btn-outline btn-neutral w-full ${className}`.trim()}
    >
      {isLoading ? (
        <>
          <span className="loading loading-spinner loading-sm"></span>
          <span>Connecting...</span>
        </>
      ) : (
        <>
          <GoogleIcon />
          <span>{text}</span>
        </>
      )}
    </button>
  );
};

export default GoogleAuthButton;
