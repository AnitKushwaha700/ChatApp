import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useModal } from "../../context/ModalContext";
import { useAuth } from "./AuthContext";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGoogleLogin } from "@react-oauth/google";

const RegisterModal = () => {
  const { closeRegister, openLogin } = useModal();
  const { setUser, setIsLogin } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearForm = () => {
    setFormData({
      fullName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
    });
    setValidationError({});
  };

  const validate = () => {
    let Error = {};

    if (formData.fullName.length < 3) {
      Error.fullName = "Name should be more than 3 characters";
    } else if (!/^[A-Za-z ]+$/.test(formData.fullName)) {
      Error.fullName = "Only alphabets and spaces allowed";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      Error.email = "Use a valid email address format";
    }

    if (!/^\d{10}$/.test(formData.mobileNumber)) {
      Error.mobileNumber = "Please enter a valid 10-digit mobile number";
    }

    if (formData.password !== formData.confirmPassword) {
      Error.confirmPassword = "Passwords do not match";
    }

    setValidationError(Error);
    return Object.keys(Error).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!validate()) {
      setIsLoading(false);
      toast.error("Fill the form correctly");
      return;
    }

    try {
      const res = await api.post("/auth/register", formData);
      toast.success(res.data.message);
      handleClearForm();
      openLogin();
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoading(true);
        const res = await api.post("/auth/google", { access_token: tokenResponse.access_token });
        toast.success(res.data.message);
        sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
        setUser(res.data.data);
        setIsLogin(true);
        handleClearForm();
        closeRegister();
        navigate("/chat");
      } catch (error) {
        console.log(error);
        toast.error(error?.response?.data?.message || "Google Login failed");
      } finally {
        setIsLoading(false);
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
      className="bg-base-100 w-full max-w-xl rounded-2xl shadow-2xl relative overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={closeRegister}
          className="btn btn-sm btn-circle btn-ghost"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-8">
        <h2 className="text-3xl font-bold text-primary mb-2">Create Account</h2>
        <p className="text-base-content/70 mb-8">
          Join us and start chatting today
        </p>

        <form onSubmit={handleSubmit} onReset={handleClearForm} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-base-content/80">Full Name</label>
              <input
                type="text"
                name="fullName"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={handleChange}
                disabled={isLoading}
                className="input input-bordered w-full bg-base-200/50"
              />
              {validationError.fullName && (
                <p className="text-error text-xs mt-1">{validationError.fullName}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-base-content/80">Email</label>
              <input
                type="email"
                name="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className="input input-bordered w-full bg-base-200/50"
              />
              {validationError.email && (
                <p className="text-error text-xs mt-1">{validationError.email}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-base-content/80">Mobile Number</label>
            <input
              type="tel"
              name="mobileNumber"
              placeholder="10-digit number"
              maxLength="10"
              value={formData.mobileNumber}
              onChange={handleChange}
              disabled={isLoading}
              className="input input-bordered w-full bg-base-200/50"
            />
            {validationError.mobileNumber && (
              <p className="text-error text-xs mt-1">{validationError.mobileNumber}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-base-content/80">Password</label>
              <input
                type="password"
                name="password"
                placeholder="Create password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className="input input-bordered w-full bg-base-200/50"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-base-content/80">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isLoading}
                className="input input-bordered w-full bg-base-200/50"
              />
              {validationError.confirmPassword && (
                <p className="text-error text-xs mt-1">{validationError.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full text-white shadow-lg shadow-primary/30"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                "Create Account"
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
            Already have an account?{" "}
            <button
              onClick={openLogin}
              className="text-primary font-semibold hover:underline"
            >
              Login here
            </button>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default RegisterModal;
