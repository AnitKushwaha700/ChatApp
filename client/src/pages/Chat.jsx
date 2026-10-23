import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import Chatting from "../features/chat/Chatting";
import ChatList from "../features/chat/ChatList";
import ProfileModal from "../features/profile/ProfileModal";
import CallModal from "../features/chat/CallModal";
import StatusTab from "../features/status/StatusTab";
import CallsTab from "../features/calls/CallsTab";
import FriendsTab from "../features/social/FriendsTab";
import SettingsModal from "../features/settings/SettingsModal";
import { CreateGroupModal, GroupInfoModal } from "../features/groups/GroupModals";
import { useAuth } from "../features/auth/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import socketAPI from "../lib/webSocket";
import toast from "react-hot-toast";
import {
  LogOut,
  Search,
  Edit3,
  MessageCircle,
  CircleDot,
  Phone,
  Users,
  UsersRound,
  Settings,
  Bell,
} from "lucide-react";
import { getMediaUrl, getInitials } from "../lib/helpers";

const TABS = [
  { id: "chats", label: "Chats", icon: MessageCircle },
  { id: "status", label: "Status", icon: CircleDot },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "friends", label: "People", icon: Users },
];

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLogin, setUser, setIsLogin } = useAuth();

  const [activeTab, setActiveTab] = useState("chats");
  const [chatList, setChatList] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineUsers, setOnlineUsers] = useState({});
  const [requestCount, setRequestCount] = useState(0);
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [groupInfoId, setGroupInfoId] = useState(null);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);

  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callData, setCallData] = useState(null);

  const listTimer = useRef(null);
  const selectedChatRef = useRef(null);
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const fetchChatList = useCallback(async () => {
    try {
      const res = await api.get("/user/chat-list");
      setChatList(res.data.data);
    } catch (error) {
      console.error("Failed to fetch chat list", error);
    }
  }, []);

  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get("/user/me");
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to fetch me", error);
    }
  }, [setUser]);

  useEffect(() => {
    if (!isLogin) {
      navigate("/");
    } else {
      fetchMe();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchChatList();
    }
  }, [isLogin, navigate, fetchMe, fetchChatList]);

  // Join group via invite link
  useEffect(() => {
    const code = searchParams.get("join");
    if (!code || !isLogin) return;
    (async () => {
      try {
        const res = await api.post(`/groups/join/${code}`);
        toast.success("Joined group via invite link");
        if (res.data.data?._id) {
          socketAPI.emit("group:join", { groupId: res.data.data._id });
        }
        fetchChatList();
        navigate("/chat", { replace: true });
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid invite link");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLogin]);

  useEffect(() => {
    if (isLogin && user) {
      if (!socketAPI.connected) socketAPI.connect();
      socketAPI.emit("createPath", user._id);
    }
  }, [isLogin, user]);

  const scheduleListRefresh = useCallback(() => {
    clearTimeout(listTimer.current);
    listTimer.current = setTimeout(fetchChatList, 350);
  }, [fetchChatList]);

  // Notification permission on first interaction
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      const ask = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("click", ask);
      };
      window.addEventListener("click", ask, { once: true });
      return () => window.removeEventListener("click", ask);
    }
  }, []);

  const notify = useCallback((title, body) => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    if (document.hidden) {
      try {
        new Notification(title, { body, icon: "/pwa-icon.svg" });
      } catch {
        // some browsers require a service worker registration
      }
    }
  }, []);

  // ───────── Socket wiring ─────────
  useEffect(() => {
    const handleOnlineUsers = (users) => setOnlineUsers(users);

    const handlePresence = ({ userId, isOnline, lastSeen }) => {
      setChatList((prev) =>
        prev.map((c) =>
          c.chatType === "dm" && String(c._id) === String(userId)
            ? { ...c, isOnline, lastSeen: isOnline ? null : lastSeen }
            : c,
        ),
      );
    };

    const handleNewMessage = (msg) => {
      scheduleListRefresh();
      const open = selectedChatRef.current;
      const senderId =
        typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
      const belongs =
        open &&
        (open.chatType === "group"
          ? String(msg.groupId) === String(open._id)
          : String(senderId) === String(open._id) ||
            String(msg.receiverId) === String(open._id));
      if (!belongs && String(senderId) !== String(user?._id)) {
        const sender =
          typeof msg.senderId === "object"
            ? msg.senderId?.fullName
            : "New message";
        notify(sender || "ChatApp", msg.message || "Sent an attachment");
      }
    };

    const handleFriendRequest = ({ user: requester }) => {
      setRequestCount((c) => c + 1);
      toast.success(`${requester?.fullName || "Someone"} sent you a friend request`, {
        icon: "👋",
      });
    };

    const handleFriendAccept = () => {
      toast.success("Friend request accepted");
      fetchChatList();
    };

    const handleGroupNew = () => {
      fetchChatList();
    };

    const handleGroupUpdated = () => fetchChatList();
    const handleGroupDeleted = () => {
      fetchChatList();
      setSelectedChat(null);
      toast("A group you were in was deleted");
    };

    const handleStatusNew = () => {
      setStatusRefreshKey((k) => k + 1);
      toast("A friend posted a new status", { icon: "📸" });
    };

    const handleMissedCall = () => {
      toast.error("You missed a call", { icon: "📞" });
    };

    const handleIncomingCall = (data) => {
      setIncomingCall(true);
      setCallData({ from: data.from, name: data.name || "User", isVideo: data.isVideo });
    };

    socketAPI.on("onlineUsers", handleOnlineUsers);
    socketAPI.on("presence:update", handlePresence);
    socketAPI.on("newMessage", handleNewMessage);
    socketAPI.on("chat:updated", scheduleListRefresh);
    socketAPI.on("friend:request", handleFriendRequest);
    socketAPI.on("friend:accept", handleFriendAccept);
    socketAPI.on("group:new", handleGroupNew);
    socketAPI.on("group:updated", handleGroupUpdated);
    socketAPI.on("group:deleted", handleGroupDeleted);
    socketAPI.on("status:new", handleStatusNew);
    socketAPI.on("call:missed", handleMissedCall);
    socketAPI.on("incomingCall", handleIncomingCall);

    return () => {
      socketAPI.off("onlineUsers", handleOnlineUsers);
      socketAPI.off("presence:update", handlePresence);
      socketAPI.off("newMessage", handleNewMessage);
      socketAPI.off("chat:updated", scheduleListRefresh);
      socketAPI.off("friend:request", handleFriendRequest);
      socketAPI.off("friend:accept", handleFriendAccept);
      socketAPI.off("group:new", handleGroupNew);
      socketAPI.off("group:updated", handleGroupUpdated);
      socketAPI.off("group:deleted", handleGroupDeleted);
      socketAPI.off("status:new", handleStatusNew);
      socketAPI.off("call:missed", handleMissedCall);
      socketAPI.off("incomingCall", handleIncomingCall);
    };
  }, [fetchChatList, scheduleListRefresh, notify, user?._id]);

  // Document title unread badge
  useEffect(() => {
    const total = chatList.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    document.title = total > 0 ? `(${total > 99 ? "99+" : total}) ChatApp` : "ChatApp";
    return () => {
      document.title = "ChatApp";
    };
  }, [chatList]);

  const handleLogout = async () => {
    if (user) socketAPI.emit("destroyPath", user._id);
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    }
    socketAPI.disconnect();
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    setIsLogoutOpen(false);
    navigate("/");
  };

  const initiateCall = (chat, isVideo) => {
    if (chat.chatType !== "dm") {
      toast("Group calls are coming soon");
      return;
    }
    setIsCalling(true);
    setCallData({
      to: chat._id,
      name: chat.name || chat.fullName || chat.email,
      isVideo,
    });
  };

  const openChat = (chat) => {
    setSelectedChat(chat);
    setChatList((prev) =>
      prev.map((c) =>
        c._id === chat._id && c.chatType === chat.chatType ? { ...c, unreadCount: 0 } : c,
      ),
    );
    scheduleListRefresh();
  };

  if (!isLogin) return null;

  const filteredChats = chatList.filter((c) =>
    (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-dvh bg-base-100 overflow-hidden text-base-content">
      {/* Sidebar */}
      <div
        className={`${
          selectedChat ? "hidden md:flex" : "flex"
        } w-full md:w-96 bg-base-200 flex-col h-full border-r border-base-content/10 shrink-0`}
      >
        {/* Sidebar header */}
        <div className="p-3 flex items-center gap-2 border-b border-base-content/10">
          <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold overflow-hidden shrink-0">
            {user?.profilePic ? (
              <img src={getMediaUrl(user.profilePic)} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.fullName || user?.email)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{user?.fullName || user?.email}</p>
            <p className="text-[11px] text-base-content/55">
              {user?.about || "Hey there! I am using ChatApp"}
            </p>
          </div>
          {activeTab === "chats" && (
            <button
              onClick={() => setIsCreateGroupOpen(true)}
              className="btn btn-ghost btn-circle btn-sm"
              title="New group"
            >
              <UsersRound size={18} />
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn btn-ghost btn-circle btn-sm"
            title="Privacy settings"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setIsProfileOpen(true)}
            className="btn btn-ghost btn-circle btn-sm"
            title="Edit profile"
          >
            <Edit3 size={17} />
          </button>
          <button
            onClick={() => setIsLogoutOpen(true)}
            className="btn btn-ghost btn-circle btn-sm text-error"
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-base-content/10">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative transition-colors ${
                  activeTab === t.id ? "text-primary" : "text-base-content/55"
                }`}
              >
                <div className="relative">
                  <Icon size={18} />
                  {t.id === "friends" && requestCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[9px] flex items-center justify-center font-bold">
                      {requestCount}
                    </span>
                  )}
                </div>
                {t.label}
                {activeTab === t.id && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Search (chats only) */}
        {activeTab === "chats" && (
          <div className="p-3">
            <div className="relative flex items-center bg-base-content/5 rounded-lg p-2 border border-base-content/10 focus-within:border-primary transition-colors">
              <Search className="w-4 h-4 text-base-content/50 absolute left-3" />
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none pl-8 text-sm placeholder:text-base-content/50 w-full"
              />
            </div>
          </div>
        )}

        {/* Tab bodies */}
        {activeTab === "chats" && (
          <ChatList
            chats={filteredChats}
            selectedChat={selectedChat}
            onSelect={openChat}
            onlineUsers={onlineUsers}
          />
        )}
        {activeTab === "status" && <StatusTab refreshKey={statusRefreshKey} />}
        {activeTab === "calls" && <CallsTab onInitiate={initiateCall} />}
        {activeTab === "friends" && (
          <FriendsTab
            onOpenChat={(chat) => openChat(chat)}
            onCountChange={setRequestCount}
          />
        )}

        {/* Bottom current-user strip */}
        <div className="p-3 flex items-center gap-2 border-t border-base-content/10 bg-base-200/60">
          <Bell size={14} className="text-base-content/50" />
          <p className="text-[11px] text-base-content/55 flex-1">
            Notifications{" "}
            {typeof Notification !== "undefined" && Notification.permission === "granted"
              ? "enabled"
              : "off"}
          </p>
        </div>
      </div>

      {/* Logout modal */}
      {isLogoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Confirm Logout</h3>
            <p className="text-base-content/70 text-sm">Are you sure you want to logout?</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setIsLogoutOpen(false)} className="btn btn-ghost flex-1 rounded-xl">
                Cancel
              </button>
              <button onClick={handleLogout} className="btn btn-error flex-1 rounded-xl">
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <SettingsModal open={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <CreateGroupModal
        open={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onCreated={(group) => {
          fetchChatList();
          openChat({
            chatType: "group",
            _id: group._id,
            name: group.name,
            avatar: group.avatar,
            members: group.members,
            memberCount: group.members.length,
            settings: {},
          });
        }}
      />
      <GroupInfoModal
        open={!!groupInfoId}
        onClose={() => setGroupInfoId(null)}
        groupId={groupInfoId}
        currentUserId={user?._id}
      />

      {/* Chat area */}
      <div
        className={`${!selectedChat ? "hidden md:flex" : "flex"} flex-1 flex-col h-full bg-base-100`}
      >
        {selectedChat ? (
          <Chatting
            selectedChat={selectedChat}
            setSelectedChat={setSelectedChat}
            onlineUsers={onlineUsers}
            initiateCall={initiateCall}
            onOpenGroupInfo={(g) => setGroupInfoId(g._id)}
            onChatChanged={fetchChatList}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-base-content/50 gap-4">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center">
              <MessageCircle className="w-9 h-9 opacity-50" />
            </div>
            <div className="text-center">
              <p className="font-semibold">WhatsApp-style ChatApp</p>
              <p className="text-sm mt-1">Select a chat or start a new conversation</p>
            </div>
          </div>
        )}
      </div>

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
