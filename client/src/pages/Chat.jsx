import React, { useEffect, useState } from "react";
import Chatting from "../components/chat/Chatting";
import ProfileModal from "../components/ProfileModal";
import CallModal from "../components/chat/CallModal";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../config/api";
import socketAPI from "../config/webSocket";
import { LogOut, Settings, Search, Edit3, Palette } from "lucide-react";

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const Chat = () => {
  const navigate = useNavigate();
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const [recentUser, setRecentUser] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState({});
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callData, setCallData] = useState(null);

  const fetchRecentUsers = async (query = "") => {
    try {
      const res = await api.get(`/user/allusers?search=${query}`);
      setRecentUser(res.data.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    }
  };

  const fetchMe = async () => {
    try {
      const res = await api.get("/user/me");
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to fetch me", error);
    }
  };

  useEffect(() => {
    if (!isLogin) {
      navigate("/");
    } else {
      fetchMe();
      if (user) {
        socketAPI.emit("createPath", user._id);
      }
    }
  }, [isLogin, navigate]);

  const handleLogout = () => {
    if (user) {
      socketAPI.emit("destroyPath", user._id);
    }
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    setIsLogoutModalOpen(false);
    navigate("/");
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (isLogin) fetchRecentUsers(searchQuery);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, isLogin]);

  useEffect(() => {
    // No click outside needed here anymore as we removed settings dropdown
  }, []);

  useEffect(() => {
    const handleOnlineUsers = (users) => {
      setOnlineUsers(users);
    };
    socketAPI.on("onlineUsers", handleOnlineUsers);
    return () => {
      socketAPI.off("onlineUsers", handleOnlineUsers);
    };
  }, []);

  useEffect(() => {
    const handleIncomingCall = (data) => {
      setIncomingCall(true);
      setCallData({
        from: data.from,
        name: data.name || "User",
        offer: data.offer,
        isVideo: data.isVideo,
      });
    };
    socketAPI.on("callUser", handleIncomingCall);
    return () => socketAPI.off("callUser", handleIncomingCall);
  }, []);

  const initiateCall = (friend, isVideo) => {
    setIsCalling(true);
    setCallData({
      to: friend._id,
      name: friend.fullName || friend.email,
      isVideo,
    });
  };

  if (!isLogin) return null;

  const displayUsers = recentUser;

  return (
    <div className="flex h-screen bg-base-100 overflow-hidden text-base-content">
      {/* Sidebar */}
      <div className={`${selectedFriend ? 'hidden md:flex' : 'flex'} w-full md:w-80 bg-base-200 flex-col h-full border-r border-base-content/10 shrink-0`}>
        
        {/* Search Bar (Top) */}
        <div className="p-4 border-b border-base-content/10">
          <div className="relative flex items-center bg-base-content/5 rounded-lg p-2 border border-base-content/10 focus-within:border-primary transition-colors">
            <Search className="w-4 h-4 text-base-content/50 absolute left-3" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none pl-8 text-sm text-base-content placeholder-base-content/50 w-full"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-base-content/10">
          <button className="flex-1 bg-primary text-primary-content py-1.5 rounded-md text-sm font-medium shadow-sm">Chats</button>
          <button className="flex-1 text-base-content/70 hover:bg-base-content/10 py-1.5 rounded-md text-sm font-medium transition-colors">Contacts</button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {displayUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => {
                setSelectedFriend(u);
                setRecentUser((prev) => prev.map((userItem) => userItem._id === u._id ? { ...userItem, unreadCount: 0 } : userItem));
              }}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedFriend?._id === u._id ? "bg-base-content/10 shadow-sm" : "hover:bg-base-content/5"
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold overflow-hidden border-2 border-base-100">
                  {u.profilePic ? (
                    <img src={getMediaUrl(u.profilePic)} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    u.fullName?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()
                  )}
                </div>
                {onlineUsers[u._id] && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
                )}
              </div>
              <div className="flex-1 truncate">
                <h4 className="text-base-content text-sm font-medium truncate">{u.fullName || u.email}</h4>
              </div>
              <div className="shrink-0 flex items-center">
                {user?.pendingRequests?.includes(u._id) ? (
                  <span className="badge badge-error badge-sm text-[10px] uppercase font-bold px-2 py-2">Request</span>
                ) : user?.friends?.includes(u._id) && u.unreadCount > 0 ? (
                  <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-[10px] flex items-center justify-center font-bold shadow-sm">
                    {u.unreadCount > 99 ? '99+' : u.unreadCount}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
          {displayUsers.length === 0 && (
            <div className="text-center text-sm text-base-content/50 mt-8">
              No users found
            </div>
          )}
        </div>

        {/* Current User Header (Bottom) */}
        <div className="p-4 flex items-center justify-between border-t border-base-content/10 bg-base-200/50 relative overflow-visible">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg shadow-sm overflow-hidden border-2 border-base-100">
                {user?.profilePic ? (
                  <img src={getMediaUrl(user.profilePic)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
            </div>
            <div>
              <h3 className="font-semibold text-sm truncate max-w-[100px]">{user?.fullName || user?.email}</h3>
              <p className="text-xs text-base-content/70">Online</p>
            </div>
          </div>
          <div className="flex gap-3 text-base-content/70 items-center">
            <button 
              onClick={() => setIsProfileModalOpen(true)} 
              className="cursor-pointer hover:text-base-content transition-colors flex items-center h-full bg-transparent border-none p-0 outline-none"
            >
              <Edit3 size={18} />
            </button>
            <button onClick={() => setIsLogoutModalOpen(true)} className="cursor-pointer hover:text-error transition-colors bg-transparent border-none p-0 outline-none">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg text-base-content mb-2">Confirm Logout</h3>
            <p className="text-base-content/70 text-sm">Are you sure you want to logout?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setIsLogoutModalOpen(false)} className="btn btn-ghost flex-1 rounded-xl">Cancel</button>
              <button onClick={handleLogout} className="btn btn-error flex-1 rounded-xl">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Chat Area */}
      <div className={`${!selectedFriend ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-base-100`}>
        {selectedFriend ? (
          <Chatting
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
            onlineUsers={onlineUsers}
            initiateCall={initiateCall}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-base-content/50 gap-4">
            <div className="w-20 h-20 bg-base-200 rounded-full flex items-center justify-center">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* Call Modal */}
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
          setIsCalling(true); // transitions to active
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