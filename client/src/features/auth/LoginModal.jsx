import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "./AuthContext";
import { useModal } from "../../context/ModalContext";
import { motion } from "motion/react";
import { X, KeyRound, Mail, ArrowLeft, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GoogleAuthButton from "../../components/ui/GoogleAuthButton";
import OtpInput from "../../components/ui/OtpInput";
import PasswordStrength from "../../components/ui/PasswordStrength";

const LoginModal = () => {
  const { setUser, setIsLogin } = useAuth();
  const { closeLogin, openRegister, initialLoginView } = useModal();
  const navigate = useNavigate();

  const [view, setView] = useState(() => {
    return typeof initialLoginView === "string" &&
      ["login", "forgot_password_email", "forgot_password_otp"].includes(initialLoginView)
      ? initialLoginView
      : "login";
  });
  const [formData, setFormData] = useState({ email: "", password: "", otp: "", newPassword: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (
      typeof initialLoginView === "string" &&
      ["login", "forgot_password_email", "forgot_password_otp"].includes(initialLoginView)
    ) {
      setView(initialLoginView);
    } else {
      setView("login");
    }
  }, [initialLoginView]);

  // 60-second cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearForm = () => {
    setFormData({ email: "", password: "", otp: "", newPassword: "" });
    setView("login");
    setCooldown(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });
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
    e?.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { email: formData.email.trim() });
      toast.success(res.data.message);
      setCooldown(60);
      if (res.data?.devOtp) {
        setFormData((prev) => ({ ...prev, otp: res.data.devOtp }));
      }
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
              className="input input-bordered w-full h-11 rounded-xl bg-base-200/50 focus:bg-base-100 transition-colors"
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
                className="input input-bordered w-full h-11 rounded-xl bg-base-200/50 focus:bg-base-100 transition-colors"
              />
              <div className="flex justify-between items-center mt-1.5">
                <span className="text-xs text-base-content/60">Having trouble?</span>
                <button
                  type="button"
                  onClick={() => setView("forgot_password_email")}
                  className="text-xs font-semibold text-[#00a884] hover:text-[#00c897] hover:underline cursor-pointer transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-12 rounded-xl text-primary-content font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="loading loading-spinner loading-sm"></span>
                    <span>Logging in...</span>
                  </div>
                ) : (
                  "Login to Account"
                )}
              </button>
            </div>
          </form>

          <div className="divider my-6 text-base-content/40 text-xs font-semibold tracking-wider uppercase">
            OR CONTINUE WITH
          </div>

          <GoogleAuthButton
            text="Continue with Google"
            onSuccessCallback={handleClearForm}
          />

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
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setView("login")}
                className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors cursor-pointer"
                title="Back to login"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary">Forgot Password</h2>
            </div>
            <p className="text-base-content/70 text-sm mb-6">
              Enter your registered email address and we'll send you a 6-digit OTP code to reset your password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-base-content/80 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#00a884]" />
                  <span>Email Address</span>
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="Enter your registered email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="input input-bordered w-full h-11 rounded-xl bg-base-200/50 focus:bg-base-100 transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary w-full h-12 rounded-xl text-primary-content font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>Sending OTP Code...</span>
                    </div>
                  ) : (
                    "Send Verification Code"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </button>
            </div>
          </>
        )}

        {view === "forgot_password_otp" && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setView("forgot_password_email")}
                className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors cursor-pointer"
                title="Change email"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="text-2xl sm:text-3xl font-bold text-primary">Verify & Reset</h2>
            </div>
            <p className="text-base-content/70 text-sm mb-5">
              Enter the 6-digit OTP code sent to <span className="font-semibold text-base-content">{formData.email}</span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-base-content/80 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#00a884]" />
                  <span>Enter 6-Digit Code</span>
                </label>
                <OtpInput
                  value={formData.otp}
                  onChange={(val) => setFormData((prev) => ({ ...prev, otp: val }))}
                  disabled={loading}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-base-content/80 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#00a884]" />
                    <span>New Password</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-base-content/60 hover:text-base-content flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPassword ? "Hide" : "Show"}</span>
                  </button>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="newPassword"
                  placeholder="Enter new strong password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  disabled={loading}
                  required
                  className="input input-bordered w-full h-11 rounded-xl bg-base-200/50 focus:bg-base-100 transition-colors"
                />
                <PasswordStrength password={formData.newPassword} />
              </div>

              <div className="flex justify-between items-center text-xs pt-1">
                <span className="text-base-content/60">Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading || cooldown > 0}
                  className={`font-semibold transition-colors cursor-pointer ${
                    cooldown > 0
                      ? "text-base-content/40 cursor-not-allowed"
                      : "text-[#00a884] hover:text-[#00c897] hover:underline"
                  }`}
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || formData.otp.length < 6 || formData.newPassword.length < 6}
                  className="btn btn-primary w-full h-12 rounded-xl text-primary-content font-semibold text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span>Updating Password...</span>
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </form>

            <div className="mt-5 text-center">
              <button
                onClick={() => setView("login")}
                className="text-sm text-primary font-semibold hover:underline inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Sign In</span>
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default LoginModal;

