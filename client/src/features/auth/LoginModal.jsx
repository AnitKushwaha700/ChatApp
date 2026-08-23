import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "./AuthContext";
import { useModal } from "../../context/ModalContext";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";

const LoginModal = () => {
  const { setUser, setIsLogin } = useAuth();
  const { closeLogin, openRegister } = useModal();
  const navigate = useNavigate();

  const [view, setView] = useState("login"); // "login", "forgot_password_email", "forgot_password_otp"
  const [formData, setFormData] = useState({ email: "", password: "", otp: "", newPassword: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearForm = () => {
    setFormData({ email: "", password: "", otp: "", newPassword: "" });
    setView("login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", formData);
      toast.success(res.data.message);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
      setUser(res.data.data);
      setIsLogin(true);
      handleClearForm();
      closeLogin();
      navigate("/chat");
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: formData.email });
      toast.success(res.data.message);
      setView("forgot_password_otp");
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/reset-password", {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      toast.success(res.data.message);
      handleClearForm();
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const res = await api.post("/auth/google", { access_token: tokenResponse.access_token });
        toast.success(res.data.message);
        sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
        setUser(res.data.data);
        setIsLogin(true);
        handleClearForm();
        closeLogin();
        navigate("/chat");
      } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || "Google Login failed");
      } finally {
        setLoading(false);
      }
    },
    onError: () => {
      toast.error("Google Login Failed");
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="bg-base-100 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={closeLogin}
          className="btn btn-sm btn-circle btn-ghost"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8">
        {view === "login" && (
          <>
            <h2 className="text-3xl font-bold text-primary mb-2">Welcome Back</h2>
            <p className="text-base-content/70 mb-8">
              Sign in to continue your conversations
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-medium text-base-content/80">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
              required
              className="input input-bordered w-full bg-base-200/50 focus:bg-base-100 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-base-content/80">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              disabled={loading}
              required
              className="input input-bordered w-full bg-base-200/50 focus:bg-base-100 transition-colors"
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={() => setView("forgot_password_email")}
                className="text-xs text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-white shadow-lg shadow-primary/30"
            >
              {loading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Login to Account"
              )}
            </button>
          </div>
        </form>

        <div className="divider my-6 text-base-content/50 text-sm">OR CONTINUE WITH</div>

        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={() => googleLogin()}
            className="btn btn-outline w-full border-base-300 hover:bg-base-200 hover:border-base-300 text-base-content font-medium transition-all flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-base-content/60">
            Don't have an account?{" "}
            <button
              onClick={openRegister}
              className="text-primary font-semibold hover:underline"
            >
              Register here
            </button>
          </p>
        </div>
          </>
        )}

        {view === "forgot_password_email" && (
          <>
            <h2 className="text-3xl font-bold text-primary mb-2">Reset Password</h2>
            <p className="text-base-content/70 mb-8">
              Enter your email address to receive an OTP
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-base-content/80">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="input input-bordered w-full bg-base-200/50 focus:bg-base-100 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full text-white shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Back to Login
              </button>
            </div>
          </>
        )}

        {view === "forgot_password_otp" && (
          <>
            <h2 className="text-3xl font-bold text-primary mb-2">Enter OTP</h2>
            <p className="text-base-content/70 mb-8">
              Check your email for the 6-digit code
            </p>

            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-base-content/80">
                  OTP Code
                </label>
                <input
                  type="text"
                  name="otp"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="input input-bordered w-full bg-base-200/50 focus:bg-base-100 transition-colors tracking-widest text-center text-xl"
                  maxLength="6"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-base-content/80">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="input input-bordered w-full bg-base-200/50 focus:bg-base-100 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full text-white shadow-lg shadow-primary/30"
                >
                  {loading ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-semibold hover:underline"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default LoginModal;

