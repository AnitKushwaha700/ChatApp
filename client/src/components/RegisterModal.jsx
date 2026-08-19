import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../config/api";
import { useModal } from "../context/ModalContext";
import { motion } from "motion/react";
import { X } from "lucide-react";

const RegisterModal = () => {
  const { closeRegister, openLogin } = useModal();

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

    if (
      !/^[\w.]+@(gmail|outlook|yahoo|ricr)\.(com|in|co\.in)$/.test(
        formData.email
      )
    ) {
      Error.email = "Use proper email format";
    }

    if (!/^[6-9]\d{9}$/.test(formData.mobileNumber)) {
      Error.mobileNumber = "Only Indian mobile numbers allowed";
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
          Join us and start chatting today 🚀
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
