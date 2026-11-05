import React from "react";
import {
  MessageSquare,
  CircleDashed,
  Users,
  Star,
  Settings,
  Palette,
} from "lucide-react";

const NavigationRail = ({
  activeTab = "chats",
  setActiveTab,
  onTabChange,
  unreadTotal = 0,
  hasNewStatus = false,
  hasUnviewedStatus = false,
  user,
  onOpenProfile,
  onOpenSettings,
  onOpenThemeModal,
}) => {
  const handleTabClick = (tabId) => {
    if (onTabChange) onTabChange(tabId);
    if (setActiveTab) setActiveTab(tabId);
  };

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http")
      ? url
      : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
  };

  const navItems = [
    {
      id: "chats",
      label: "Chats",
      icon: MessageSquare,
      badge: unreadTotal > 0 ? (unreadTotal > 99 ? "99+" : unreadTotal) : null,
    },
    {
      id: "status",
      label: "Status",
      icon: CircleDashed,
      dot: hasNewStatus || hasUnviewedStatus,
    },
    {
      id: "groups",
      label: "Communities",
      icon: Users,
    },
    {
      id: "starred",
      label: "Starred messages",
      icon: Star,
    },
  ];

  return (
    <aside className="w-[60px] h-full bg-[#202c33] border-r border-[#222e35] flex flex-col items-center justify-between py-3 shrink-0 select-none z-30">
      {/* Top Nav Buttons */}
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

      {/* Bottom Actions */}
      <div className="flex flex-col items-center gap-2.5 w-full">
        {/* Theme Picker */}
        <button
          type="button"
          onClick={onOpenThemeModal}
          className="w-10 h-10 rounded-full flex items-center justify-center text-base-content/70 hover:bg-black/5 dark:hover:bg-white/5 hover:text-base-content transition-all cursor-pointer border-none outline-none"
          title="Theme & Appearance"
        >
          <Palette size={20} />
        </button>

        {/* Settings */}
        <div className="relative group w-full flex justify-center">
          <button
            type="button"
            onClick={onOpenSettings}
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
          onClick={onOpenProfile}
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
  );
};

export default NavigationRail;
