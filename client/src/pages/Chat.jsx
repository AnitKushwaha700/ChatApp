import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, MessageSquare, ShieldCheck } from "lucide-react";
import api from "../lib/api";
import socketAPI from "../lib/webSocket";
import { useAuth } from "../features/auth/AuthContext";

// WhatsApp Feature Subcomponents
import NavigationRail from "../features/chat/NavigationRail";
import ChatSidebar from "../features/chat/ChatSidebar";
import Chatting from "../features/chat/Chatting";
import StatusDrawer from "../features/chat/StatusDrawer";
import StatusViewer from "../features/chat/StatusViewer";
import NewChatDrawer from "../features/chat/NewChatDrawer";
import NewGroupDrawer from "../features/chat/NewGroupDrawer";
import GroupInfoDrawer from "../features/chat/GroupInfoDrawer";
import ProfileSettingsDrawer from "../features/chat/ProfileSettingsDrawer";
import ThemeModal from "../features/chat/ThemeModal";
import CallModal from "../features/chat/CallModal";
import { applyTheme, getSavedTheme } from "../lib/theme";

const Chat = () => {
  const navigate = useNavigate();
  const { user, isLogin, setUser, setIsLogin } = useAuth();

  // Active chat & interaction states
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [allUsers, setAllUsers] = useState([]);

  // Drawers and navigation tabs
  const [activeRailTab, setActiveRailTab] = useState("chats");
  const [isStatusDrawerOpen, setIsStatusDrawerOpen] = useState(false);
  const [activeStatusViewerItem, setActiveStatusViewerItem] = useState(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupDrawerOpen, setIsNewGroupDrawerOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [profileSettingsTab, setProfileSettingsTab] = useState("settings");
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Statuses state
  const [statuses, setStatuses] = useState([]);

  // Call states
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callData, setCallData] = useState(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get("/user/me");
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to fetch user data", error);
    }
  }, [setUser]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await api.get("/status");
      const { recentUpdates = [], viewedUpdates = [] } = res.data.data || {};
      setStatuses([...recentUpdates, ...viewedUpdates]);
    } catch (err) {
      console.error("Failed to fetch status updates", err);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await api.get("/user/allusers");
      setAllUsers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch all users", err);
    }
  }, []);

  useEffect(() => {
    if (!isLogin) {
      navigate("/");
    } else {
      fetchMe();
      fetchStatuses();
      fetchAllUsers();
      const currentTheme = getSavedTheme();
      applyTheme(currentTheme, false);
    }
  }, [isLogin, navigate, fetchMe, fetchStatuses, fetchAllUsers]);

  // Keyboard shortcut listener (WhatsApp standard: Ctrl+Alt+, for Settings, Escape to close)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && (e.key === "," || e.code === "Comma")) {
        e.preventDefault();
        setActiveRailTab("settings");
        setProfileSettingsTab("settings");
        setIsProfileSettingsOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        if (isProfileSettingsOpen) setIsProfileSettingsOpen(false);
        if (isStatusDrawerOpen) setIsStatusDrawerOpen(false);
        if (isNewChatOpen) setIsNewChatOpen(false);
        if (isNewGroupDrawerOpen) setIsNewGroupDrawerOpen(false);
        if (isGroupInfoOpen) setIsGroupInfoOpen(false);
        if (isThemeModalOpen) setIsThemeModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isProfileSettingsOpen,
    isStatusDrawerOpen,
    isNewChatOpen,
    isNewGroupDrawerOpen,
    isGroupInfoOpen,
    isThemeModalOpen,
  ]);

  // Socket connection & room setup
  useEffect(() => {
    if (isLogin && user) {
      if (!socketAPI.connected) {
        socketAPI.connect();
      }
      socketAPI.emit("createPath", user._id);
    }
  }, [isLogin, user]);

  // Socket event listeners
  useEffect(() => {
    const handleOnlineUsers = (users) => setOnlineUsers(users);
    const handleTyping = ({ from }) => {
      if (from) setTypingUsers((prev) => ({ ...prev, [from]: true }));
    };
    const handleStopTyping = ({ from }) => {
      if (from) {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[from];
          return updated;
        });
      }
    };
    const handleIncomingCall = (data) => {
      setIncomingCall(true);
      setCallData({
        from: data.from,
        name: data.name || "User",
        isVideo: data.isVideo,
      });
    };
    const handleNewStatus = () => {
      fetchStatuses();
    };

    socketAPI.on("onlineUsers", handleOnlineUsers);
    socketAPI.on("typing", handleTyping);
    socketAPI.on("stop-typing", handleStopTyping);
    socketAPI.on("incomingCall", handleIncomingCall);
    socketAPI.on("newStatus", handleNewStatus);

    return () => {
      socketAPI.off("onlineUsers", handleOnlineUsers);
      socketAPI.off("typing", handleTyping);
      socketAPI.off("stop-typing", handleStopTyping);
      socketAPI.off("incomingCall", handleIncomingCall);
      socketAPI.off("newStatus", handleNewStatus);
    };
  }, [fetchStatuses]);

  const handleLogout = async () => {
    if (user) {
      socketAPI.emit("destroyPath", user._id);
    }
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
    socketAPI.disconnect();
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    setIsLogoutModalOpen(false);
    setIsProfileSettingsOpen(false);
    navigate("/");
  };

  const initiateCall = (friend, isVideo) => {
    setIsCalling(true);
    setCallData({
      to: friend._id,
      name: friend.fullName || friend.email,
      isVideo,
    });
  };

  const handleRailTabChange = (tabId) => {
    setActiveRailTab(tabId);
    if (tabId === "status") {
      setIsStatusDrawerOpen(true);
    } else if (tabId === "profile") {
      setProfileSettingsTab("profile");
      setIsProfileSettingsOpen(true);
    } else if (tabId === "settings") {
      setProfileSettingsTab("settings");
      setIsProfileSettingsOpen(true);
    }
  };

  if (!isLogin) return null;

  return (
    <div className="flex h-dvh w-screen bg-[#111b21] text-[#e9edef] overflow-hidden select-none font-sans">
      {/* 1. WhatsApp Left Navigation Rail (60px) */}
      <NavigationRail
        activeTab={activeRailTab}
        onTabChange={handleRailTabChange}
        setActiveTab={handleRailTabChange}
        hasUnviewedStatus={statuses.length > 0}
        user={user}
        onOpenSettings={() => {
          setActiveRailTab("settings");
          setProfileSettingsTab("settings");
          setIsProfileSettingsOpen(true);
        }}
        onOpenProfile={() => {
          setActiveRailTab("profile");
          setProfileSettingsTab("profile");
          setIsProfileSettingsOpen(true);
        }}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* 2. Chat Sidebar (380-420px) */}
      <div
        className={`${
          selectedFriend ? "hidden md:flex" : "flex"
        } h-full shrink-0 border-r border-[#222e35]`}
      >
        <ChatSidebar
          selectedChat={selectedFriend}
          onSelectChat={(chat) => setSelectedFriend(chat)}
          onlineUsers={onlineUsers}
          typingUsers={typingUsers}
          onOpenNewChat={() => setIsNewChatOpen(true)}
          onOpenNewGroup={() => setIsNewGroupDrawerOpen(true)}
          onOpenStatusViewer={(st) => setActiveStatusViewerItem(st)}
          statuses={statuses}
          onOpenSettings={() => {
            setActiveRailTab("settings");
            setProfileSettingsTab("settings");
            setIsProfileSettingsOpen(true);
          }}
          onOpenThemeModal={() => setIsThemeModalOpen(true)}
          onLogout={() => setIsLogoutModalOpen(true)}
        />
      </div>

      {/* 3. Main Chat View / WhatsApp Empty State */}
      <div
        className={`${
          !selectedFriend ? "hidden md:flex" : "flex"
        } flex-1 flex-col h-full bg-[#0b141a] relative`}
      >
        {selectedFriend ? (
          <Chatting
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
            onlineUsers={onlineUsers}
            initiateCall={initiateCall}
            onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
          />
        ) : (
          /* WhatsApp Web Default Empty Screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#222e35]/20 select-none">
            <div className="w-24 h-24 mb-6 rounded-full bg-[#202c33] flex items-center justify-center shadow-lg border border-[#2a3942]">
              <MessageSquare className="w-12 h-12 text-[#00a884]" />
            </div>
            <h2 className="text-2xl font-light text-[#e9edef] mb-2 tracking-tight">
              WhatsApp Web
            </h2>
            <p className="text-sm text-[#8696a0] max-w-md leading-relaxed font-normal">
              Send and receive messages seamlessly. Connect with friends and groups with end-to-end encryption.
            </p>
            <div className="mt-auto flex items-center gap-1.5 text-xs text-[#8696a0] pt-8">
              <Lock className="w-3.5 h-3.5" />
              <span>End-to-end encrypted</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Slide-Over Drawers */}

      {/* New Chat Contacts Drawer */}
      <NewChatDrawer
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        allUsers={allUsers}
        onSelectContact={(contact) => {
          setSelectedFriend(contact);
          setIsNewChatOpen(false);
        }}
        onOpenNewGroup={() => {
          setIsNewChatOpen(false);
          setIsNewGroupDrawerOpen(true);
        }}
      />

      {/* Status Drawer */}
      <StatusDrawer
        isOpen={isStatusDrawerOpen}
        onClose={() => {
          setIsStatusDrawerOpen(false);
          if (activeRailTab === "status") setActiveRailTab("chats");
        }}
        onOpenViewer={(st) => setActiveStatusViewerItem(st)}
        onStatusCreated={() => fetchStatuses()}
      />

      {/* Status Story Viewer Modal */}
      {activeStatusViewerItem && (
        <StatusViewer
          status={activeStatusViewerItem}
          allStatuses={statuses}
          onClose={() => setActiveStatusViewerItem(null)}
          onReply={(st, text) => {
            // Send direct reply message to user who posted status
            if (st.user?._id) {
              setSelectedFriend(st.user);
              setActiveStatusViewerItem(null);
            }
          }}
        />
      )}

      {/* New Group Drawer */}
      <NewGroupDrawer
        isOpen={isNewGroupDrawerOpen}
        onClose={() => setIsNewGroupDrawerOpen(false)}
        onGroupCreated={(newGroup) => {
          setSelectedFriend(newGroup);
          setIsNewGroupDrawerOpen(false);
        }}
        allUsers={allUsers}
      />

      {/* Group Info Drawer */}
      {selectedFriend?.isGroupChat && (
        <GroupInfoDrawer
          isOpen={isGroupInfoOpen}
          onClose={() => setIsGroupInfoOpen(false)}
          groupChat={selectedFriend}
          onUpdateGroup={(updatedGroup) => setSelectedFriend(updatedGroup)}
          allUsers={allUsers}
        />
      )}

      {/* Profile & Settings Drawer */}
      <ProfileSettingsDrawer
        isOpen={isProfileSettingsOpen}
        onClose={() => {
          setIsProfileSettingsOpen(false);
          if (activeRailTab === "profile" || activeRailTab === "settings") {
            setActiveRailTab("chats");
          }
        }}
        initialTab={profileSettingsTab}
        onLogout={() => setIsLogoutModalOpen(true)}
        onOpenThemeModal={() => setIsThemeModalOpen(true)}
      />

      {/* WhatsApp Theme Selection Modal */}
      <ThemeModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#202c33] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 border border-[#2a3942] animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg text-[#e9edef] mb-1">
              Log out?
            </h3>
            <p className="text-[#8696a0] text-sm leading-relaxed">
              Are you sure you want to log out of WhatsApp Web?
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium hover:bg-[#2a3942] text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio & Video Call Modal */}
      <CallModal
        isCalling={isCalling}
        incomingCall={incomingCall}
        callData={callData}
        onEndCall={() => {
          setIsCalling(false);
          setIncomingCall(false);
          setCallData(null);
        }}
        onAcceptCall={() => {
          setIncomingCall(false);
          setIsCalling(true);
        }}
        onRejectCall={() => {
          setIncomingCall(false);
          setCallData(null);
        }}
      />
    </div>
  );
};

export default Chat;