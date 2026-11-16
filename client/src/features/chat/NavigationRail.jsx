import React from "react";
import { MessageSquare, CircleDashed, Phone, Palette, Settings } from "lucide-react";

const NavigationRail = ({
  activeTab = "chats",
  setActiveTab,
  onTabChange,
  unreadTotal = 0,
  hasNewStatus = false,
  hasUnviewedStatus = false,
  user,
  selectedFriend = null,
  onOpenProfile,
  onOpenSettings,
  onOpenThemeModal,
}) => {
  const handleTabClick = (tabId) => {
    if (onTabChange) {
      onTabChange(tabId);
    } else if (setActiveTab) {
      setActiveTab(tabId);
    } else if (tabId === "settings" && onOpenSettings) {
      onOpenSettings();
    } else if (tabId === "profile" && onOpenProfile) {
      onOpenProfile();
    }
  };

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http")
      ? url
      : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
  };

  // 3 Core Working Tabs matching WhatsApp Mobile: Chats, Updates, Calls
  const navItems = [
    {
      id: "chats",
      label: "Chats",
      icon: MessageSquare,
      badge: unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : unreadTotal) : null,
    },
    {
      id: "status",
      label: "Updates",
      icon: CircleDashed,
      dot: hasNewStatus || hasUnviewedStatus,
    },
    {
      id: "calls",
      label: "Calls",
      icon: Phone,
    },
  ];

  return (
    <>
      {/* 1. DESKTOP VERTICAL RAIL (hidden on mobile, visible on md:flex) */}
      <aside className="hidden md:flex w-[60px] h-full bg-[#202c33] border-r border-[#222e35] flex-col items-center justify-between py-3 shrink-0 select-none z-30">
        {/* Top Nav Buttons (Chats, Updates/Status, Calls) */}
        <div className="flex flex-col items-center gap-2 w-full">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group w-full flex justify-center">
                <button
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border-none outline-none relative ${
                    isActive
                      ? "bg-black/10 dark:bg-white/10 text-[#00a884] dark:text-[#00a884]"
                      : "text-base-content/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-base-content"
                  }`}
                  title={item.label}
                >
                  <Icon size={20} />
                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#00a884] rounded-r-md"></span>
                  )}
                  {/* Unread Pill Badge */}
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-[#25d366] text-black text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {/* Story Dot */}
                  {item.dot && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00a884] rounded-full ring-2 ring-base-100"></span>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Bottom Actions on Desktop (Settings, Profile) */}
        <div className="flex flex-col items-center gap-2.5 w-full">
          {/* Settings */}
          <div className="relative group w-full flex justify-center">
            <button
              type="button"
              onClick={() => handleTabClick("settings")}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer border-none outline-none relative ${
                activeTab === "settings"
                  ? "bg-black/10 dark:bg-white/10 text-[#00a884] dark:text-[#00a884]"
                  : "text-base-content/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-base-content"
              }`}
              title="Settings"
            >
              <Settings size={20} />
              {activeTab === "settings" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#00a884] rounded-r-md"></span>
              )}
            </button>
          </div>

          {/* User Profile Avatar */}
          <button
            type="button"
            onClick={() => handleTabClick("profile")}
            className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all cursor-pointer p-0 bg-transparent ${
              activeTab === "profile"
                ? "border-[#00a884] ring-2 ring-[#00a884]/40"
                : "border-transparent hover:border-[#00a884]"
            }`}
            title="Profile"
          >
            {user?.profilePic ? (
              <img
                src={getMediaUrl(user.profilePic)}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#00a884] text-white font-bold text-xs flex items-center justify-center">
                {user?.fullName?.charAt(0).toUpperCase() || "U"}
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* 2. AUTHENTIC MOBILE BOTTOM NAVIGATION BAR (Android/iOS WhatsApp Mobile) */}
      {!selectedFriend && (
        <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-[62px] bg-[#202c33] border-t border-[#222e35] items-center justify-around px-2 select-none z-50 shadow-2xl pb-[env(safe-area-inset-bottom)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleTabClick(item.id)}
                className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer border-none outline-none bg-transparent ${
                  isActive ? "text-[#00a884]" : "text-[#8696a0] hover:text-[#e9edef]"
                }`}
              >
                <div
                  className={`relative flex items-center justify-center px-4 py-0.5 rounded-full transition-colors ${
                    isActive ? "bg-[#00a884]/15" : ""
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.4 : 2} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 bg-[#25d366] text-black text-[9px] font-bold px-1.5 min-w-[16px] h-[16px] rounded-full flex items-center justify-center shadow-xs">
                      {item.badge}
                    </span>
                  )}
                  {item.dot && (
                    <span className="absolute top-0 right-1 w-2.5 h-2.5 bg-[#00a884] rounded-full ring-2 ring-[#202c33]"></span>
                  )}
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 ${
                    isActive ? "font-bold text-[#00a884]" : "font-medium text-[#8696a0]"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Settings Tab (Standard WhatsApp iOS/Android Mobile) */}
          <button
            type="button"
            onClick={() => handleTabClick("settings")}
            className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-all cursor-pointer border-none outline-none bg-transparent ${
              activeTab === "settings" ? "text-[#00a884]" : "text-[#8696a0] hover:text-[#e9edef]"
            }`}
          >
            <div
              className={`relative flex items-center justify-center px-4 py-0.5 rounded-full transition-colors ${
                activeTab === "settings" ? "bg-[#00a884]/15" : ""
              }`}
            >
              <Settings size={22} strokeWidth={activeTab === "settings" ? 2.4 : 2} />
            </div>
            <span
              className={`text-[11px] tracking-tight mt-0.5 ${
                activeTab === "settings" ? "font-bold text-[#00a884]" : "font-medium text-[#8696a0]"
              }`}
            >
              Settings
            </span>
          </button>
        </nav>
      )}
    </>
  );
};

export default NavigationRail;
