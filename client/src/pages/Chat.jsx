import React, { useEffect, useState } from "react";
import Chatting from "../components/chat/Chatting";
import ProfileModal from "../components/ProfileModal";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../config/api";
import { LogOut, Settings, Search } from "lucide-react";

const Chat = () => {
  const navigate = useNavigate();
  const { user, isLogin, setUser, setIsLogin } = useAuth();
  const [recentUser, setRecentUser] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);

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

  const filteredUsers = recentUser.filter(u =>
    (u.fullName || u.email).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-base-100 overflow-hidden text-base-content">
      {/* Sidebar */}
      <div className="w-80 bg-base-200 flex flex-col h-full border-r border-base-content/10 shrink-0">
        
        {/* Search Bar (Top) */}
        <div className="p-4 border-b border-base-content/10">
          <div className="relative flex items-center bg-base-300 rounded-lg p-2 border border-base-content/10 focus-within:border-primary transition-colors">
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
          <button className="flex-1 text-base-content/70 hover:bg-base-300 py-1.5 rounded-md text-sm font-medium transition-colors">Contacts</button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedFriend(u)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedFriend?._id === u._id ? "bg-base-300 shadow-sm" : "hover:bg-base-300/50"
              }`}
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center font-bold">
                  {u.fullName?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}
                </div>
                <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
              </div>
              <div className="flex-1 truncate">
                <h4 className="text-base-content text-sm font-medium truncate">{u.fullName || u.email}</h4>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
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
                  <img src={`${api.defaults.baseURL}${user.profilePic}`} alt="Profile" className="w-full h-full object-cover" />
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
            <div className="dropdown dropdown-top dropdown-end relative z-50">
              <label tabIndex={0} className="cursor-pointer hover:text-base-content transition-colors flex items-center h-full">
                <Settings size={18} />
              </label>
              <ul tabIndex={0} className="dropdown-content z-[100] menu p-2 shadow-xl bg-base-100 rounded-box w-52 border border-base-content/10 mb-2">
                <li>
                  <a onClick={() => setIsProfileModalOpen(true)}>Edit Profile</a>
                </li>
                <li>
                  <a onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}>
                    Theme {isThemeDropdownOpen ? '▼' : '▶'}
                  </a>
                  {isThemeDropdownOpen && (
                    <ul className="ml-2 mt-1 menu bg-base-200 rounded-box p-2 max-h-48 overflow-y-auto custom-scrollbar">
                      {["light", "dark", "black", "spotify", "corporate", "ghibli"].map((theme) => (
                        <li key={theme}>
                          <a 
                            onClick={() => {
                              document.documentElement.setAttribute("data-theme", theme);
                              localStorage.setItem("theme", theme);
                              localStorage.setItem("mingoTheme", theme);
                            }}
                          >
                            {theme.charAt(0).toUpperCase() + theme.slice(1)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              </ul>
            </div>
            <LogOut size={18} className="cursor-pointer hover:text-error transition-colors" onClick={handleLogout} />
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-base-100">
        {selectedFriend ? (
          <Chatting
            selectedFriend={selectedFriend}
            setSelectedFriend={setSelectedFriend}
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
    </div>
  );
};

export default Chat;