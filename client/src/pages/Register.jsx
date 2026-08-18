import React, { useState } from "react";
import toast from "react-hot-toast";
import api from "../config/api";
import { Link } from "react-router-dom";

const Register = () => {
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
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="w-full max-w-xl">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-3xl justify-center text-primary">
              Register
            </h2>
            <p className="text-center text-base-content/70 mb-6">
              Hello New User 🫡
            </p>

            <form onSubmit={handleSubmit} onReset={handleClearForm} className="space-y-4">
              <div>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Full Name"
                  value={formData.fullName}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input input-bordered w-full"
                />
                {validationError.fullName && (
                  <p className="text-error text-sm mt-1">{validationError.fullName}</p>
                )}
              </div>

              <div>
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input input-bordered w-full"
                />
                {validationError.email && (
                  <p className="text-error text-sm mt-1">{validationError.email}</p>
                )}
              </div>

              <div>
                <input
                  type="tel"
                  name="mobileNumber"
                  placeholder="Mobile Number"
                  maxLength="10"
                  value={formData.mobileNumber}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input input-bordered w-full"
                />
                {validationError.mobileNumber && (
                  <p className="text-error text-sm mt-1">{validationError.mobileNumber}</p>
                )}
              </div>

              <input
                type="password"
                name="password"
                placeholder="Create Password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className="input input-bordered w-full"
              />

              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isLoading}
                  className="input input-bordered w-full"
                />
                {validationError.confirmPassword && (
                  <p className="text-error text-sm mt-1">{validationError.confirmPassword}</p>
                )}
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="reset"
                  disabled={isLoading}
                  className="btn btn-secondary btn-outline flex-1"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary flex-1"
                >
                  {isLoading ? "Submitting..." : "Register"}
                </button>
              </div>
            </form>

            <p className="text-center text-sm text-base-content/60 mt-4">
              Already have an account?{" "}
              <Link to="/login" className="text-primary font-semibold">
                Login here
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-base-content/60 mt-6">
          We respect your privacy 🔒
        </p>
      </div>
    </div>
  );
};

export default Register;