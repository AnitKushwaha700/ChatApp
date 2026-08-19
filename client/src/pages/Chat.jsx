import React, { useEffect, useState } from "react";
import Chatting from "../components/chat/Chatting";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../config/api";
import { LogOut, VolumeX } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const [recentUser, setRecentUser] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);

  const fetchRecentUsers = async () => {
    try {
      const res = await api.get("/user/allusers");
      setRecentUser(res.data.data);
    } catch (error) {
      console.error("Failed to fetch recent users", error);
    }
  };

  useEffect(() => {
    if (!isLogin) {
      navigate("/");
    } else {
      fetchRecentUsers();
    }
  }, [isLogin, navigate]);

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem("AppUser");
    setIsLogin(false);
    navigate("/");
  };

  if (!isLogin) return null;

  return (
    <div className="flex h-[calc(100vh-65px)] bg-[#0f1218] overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-[#161a23] flex flex-col h-full border-r border-white/5 shrink-0">
        {/* Current User Header */}
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161a23]"></div>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{user?.fullName || user?.email}</h3>
              <p className="text-xs text-gray-400">Online</p>
            </div>
          </div>
          <div className="flex gap-3 text-gray-400">
            <LogOut size={18} className="cursor-pointer hover:text-white" onClick={handleLogout} />
            <VolumeX size={18} className="cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-white/5">
          <button className="flex-1 bg-[#1d8a8a] text-white py-1.5 rounded-md text-sm font-medium">Chats</button>
          <button className="flex-1 text-gray-400 hover:bg-[#232936] py-1.5 rounded-md text-sm font-medium">Contacts</button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {recentUser.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedFriend(u)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedFriend?._id === u._id ? "bg-[#232936]" : "hover:bg-[#232936]/50"
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold">
                  {u.fullName?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161a23]"></div>
              </div>
              <div className="flex-1 truncate">
                <h4 className="text-white text-sm font-medium truncate">{u.fullName || u.email}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-[#0f1218]">
        {selectedFriend ? (
          <Chatting
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;