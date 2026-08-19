import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../config/api";
import { useAuth } from "../context/AuthContext";
import { useModal } from "../context/ModalContext";
import { motion } from "motion/react";
import { X } from "lucide-react";

const LoginModal = () => {
  const { setUser, setIsLogin } = useAuth();
  const { closeLogin, openRegister } = useModal();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClearForm = () => {
    setFormData({ email: "", password: "" });
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
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Login failed");
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
        <h2 className="text-3xl font-bold text-primary mb-2">Welcome Back</h2>
        <p className="text-base-content/70 mb-8">
          Sign in to continue your conversations
        </p>

        <form onSubmit={handleSubmit} onReset={handleClearForm} className="space-y-5">
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
      </div>
    </motion.div>
  );
};

export default LoginModal;
