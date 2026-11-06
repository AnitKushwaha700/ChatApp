import React, { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Edit2,
  Lock,
  Bell,
  Palette,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Ban,
  X,
  Search,
  Key,
  ShieldCheck,
  Keyboard,
  MessageSquare,
  Download,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Trash2,
  Archive,
  Eye,
  Sliders,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { THEME_LIST, applyTheme, getSavedTheme } from "../../lib/theme";

const ABOUT_PRESETS = [
  "Available",
  "Busy",
  "At school",
  "At the movies",
  "At work",
  "Battery about to die",
  "Can't talk, WhatsApp only",
  "In a meeting",
  "At the gym",
  "Sleeping",
  "Urgent calls only",
];

const WALLPAPER_PRESETS = [
  { id: "default", name: "Default Dark", color: "#0b141a", bg: "bg-[#0b141a]" },
  { id: "green", name: "WhatsApp Green", color: "#005c4b", bg: "bg-[#005c4b]" },
  { id: "burgundy", name: "Burgundy", color: "#3d1222", bg: "bg-[#3d1222]" },
  { id: "navy", name: "Midnight Navy", color: "#111f38", bg: "bg-[#111f38]" },
  { id: "charcoal", name: "Charcoal", color: "#1f2c34", bg: "bg-[#1f2c34]" },
  { id: "forest", name: "Forest", color: "#1a382b", bg: "bg-[#1a382b]" },
  { id: "doodle", name: "Classic Doodle", color: "#121b22", bg: "bg-[#121b22]" },
  { id: "sunset", name: "Sunset Crimson", color: "#42201d", bg: "bg-[#42201d]" },
  { id: "lavender", name: "Muted Lavender", color: "#2e2538", bg: "bg-[#2e2538]" },
];

const KEYBOARD_SHORTCUTS = [
  { keys: ["Ctrl", "Alt", "N"], desc: "New chat" },
  { keys: ["Ctrl", "Alt", "Shift", "N"], desc: "New group" },
  { keys: ["Ctrl", "Alt", "/"], desc: "Search chat" },
  { keys: ["Ctrl", "Alt", "Tab"], desc: "Next chat" },
  { keys: ["Ctrl", "Alt", "Shift", "Tab"], desc: "Previous chat" },
  { keys: ["Escape"], desc: "Close chat" },
  { keys: ["Ctrl", "Alt", "Shift", "U"], desc: "Mark as unread" },
  { keys: ["Ctrl", "Alt", "Shift", "M"], desc: "Mute chat" },
  { keys: ["Ctrl", "Alt", "Shift", "E"], desc: "Archive chat" },
  { keys: ["Ctrl", "Alt", "Shift", "P"], desc: "Pin chat" },
  { keys: ["Ctrl", "Alt", "Backspace"], desc: "Delete chat" },
  { keys: ["Ctrl", "Alt", "P"], desc: "Profile & About" },
  { keys: ["Ctrl", "Alt", ","], desc: "Settings" },
  { keys: ["Ctrl", "Alt", "E"], desc: "Emoji panel" },
];

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const ProfileSettingsDrawer = ({
  isOpen,
  onClose,
  initialTab = "settings",
  onLogout,
  onOpenThemeModal,
}) => {
  const { user, setUser } = useAuth();
  const [currentView, setCurrentView] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");

  // Sync initial tab when drawer opens
  useEffect(() => {
    if (isOpen) {
      setCurrentView(initialTab || "settings");
      setSearchQuery("");
    }
  }, [isOpen, initialTab]);

  // Profile Edit States
  const [isEditingName, setIsEditingName] = useState(false);
  const [name, setName] = useState(user?.fullName || "");
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [about, setAbout] = useState(user?.about || "Hey there! I am using WhatsApp.");
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef(null);

  // Settings & Preferences States
  const [currentTheme, setCurrentTheme] = useState(() => getSavedTheme());
  const [selectedWallpaper, setSelectedWallpaper] = useState(user?.wallpaper || "default");
  const [includeDoodles, setIncludeDoodles] = useState(true);
  const [wallpaperDim, setWallpaperDim] = useState(20);
  const [enterIsSend, setEnterIsSend] = useState(() => {
    return localStorage.getItem("wa_enter_is_send") !== "false";
  });

  // Privacy States
  const [privacyLastSeen, setPrivacyLastSeen] = useState(user?.privacy?.lastSeen || "everyone");
  const [privacyPhoto, setPrivacyPhoto] = useState(user?.privacy?.profilePic || "everyone");
  const [privacyAbout, setPrivacyAbout] = useState(user?.privacy?.about || "everyone");
  const [readReceipts, setReadReceipts] = useState(user?.privacy?.readReceipts ?? true);
  const [disappearingTimer, setDisappearingTimer] = useState("off");
  const [groupsPrivacy, setGroupsPrivacy] = useState("everyone");
  const [blockedUsers, setBlockedUsers] = useState(user?.blockedUsers || []);

  // Notifications States
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState(true);
  const [showPreviews, setShowPreviews] = useState(true);
  const [reactionAlerts, setReactionAlerts] = useState(true);
  const [callRingtone, setCallRingtone] = useState(true);

  // Account States
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [twoStepEnabled, setTwoStepEnabled] = useState(false);
  const [accountReportRequested, setAccountReportRequested] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, isDanger }

  // Sync user state
  useEffect(() => {
    if (user) {
      setName(user.fullName || "");
      setAbout(user.about || "Hey there! I am using WhatsApp.");
      setReadReceipts(user.privacy?.readReceipts ?? true);
      setPrivacyLastSeen(user.privacy?.lastSeen || "everyone");
      setPrivacyPhoto(user.privacy?.profilePic || "everyone");
      setPrivacyAbout(user.privacy?.about || "everyone");
      setSelectedWallpaper(user.wallpaper || "default");
      setBlockedUsers(user.blockedUsers || []);
      if (user.theme) {
        setCurrentTheme(user.theme);
      }
    }
  }, [user]);

  // Profile save handlers
  const handleSaveName = async () => {
    if (!name.trim()) return;
    try {
      const res = await api.put("/user/profile", { fullName: name.trim() });
      setUser(res.data.data);
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update name", err);
    }
  };

  const handleSaveAbout = async (newAbout) => {
    const val = (newAbout ?? about).trim();
    if (!val) return;
    try {
      const res = await api.put("/user/profile", { about: val });
      setUser(res.data.data);
      setAbout(val);
      setIsEditingAbout(false);
    } catch (err) {
      console.error("Failed to update about", err);
    }
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append("profilePic", file);
      const res = await api.put("/user/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(res.data.data);
    } catch (err) {
      console.error("Failed to upload avatar", err);
    } finally {
      setUploadingPic(false);
    }
  };

  const handleRemoveProfilePic = async () => {
    try {
      const res = await api.put("/user/profile", { profilePic: "" });
      setUser(res.data.data);
    } catch (err) {
      console.error("Failed to remove photo", err);
    }
  };

  // Privacy update handler
  const handleUpdatePrivacy = async (key, value) => {
    const updatedPrivacy = {
      lastSeen: privacyLastSeen,
      profilePic: privacyPhoto,
      about: privacyAbout,
      readReceipts: readReceipts,
      [key]: value,
    };

    if (key === "lastSeen") setPrivacyLastSeen(value);
    if (key === "profilePic") setPrivacyPhoto(value);
    if (key === "about") setPrivacyAbout(value);
    if (key === "readReceipts") setReadReceipts(value);

    try {
      const res = await api.put("/user/profile", {
        privacy: updatedPrivacy,
      });
      setUser(res.data.data);
    } catch (err) {
      console.error("Failed to update privacy", err);
    }
  };

  // Wallpaper handler
  const handleSelectWallpaper = async (wpId) => {
    setSelectedWallpaper(wpId);
    try {
      const res = await api.put("/user/profile", { wallpaper: wpId });
      setUser(res.data.data);
    } catch (err) {
      console.error("Failed to update wallpaper", err);
    }
  };

  // Theme handler
  const handleSelectTheme = (themeId) => {
    setCurrentTheme(themeId);
    applyTheme(themeId, true);
  };

  // Toggle Enter is Send
  const handleToggleEnterIsSend = () => {
    const nextVal = !enterIsSend;
    setEnterIsSend(nextVal);
    localStorage.setItem("wa_enter_is_send", String(nextVal));
  };

  // Unblock user
  const handleUnblockUser = async (userId) => {
    const nextBlocked = blockedUsers.filter((u) => (u._id || u) !== userId);
    setBlockedUsers(nextBlocked);
    try {
      const res = await api.put("/user/profile", { blockedUsers: nextBlocked });
      setUser(res.data.data);
    } catch (err) {
      console.error("Failed to unblock user", err);
    }
  };

  // Navigation back handler
  const handleBack = () => {
    if (currentView === "settings" || currentView === "profile") {
      onClose();
    } else {
      setCurrentView("settings");
    }
  };

  if (!isOpen) return null;

  // Search filter for settings menu
  const menuOptions = [
    {
      id: "account",
      label: "Account",
      desc: "Security notifications, two-step verification, delete account",
      icon: Key,
    },
    {
      id: "privacy",
      label: "Privacy",
      desc: "Block contacts, disappearing messages, read receipts",
      icon: Lock,
    },
    {
      id: "chats",
      label: "Chats",
      desc: "Theme, wallpaper, chat history",
      icon: MessageSquare,
    },
    {
      id: "notifications",
      label: "Notifications",
      desc: "Message sounds, desktop alerts, call ringtone",
      icon: Bell,
    },
    {
      id: "shortcuts",
      label: "Keyboard shortcuts",
      desc: "Quick shortcuts and navigation commands",
      icon: Keyboard,
    },
    {
      id: "help",
      label: "Help",
      desc: "Help centre, contact us, terms and privacy policy",
      icon: HelpCircle,
    },
  ];

  const filteredMenuOptions = menuOptions.filter((opt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return opt.label.toLowerCase().includes(q) || opt.desc.toLowerCase().includes(q);
  });

  const getHeaderTitle = () => {
    switch (currentView) {
      case "profile":
        return "Profile";
      case "account":
        return "Account";
      case "privacy":
        return "Privacy";
      case "chats":
        return "Chats";
      case "theme":
        return "Theme";
      case "wallpaper":
        return "Chat wallpaper";
      case "notifications":
        return "Notifications";
      case "shortcuts":
        return "Keyboard shortcuts";
      case "help":
        return "Help";
      case "blocked":
        return "Blocked contacts";
      default:
        return "Settings";
    }
  };

  return (
    <div className="fixed inset-y-0 left-0 sm:left-[60px] z-40 w-full sm:w-[420px] bg-[#111b21] dark:bg-[#111b21] text-[#e9edef] border-r border-[#222e35] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 select-none">
      {/* 1. TOP HEADER */}
      <div className="h-[108px] bg-[#202c33] dark:bg-[#202c33] flex items-end px-5 pb-4 gap-6 border-b border-[#222e35] shrink-0">
        <button
          onClick={handleBack}
          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[19px] font-medium text-[#e9edef] tracking-tight">
          {getHeaderTitle()}
        </h2>
      </div>

      {/* 2. DRAWER BODY */}
      <div className="flex-1 overflow-y-auto whatsapp-scrollbar flex flex-col">
        {/* ==================== VIEW: MAIN SETTINGS ==================== */}
        {currentView === "settings" && (
          <div className="flex flex-col pb-6">
            {/* Search Settings Input */}
            <div className="p-3 bg-[#111b21] border-b border-[#222e35]/60">
              <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
                <Search className="w-4 h-4 text-[#8696a0] shrink-0" />
                <input
                  type="text"
                  placeholder="Search settings"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none pl-3 text-sm text-[#e9edef] placeholder-[#8696a0]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="p-0.5 text-[#8696a0] hover:text-[#e9edef] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* User Profile Card */}
            {!searchQuery && (
              <div
                onClick={() => setCurrentView("profile")}
                className="flex items-center gap-4 px-6 py-4 bg-[#111b21] hover:bg-[#202c33] transition-colors cursor-pointer border-b border-[#222e35]/60 group"
              >
                <div className="relative w-16 h-16 rounded-full bg-[#202c33] overflow-hidden flex items-center justify-center shrink-0 border border-[#2a3942] group-hover:border-[#00a884] transition-colors">
                  {user?.profilePic ? (
                    <img
                      src={getMediaUrl(user.profilePic)}
                      alt={user.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-[#8696a0]" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-[#e9edef] truncate">
                    {user?.fullName || "WhatsApp User"}
                  </h3>
                  <p className="text-xs text-[#8696a0] truncate mt-0.5">
                    {user?.about || "Hey there! I am using WhatsApp."}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#8696a0] group-hover:text-[#e9edef] transition-colors" />
              </div>
            )}

            {/* Menu List */}
            <div className="py-1 divide-y divide-[#222e35]/40">
              {filteredMenuOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setCurrentView(opt.id)}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-[#202c33] transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-5 min-w-0 pr-3">
                      <Icon className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884] transition-colors shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-normal text-[#e9edef] truncate">
                          {opt.label}
                        </p>
                        <p className="text-xs text-[#8696a0] truncate mt-0.5">
                          {opt.desc}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#8696a0] group-hover:text-[#e9edef] shrink-0 transition-colors" />
                  </div>
                );
              })}

              {/* Log out item */}
              {!searchQuery && (
                <div
                  onClick={onLogout}
                  className="flex items-center gap-5 px-6 py-4 hover:bg-red-500/10 transition-colors cursor-pointer text-red-400 hover:text-red-300"
                >
                  <LogOut className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="text-[15px] font-medium block">Log out</span>
                    <span className="text-xs text-red-400/70">Disconnect from WhatsApp Web</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== VIEW: PROFILE ==================== */}
        {currentView === "profile" && (
          <div className="flex flex-col pb-8">
            {/* Avatar Section */}
            <div className="py-8 flex flex-col items-center justify-center bg-[#111b21]">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="relative group w-44 h-44 rounded-full overflow-hidden cursor-pointer shadow-xl bg-[#202c33] flex items-center justify-center border-4 border-[#202c33]"
              >
                {user?.profilePic ? (
                  <img
                    src={getMediaUrl(user.profilePic)}
                    alt={user.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-24 h-24 text-[#8696a0]" />
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                  <Camera className="w-7 h-7 mb-1.5" />
                  <span className="text-[11px] font-semibold tracking-wider uppercase">
                    {uploadingPic ? "Uploading..." : "Change photo"}
                  </span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleProfilePicUpload}
                accept="image/*"
                className="hidden"
              />

              {user?.profilePic && (
                <button
                  onClick={handleRemoveProfilePic}
                  className="mt-3 text-xs text-red-400 hover:text-red-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove photo</span>
                </button>
              )}
            </div>

            {/* Name Section */}
            <div className="bg-[#111b21] px-7 py-4 border-b border-[#222e35]/60">
              <span className="text-[13px] text-[#00a884] font-medium block mb-2">
                Your name
              </span>
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={25}
                    className="w-full bg-transparent text-base text-[#e9edef] border-b-2 border-[#00a884] pb-1 outline-none font-normal"
                    autoFocus
                  />
                  <span className="text-xs text-[#8696a0] shrink-0">{25 - name.length}</span>
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-[#00a884] hover:text-[#00a884]/80 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-base text-[#e9edef] font-normal">
                    {user?.fullName || "Not set"}
                  </span>
                  <button
                    onClick={() => {
                      setName(user?.fullName || "");
                      setIsEditingName(true);
                    }}
                    className="text-[#8696a0] hover:text-[#00a884] p-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-[12px] text-[#8696a0] mt-3 leading-relaxed">
                This is not your username or pin. This name will be visible to your WhatsApp contacts.
              </p>
            </div>

            {/* About Section */}
            <div className="bg-[#111b21] px-7 py-4">
              <span className="text-[13px] text-[#00a884] font-medium block mb-2">
                About
              </span>
              {isEditingAbout ? (
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="text"
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    maxLength={100}
                    className="w-full bg-transparent text-base text-[#e9edef] border-b-2 border-[#00a884] pb-1 outline-none font-normal"
                    autoFocus
                  />
                  <span className="text-xs text-[#8696a0] shrink-0">{100 - about.length}</span>
                  <button
                    onClick={() => handleSaveAbout()}
                    className="p-1 text-[#00a884] hover:text-[#00a884]/80 cursor-pointer"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-base text-[#e9edef] font-normal">
                    {user?.about || "Hey there! I am using WhatsApp."}
                  </span>
                  <button
                    onClick={() => {
                      setAbout(user?.about || "");
                      setIsEditingAbout(true);
                    }}
                    className="text-[#8696a0] hover:text-[#00a884] p-1 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Presets List */}
              <div className="mt-4 pt-3 border-t border-[#222e35]/60 space-y-1">
                <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-2">
                  Select an About status
                </span>
                {ABOUT_PRESETS.map((preset) => (
                  <div
                    key={preset}
                    onClick={() => handleSaveAbout(preset)}
                    className="p-2.5 rounded-lg hover:bg-[#202c33] text-sm text-[#d1d7db] hover:text-white cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <span>{preset}</span>
                    {user?.about === preset && (
                      <Check className="w-4 h-4 text-[#00a884]" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW: ACCOUNT ==================== */}
        {currentView === "account" && (
          <div className="flex flex-col py-3 divide-y divide-[#222e35]/50">
            {/* Security Notifications */}
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Security notifications</p>
                <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                  Get notified when your security code changes for an end-to-end encrypted chat with a contact.
                </p>
              </div>
              <input
                type="checkbox"
                checked={securityAlerts}
                onChange={() => setSecurityAlerts(!securityAlerts)}
                className="toggle toggle-success toggle-sm cursor-pointer mt-1"
              />
            </div>

            {/* Two-step Verification */}
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-normal text-[#e9edef]">Two-step verification</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00a884]/20 text-[#00a884] font-medium">
                    {twoStepEnabled ? "Active" : "Recommended"}
                  </span>
                </div>
                <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                  For extra security, turn on two-step verification to require a 6-digit PIN when registering your account again.
                </p>
              </div>
              <input
                type="checkbox"
                checked={twoStepEnabled}
                onChange={() => setTwoStepEnabled(!twoStepEnabled)}
                className="toggle toggle-success toggle-sm cursor-pointer mt-1"
              />
            </div>

            {/* Request Account Info */}
            <div className="px-6 py-4">
              <p className="text-[15px] font-normal text-[#e9edef]">Request account info</p>
              <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                Create a report of your WhatsApp account information and settings, which you can access or port to another app.
              </p>
              <button
                onClick={() => setAccountReportRequested(true)}
                disabled={accountReportRequested}
                className="mt-3 px-4 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-sm text-[#00a884] font-medium transition-colors cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{accountReportRequested ? "Report requested (Ready in 3 days)" : "Request report"}</span>
              </button>
            </div>

            {/* Delete Account */}
            <div className="px-6 py-4">
              <div
                onClick={() =>
                  setConfirmModal({
                    title: "Delete account?",
                    message:
                      "Deleting your account will erase your message history, delete you from all WhatsApp groups, and delete your profile completely. This action cannot be undone.",
                    onConfirm: () => {
                      setConfirmModal(null);
                      if (onLogout) onLogout();
                    },
                    isDanger: true,
                  })
                }
                className="flex items-center gap-3 text-red-400 hover:text-red-300 cursor-pointer py-1"
              >
                <Trash2 className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-[15px] font-medium">Delete my account</p>
                  <p className="text-xs text-red-400/70">Permanently erase account & all data</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW: PRIVACY ==================== */}
        {currentView === "privacy" && (
          <div className="flex flex-col py-2 divide-y divide-[#222e35]/50">
            {/* Header info */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Who can see my personal info
              </span>
            </div>

            {/* Last Seen and Online */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Last seen and online</p>
                <p className="text-xs text-[#8696a0] capitalize">{privacyLastSeen}</p>
              </div>
              <select
                value={privacyLastSeen}
                onChange={(e) => handleUpdatePrivacy("lastSeen", e.target.value)}
                className="bg-[#202c33] text-sm text-[#e9edef] rounded-lg px-2.5 py-1.5 border border-[#2a3942] outline-none cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Profile Photo */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Profile photo</p>
                <p className="text-xs text-[#8696a0] capitalize">{privacyPhoto}</p>
              </div>
              <select
                value={privacyPhoto}
                onChange={(e) => handleUpdatePrivacy("profilePic", e.target.value)}
                className="bg-[#202c33] text-sm text-[#e9edef] rounded-lg px-2.5 py-1.5 border border-[#2a3942] outline-none cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* About */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">About</p>
                <p className="text-xs text-[#8696a0] capitalize">{privacyAbout}</p>
              </div>
              <select
                value={privacyAbout}
                onChange={(e) => handleUpdatePrivacy("about", e.target.value)}
                className="bg-[#202c33] text-sm text-[#e9edef] rounded-lg px-2.5 py-1.5 border border-[#2a3942] outline-none cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Read Receipts */}
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Read receipts</p>
                <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                  If turned off, you won't send or receive Read receipts (blue ticks). Read receipts are always sent for group chats.
                </p>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={() => handleUpdatePrivacy("readReceipts", !readReceipts)}
                className="toggle toggle-success toggle-sm cursor-pointer mt-1"
              />
            </div>

            {/* Disappearing Messages */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Default message timer</p>
                <p className="text-xs text-[#8696a0]">
                  {disappearingTimer === "off" ? "Off" : disappearingTimer}
                </p>
              </div>
              <select
                value={disappearingTimer}
                onChange={(e) => setDisappearingTimer(e.target.value)}
                className="bg-[#202c33] text-sm text-[#e9edef] rounded-lg px-2.5 py-1.5 border border-[#2a3942] outline-none cursor-pointer"
              >
                <option value="off">Off</option>
                <option value="24 hours">24 hours</option>
                <option value="7 days">7 days</option>
                <option value="90 days">90 days</option>
              </select>
            </div>

            {/* Groups */}
            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Groups</p>
                <p className="text-xs text-[#8696a0] capitalize">{groupsPrivacy}</p>
              </div>
              <select
                value={groupsPrivacy}
                onChange={(e) => setGroupsPrivacy(e.target.value)}
                className="bg-[#202c33] text-sm text-[#e9edef] rounded-lg px-2.5 py-1.5 border border-[#2a3942] outline-none cursor-pointer"
              >
                <option value="everyone">Everyone</option>
                <option value="contacts">My contacts</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Blocked Contacts Link */}
            <div
              onClick={() => setCurrentView("blocked")}
              className="px-6 py-4 flex items-center justify-between hover:bg-[#202c33] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <Ban className="w-5 h-5 text-[#8696a0]" />
                <div>
                  <p className="text-[15px] font-normal text-[#e9edef]">Blocked contacts</p>
                  <p className="text-xs text-[#8696a0]">
                    {blockedUsers.length} contact{blockedUsers.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696a0]" />
            </div>
          </div>
        )}

        {/* ==================== VIEW: CHATS ==================== */}
        {currentView === "chats" && (
          <div className="flex flex-col py-2 divide-y divide-[#222e35]/50">
            {/* Display / Theme */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Display
              </span>
            </div>

            <div
              onClick={() => setCurrentView("theme")}
              className="px-6 py-3.5 flex items-center justify-between hover:bg-[#202c33] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <Palette className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884] transition-colors" />
                <div>
                  <p className="text-[15px] font-normal text-[#e9edef]">Theme</p>
                  <p className="text-xs text-[#8696a0] capitalize">
                    {THEME_LIST.find((t) => t.id === currentTheme)?.name || currentTheme}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696a0]" />
            </div>

            <div
              onClick={() => setCurrentView("wallpaper")}
              className="px-6 py-3.5 flex items-center justify-between hover:bg-[#202c33] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <Sliders className="w-5 h-5 text-[#8696a0] group-hover:text-[#00a884] transition-colors" />
                <div>
                  <p className="text-[15px] font-normal text-[#e9edef]">Chat wallpaper</p>
                  <p className="text-xs text-[#8696a0]">Choose background color & doodles</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#8696a0]" />
            </div>

            {/* Chat Settings */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Chat settings
              </span>
            </div>

            {/* Enter is Send */}
            <div className="px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Enter is send</p>
                <p className="text-xs text-[#8696a0] mt-1 leading-relaxed">
                  Enter key will send your message. Shift + Enter adds a new line.
                </p>
              </div>
              <input
                type="checkbox"
                checked={enterIsSend}
                onChange={handleToggleEnterIsSend}
                className="toggle toggle-success toggle-sm cursor-pointer mt-1"
              />
            </div>

            {/* Media Auto-download */}
            <div className="px-6 py-4">
              <p className="text-[15px] font-normal text-[#e9edef]">Media auto-download</p>
              <p className="text-xs text-[#8696a0] mt-1 mb-3">
                Choose which media files download automatically in chat.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {["Photos", "Audio", "Videos", "Documents"].map((mediaType) => (
                  <label
                    key={mediaType}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-[#202c33] text-xs text-[#e9edef] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="checkbox checkbox-success checkbox-xs"
                    />
                    <span>{mediaType}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chat History Management */}
            <div className="px-6 py-3 space-y-2">
              <button
                onClick={() =>
                  setConfirmModal({
                    title: "Archive all chats?",
                    message: "Are you sure you want to archive all active conversations?",
                    onConfirm: () => setConfirmModal(null),
                  })
                }
                className="w-full text-left py-2 text-sm text-[#00a884] hover:underline cursor-pointer flex items-center gap-2"
              >
                <Archive className="w-4 h-4" />
                <span>Archive all chats</span>
              </button>

              <button
                onClick={() =>
                  setConfirmModal({
                    title: "Clear all messages?",
                    message: "Messages will be cleared from all chats on this device.",
                    onConfirm: () => setConfirmModal(null),
                    isDanger: true,
                  })
                }
                className="w-full text-left py-2 text-sm text-red-400 hover:underline cursor-pointer flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear all messages</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================== VIEW: THEME ==================== */}
        {currentView === "theme" && (
          <div className="p-6 flex flex-col gap-6">
            <div>
              <span className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider block mb-3">
                General
              </span>
              <div className="space-y-2">
                {[
                  { id: "dark", name: "Dark", desc: "Classic WhatsApp Web dark mode", icon: Moon },
                  { id: "light", name: "Light", desc: "Classic WhatsApp Web light mode", icon: Sun },
                  { id: "system", name: "System default", desc: "Matches computer system theme", icon: Monitor },
                ].map((th) => {
                  const Icon = th.icon;
                  const isSelected = currentTheme === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => handleSelectTheme(th.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-[#202c33] border-[#00a884] text-white"
                          : "border-[#2a3942]/60 hover:bg-[#202c33]/50 text-[#d1d7db]"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <Icon className="w-5 h-5 text-[#00a884]" />
                        <div>
                          <p className="text-sm font-medium">{th.name}</p>
                          <p className="text-xs text-[#8696a0]">{th.desc}</p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isSelected
                            ? "border-[#00a884] bg-[#00a884]"
                            : "border-[#8696a0] bg-transparent"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-[#222e35]/60">
              <span className="text-xs font-semibold text-[#8696a0] uppercase tracking-wider block mb-3">
                Custom WhatsApp Palettes
              </span>
              <div className="grid grid-cols-2 gap-3">
                {THEME_LIST.slice(3).map((th) => {
                  const isSelected = currentTheme === th.id;
                  return (
                    <div
                      key={th.id}
                      onClick={() => handleSelectTheme(th.id)}
                      className={`p-3 rounded-xl border flex flex-col justify-between h-24 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#00a884] bg-[#202c33] ring-1 ring-[#00a884]"
                          : "border-[#2a3942] bg-[#111b21] hover:border-[#8696a0]/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="w-3.5 h-3.5 rounded-full shadow-xs"
                          style={{ backgroundColor: th.accent }}
                        />
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-[#00a884] flex items-center justify-center text-black">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-[#e9edef]">{th.name}</p>
                        <p className="text-[11px] text-[#8696a0] line-clamp-1">{th.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIEW: WALLPAPER ==================== */}
        {currentView === "wallpaper" && (
          <div className="p-6 space-y-6">
            <div>
              <p className="text-sm text-[#8696a0] mb-3">
                Choose your default chat background:
              </p>
              <div className="grid grid-cols-3 gap-3">
                {WALLPAPER_PRESETS.map((wp) => (
                  <div
                    key={wp.id}
                    onClick={() => handleSelectWallpaper(wp.id)}
                    className={`relative h-24 rounded-xl ${wp.bg} border-2 flex items-center justify-center cursor-pointer transition-all ${
                      selectedWallpaper === wp.id
                        ? "border-[#00a884] shadow-lg scale-[1.02]"
                        : "border-[#2a3942] hover:border-[#8696a0]"
                    }`}
                  >
                    <span className="text-[11px] font-medium text-white/90 drop-shadow text-center px-1">
                      {wp.name}
                    </span>
                    {selectedWallpaper === wp.id && (
                      <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00a884] text-black flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Doodle pattern toggle */}
            <div className="p-4 rounded-xl bg-[#202c33] flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#e9edef]">Add WhatsApp doodles</p>
                <p className="text-xs text-[#8696a0] mt-0.5">Show classic icons wallpaper overlay</p>
              </div>
              <input
                type="checkbox"
                checked={includeDoodles}
                onChange={() => setIncludeDoodles(!includeDoodles)}
                className="checkbox checkbox-success checkbox-sm"
              />
            </div>

            {/* Wallpaper Dimming */}
            <div className="p-4 rounded-xl bg-[#202c33] space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#e9edef] font-medium">Wallpaper Dimming</span>
                <span className="text-[#8696a0]">{wallpaperDim}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                value={wallpaperDim}
                onChange={(e) => setWallpaperDim(Number(e.target.value))}
                className="range range-xs range-success w-full cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ==================== VIEW: NOTIFICATIONS ==================== */}
        {currentView === "notifications" && (
          <div className="flex flex-col py-2 divide-y divide-[#222e35]/50">
            {/* Messages */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Messages
              </span>
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Message sounds</p>
                <p className="text-xs text-[#8696a0]">Play sounds for incoming and outgoing messages</p>
              </div>
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={() => setSoundEnabled(!soundEnabled)}
                className="toggle toggle-success toggle-sm cursor-pointer"
              />
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Desktop alerts</p>
                <p className="text-xs text-[#8696a0]">Show notifications for new messages</p>
              </div>
              <input
                type="checkbox"
                checked={desktopAlerts}
                onChange={() => setDesktopAlerts(!desktopAlerts)}
                className="toggle toggle-success toggle-sm cursor-pointer"
              />
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Show previews</p>
                <p className="text-xs text-[#8696a0]">Show message text in new message notifications</p>
              </div>
              <input
                type="checkbox"
                checked={showPreviews}
                onChange={() => setShowPreviews(!showPreviews)}
                className="toggle toggle-success toggle-sm cursor-pointer"
              />
            </div>

            {/* Calls */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Calls
              </span>
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Incoming call ringtone</p>
                <p className="text-xs text-[#8696a0]">Play audio for incoming audio & video calls</p>
              </div>
              <input
                type="checkbox"
                checked={callRingtone}
                onChange={() => setCallRingtone(!callRingtone)}
                className="toggle toggle-success toggle-sm cursor-pointer"
              />
            </div>

            {/* Reactions */}
            <div className="px-6 py-2">
              <span className="text-[12px] uppercase font-semibold text-[#8696a0] tracking-wider">
                Reactions
              </span>
            </div>

            <div className="px-6 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-[15px] font-normal text-[#e9edef]">Reaction notifications</p>
                <p className="text-xs text-[#8696a0]">Show notifications for reactions to messages you send</p>
              </div>
              <input
                type="checkbox"
                checked={reactionAlerts}
                onChange={() => setReactionAlerts(!reactionAlerts)}
                className="toggle toggle-success toggle-sm cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ==================== VIEW: KEYBOARD SHORTCUTS ==================== */}
        {currentView === "shortcuts" && (
          <div className="p-6">
            <p className="text-xs text-[#8696a0] mb-4">
              Use these keyboard shortcuts to navigate WhatsApp Web faster:
            </p>
            <div className="space-y-2.5">
              {KEYBOARD_SHORTCUTS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] transition-colors"
                >
                  <span className="text-sm text-[#e9edef]">{item.desc}</span>
                  <div className="flex items-center gap-1">
                    {item.keys.map((k, kIdx) => (
                      <kbd
                        key={kIdx}
                        className="px-2 py-0.5 text-xs font-mono font-medium rounded bg-[#111b21] text-[#00a884] border border-[#2a3942]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== VIEW: HELP ==================== */}
        {currentView === "help" && (
          <div className="flex flex-col py-3 divide-y divide-[#222e35]/50">
            <div className="px-6 py-4 flex items-center justify-between hover:bg-[#202c33] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <HelpCircle className="w-5 h-5 text-[#8696a0]" />
                <div>
                  <p className="text-[15px] font-normal text-[#e9edef]">Help Centre</p>
                  <p className="text-xs text-[#8696a0]">Frequently asked questions & tips</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#8696a0]" />
            </div>

            <div className="px-6 py-4 flex items-center justify-between hover:bg-[#202c33] transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <ShieldCheck className="w-5 h-5 text-[#8696a0]" />
                <div>
                  <p className="text-[15px] font-normal text-[#e9edef]">Terms & Privacy Policy</p>
                  <p className="text-xs text-[#8696a0]">Legal agreements and user rights</p>
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-[#8696a0]" />
            </div>

            {/* Contact us feedback form */}
            <div className="px-6 py-4">
              <p className="text-[15px] font-normal text-[#e9edef] mb-1">Contact us</p>
              <p className="text-xs text-[#8696a0] mb-3">Tell us how we can improve WhatsApp Web</p>
              {feedbackSent ? (
                <div className="p-3 rounded-lg bg-[#00a884]/20 text-[#00a884] text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Thank you! Your feedback has been received.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Describe your issue or suggestions..."
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-[#202c33] text-sm text-[#e9edef] border border-[#2a3942] outline-none focus:border-[#00a884] resize-none"
                  />
                  <button
                    disabled={!feedbackText.trim()}
                    onClick={() => {
                      setFeedbackSent(true);
                      setFeedbackText("");
                    }}
                    className="px-4 py-1.5 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Send feedback
                  </button>
                </div>
              )}
            </div>

            {/* Version Footer */}
            <div className="px-6 py-6 text-center text-xs text-[#8696a0] space-y-1">
              <p className="font-medium text-[#e9edef]">WhatsApp Web</p>
              <p>Version 2.3000.101893812</p>
              <p className="text-[11px] pt-1">End-to-end encrypted messaging</p>
            </div>
          </div>
        )}

        {/* ==================== VIEW: BLOCKED CONTACTS ==================== */}
        {currentView === "blocked" && (
          <div className="p-6">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-12 text-[#8696a0] text-sm flex flex-col items-center gap-2">
                <Ban className="w-10 h-10 text-[#8696a0]/50" />
                <p>No blocked contacts</p>
                <p className="text-xs text-[#8696a0]/70 max-w-xs">
                  Blocked contacts will no longer be able to call you or send you messages.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {blockedUsers.map((bu, idx) => {
                  const uid = bu._id || bu;
                  const label = bu.fullName || bu.email || String(bu);
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-[#202c33] border border-[#2a3942]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#111b21] flex items-center justify-center text-xs font-bold text-[#00a884]">
                          {label.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-[#e9edef] truncate max-w-[180px]">
                          {label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(uid)}
                        className="text-xs text-[#00a884] hover:underline cursor-pointer font-medium"
                      >
                        Unblock
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== CONFIRMATION MODAL ==================== */}
      {confirmModal && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#202c33] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 border border-[#2a3942] animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-semibold text-lg text-[#e9edef]">{confirmModal.title}</h3>
            <p className="text-[#8696a0] text-sm leading-relaxed">{confirmModal.message}</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                  confirmModal.isDanger
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21]"
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSettingsDrawer;
