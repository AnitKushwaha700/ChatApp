import React, { useState, useEffect } from "react";
import { useAuth } from "../features/auth/AuthContext";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { User, Mail, Phone, Calendar, Edit3, X, Save } from "lucide-react";

const UserDashboard = () => {
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobileNumber: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || "",
        mobileNumber: user.mobileNumber || "",
      });
    }
  }, [user]);

  if (!isLogin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-base-200">
        <div className="text-center p-8">
          <h1 className="text-4xl font-bold text-error mb-4">Unauthorized Access</h1>
          <p className="text-lg text-base-content/70">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError("");
    setSuccess("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      mobileNumber: user.mobileNumber || "",
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.put("/user/profile", {
        fullName: formData.fullName,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
      });

      if (response.data.data) {
        const updatedUser = { ...user, ...response.data.data };
        setUser(updatedUser);
        sessionStorage.setItem("AppUser", JSON.stringify(updatedUser));
        setSuccess(response.data.message || "Profile updated successfully!");
        setIsEditing(false);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-base-200 py-12 px-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto max-w-3xl relative z-10"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-3">
            Your Dashboard
          </h1>
          <p className="text-base-content/60 text-lg">Manage your profile and account settings.</p>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-error shadow-lg mb-6">
            <span>{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="alert alert-success shadow-lg mb-6 text-success-content">
            <span>{success}</span>
          </motion.div>
        )}

        <div className="card bg-base-100/70 backdrop-blur-xl shadow-2xl border border-white/10 overflow-hidden">
          {/* Cover photo area */}
          <div className="h-32 bg-gradient-to-r from-primary/20 to-secondary/20 relative flex justify-center">
            <div className="absolute -bottom-12">
              <div className="w-24 h-24 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-xl ring ring-base-100 ring-offset-2 ring-offset-base-100">
                <span className="text-4xl font-bold leading-none">{userInitial}</span>
              </div>
            </div>
            
            {!isEditing && (
              <button 
                onClick={handleEdit} 
                className="absolute bottom-4 right-4 btn btn-sm btn-primary shadow-lg"
              >
                <Edit3 className="w-4 h-4 mr-1" /> Edit Profile
              </button>
            )}
          </div>

          <div className="pt-16 pb-8 px-8">
            {!isEditing ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-bold">{user?.fullName || "No Name Provided"}</h2>
                  <p className="text-base-content/60 flex items-center gap-1 mt-1">
                    {user?.email}
                  </p>
                </div>

                <div className="divider my-2"></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-base-200 rounded-lg text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">Full Name</p>
                      <p className="font-medium text-lg mt-0.5">{user?.fullName || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-base-200 rounded-lg text-secondary">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">Email Address</p>
                      <p className="font-medium text-lg mt-0.5">{user?.email || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-base-200 rounded-lg text-accent">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">Mobile Number</p>
                      <p className="font-medium text-lg mt-0.5">{user?.mobileNumber || "Not provided"}</p>
                    </div>
                  </div>

                  {user?.createdAt && (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-base-200 rounded-lg text-info">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">Joined On</p>
                        <p className="font-medium text-lg mt-0.5">
                          {new Date(user.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.form 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                onSubmit={handleSubmit} 
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                      <User className="w-4 h-4" /> Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="input input-bordered w-full bg-base-200/50"
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email Address
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="input input-bordered w-full bg-base-200/50"
                      placeholder="john@example.com"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-base-content/80 flex items-center gap-2">
                      <Phone className="w-4 h-4" /> Mobile Number
                    </label>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className="input input-bordered w-full bg-base-200/50"
                      placeholder="10-digit number"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t border-base-200/50 mt-8">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
                    className="btn btn-ghost"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary shadow-lg shadow-primary/30"
                  >
                    {loading ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <><Save className="w-4 h-4" /> Save Changes</>
                    )}
                  </button>
                </div>
              </motion.form>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UserDashboard;