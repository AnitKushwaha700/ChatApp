import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Users,
  Pin,
  BellOff,
  Check,
  CheckCheck,
  Mic,
  Image as ImageIcon,
  Video,
  FileText,
  Archive,
  MoreVertical,
  Plus,
  MessageSquarePlus,
  X,
  VolumeX,
  Trash2,
  Settings,
  Palette,
  LogOut,
} from "lucide-react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";
import { useAuth } from "../auth/AuthContext";

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const formatChatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();

  // If today: format "h:mm a"
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // If yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return "Yesterday";
  }

  // Otherwise format "dd/mm/yyyy"
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

const ChatSidebar = ({
  selectedChat,
  onSelectChat,
  onlineUsers = {},
  typingUsers = {},
  onOpenNewChat,
  onOpenNewGroup,
  onOpenStatusViewer,
  statuses = [],
  onOpenSettings,
  onOpenThemeModal,
  onLogout,
}) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "unread" | "favorites" | "groups"
  const [contextMenu, setContextMenu] = useState(null); // { x, y, chat }
  const [showArchived, setShowArchived] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const headerMenuRef = useRef(null);

  // Users who have active statuses
  const usersWithStatus = new Set(
    statuses
      .filter((s) => s.user?._id !== user?._id)
      .map((s) => s.user?._id)
  );

  const fetchChats = async () => {
    setIsLoading(true);
    try {
      const res = await api.get("/chat");
      setChats(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch chats", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async (query = "") => {
    try {
      const res = await api.get(`/user/allusers?search=${query}`);
      setAllUsers(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch all users", err);
    }
  };

  useEffect(() => {
    fetchChats();
    fetchAllUsers();
  }, []);

  // Real-time socket listeners for chat updates
  useEffect(() => {
    const handleNewMessage = (msg) => {
      setChats((prevChats) => {
        const chatId = msg.chat?._id || msg.chat;
        const exists = prevChats.some((c) => c._id === chatId);

        if (exists) {
          return prevChats.map((c) => {
            if (c._id === chatId) {
              const isCurrentChat = selectedChat?._id === chatId;
              return {
                ...c,
                latestMessage: msg,
                unreadCount: isCurrentChat ? 0 : (c.unreadCount || 0) + 1,
                updatedAt: new Date().toISOString(),
              };
            }
            return c;
          }).sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
        } else {
          // If chat not yet in list, re-fetch
          fetchChats();
          return prevChats;
        }
      });
    };

    const handleNewGroup = (newGroup) => {
      setChats((prev) => [newGroup, ...prev]);
    };

    const handleGroupUpdated = (updatedGroup) => {
      setChats((prev) =>
        prev.map((c) => (c._id === updatedGroup._id ? updatedGroup : c))
      );
    };

    socketAPI.on("newMessage", handleNewMessage);
    socketAPI.on("newGroupCreated", handleNewGroup);
    socketAPI.on("groupUpdated", handleGroupUpdated);

    return () => {
      socketAPI.off("newMessage", handleNewMessage);
      socketAPI.off("newGroupCreated", handleNewGroup);
      socketAPI.off("groupUpdated", handleGroupUpdated);
    };
  }, [selectedChat]);

  // Handle right-click context menu
  const handleContextMenu = (e, chat) => {
    e.preventDefault();
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 200),
      chat,
    });
  };

  const handleTogglePin = async (chatId) => {
    try {
      const res = await api.put(`/chat/pin/${chatId}`);
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, isPinned: res.data.data.isPinned } : c))
      );
    } catch (err) {
      console.error("Failed to pin chat", err);
    } finally {
      setContextMenu(null);
    }
  };

  const handleToggleArchive = async (chatId) => {
    try {
      const res = await api.put(`/chat/archive/${chatId}`);
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, isArchived: res.data.data.isArchived } : c))
      );
    } catch (err) {
      console.error("Failed to archive chat", err);
    } finally {
      setContextMenu(null);
    }
  };

  const handleToggleMute = async (chatId) => {
    try {
      const res = await api.put(`/chat/mute/${chatId}`);
      setChats((prev) =>
        prev.map((c) => (c._id === chatId ? { ...c, isMuted: res.data.data.isMuted } : c))
      );
    } catch (err) {
      console.error("Failed to mute chat", err);
    } finally {
      setContextMenu(null);
    }
  };

  // Close context menu and header menu on window click
  useEffect(() => {
    const closeMenus = (e) => {
      setContextMenu(null);
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
        setIsHeaderMenuOpen(false);
      }
    };
    window.addEventListener("click", closeMenus);
    return () => window.removeEventListener("click", closeMenus);
  }, []);

  // Filter and search chats
  const filteredChats = chats.filter((chat) => {
    // Check archived filter
    const isArchived = chat.isArchived || chat.archivedBy?.includes(user?._id);
    if (!showArchived && isArchived) return false;
    if (showArchived && !isArchived) return false;

    // Filter chips
    if (activeFilter === "unread" && !(chat.unreadCount > 0)) return false;
    if (activeFilter === "groups" && !chat.isGroupChat) return false;
    if (activeFilter === "favorites" && !chat.isPinned) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (chat.isGroupChat) {
        return chat.chatName?.toLowerCase().includes(q);
      } else {
        const otherUser = chat.users?.find((u) => u._id !== user?._id);
        return (
          otherUser?.fullName?.toLowerCase().includes(q) ||
          otherUser?.email?.toLowerCase().includes(q)
        );
      }
    }

    return true;
  });

  // Sort: Pinned first, then by latest message date
  const sortedChats = [...filteredChats].sort((a, b) => {
    const aPinned = a.isPinned || a.pinnedBy?.includes(user?._id);
    const bPinned = b.isPinned || b.pinnedBy?.includes(user?._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    const aTime = new Date(a.latestMessage?.createdAt || a.updatedAt || 0);
    const bTime = new Date(b.latestMessage?.createdAt || b.updatedAt || 0);
    return bTime - aTime;
  });

  // If user searched and no chat matched, show available contacts from allUsers
  const searchMatchedUsers = searchQuery.trim()
    ? allUsers.filter(
        (u) =>
          u._id !== user?._id &&
          !chats.some((c) => !c.isGroupChat && c.users?.some((cu) => cu._id === u._id)) &&
          (u.fullName || u.email || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const archivedCount = chats.filter((c) => c.isArchived || c.archivedBy?.includes(user?._id)).length;

  return (
    <div className="w-full md:w-[380px] lg:w-[420px] h-full bg-[#111b21] border-r border-[#222e35] flex flex-col shrink-0 select-none">
      {/* Top Header */}
      <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35] shrink-0">
        <h1 className="text-[20px] font-bold text-[#e9edef] tracking-tight">Chats</h1>
        <div className="flex items-center gap-1 relative" ref={headerMenuRef}>
          <button
            onClick={onOpenNewChat}
            title="New chat"
            className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#00a884] transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-5 h-5 text-[#00a884]" />
          </button>
          <button
            onClick={onOpenNewGroup}
            title="New group"
            className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
          >
            <Users className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHeaderMenuOpen(!isHeaderMenuOpen);
            }}
            title="Menu"
            className={`p-2 rounded-full hover:bg-[#374248] transition-colors cursor-pointer ${
              isHeaderMenuOpen ? "bg-[#374248] text-[#e9edef]" : "text-[#aebac1] hover:text-[#e9edef]"
            }`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* 3-dots Dropdown Menu */}
          {isHeaderMenuOpen && (
            <div className="absolute right-0 top-12 w-48 bg-[#202c33] border border-[#2a3942] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
              <button
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  onOpenNewGroup?.();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#e9edef] hover:bg-[#111b21] transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Users className="w-4 h-4 text-[#8696a0]" />
                <span>New group</span>
              </button>
              <button
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  onOpenThemeModal?.();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#e9edef] hover:bg-[#111b21] transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Palette className="w-4 h-4 text-[#8696a0]" />
                <span>Theme</span>
              </button>
              <button
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  onOpenSettings?.();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-[#e9edef] hover:bg-[#111b21] transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#8696a0]" />
                <span>Settings</span>
              </button>
              <div className="h-px bg-[#2a3942] my-1" />
              <button
                onClick={() => {
                  setIsHeaderMenuOpen(false);
                  onLogout?.();
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-3 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar & Filter Chips */}
      <div className="p-3 bg-[#111b21] space-y-2 border-b border-[#222e35]/60 shrink-0">
        <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
          <Search className="w-4 h-4 text-[#8696a0] shrink-0" />
          <input
            type="text"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none pl-3 text-[14px] text-[#e9edef] placeholder-[#8696a0]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-0.5 text-[#8696a0] hover:text-[#e9edef]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* WhatsApp Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {[
            { id: "all", label: "All" },
            { id: "unread", label: "Unread" },
            { id: "favorites", label: "Favorites" },
            { id: "groups", label: "Groups" },
          ].map((chip) => {
            const isActive = activeFilter === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setActiveFilter(chip.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium tracking-wide transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? "bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/40"
                    : "bg-[#202c33] text-[#8696a0] hover:bg-[#2a3942] hover:text-[#d1d7db]"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Archived Chats Toggle Row */}
      {archivedCount > 0 && (
        <div
          onClick={() => setShowArchived(!showArchived)}
          className="flex items-center justify-between px-4 py-3 bg-[#111b21] hover:bg-[#202c33] border-b border-[#222e35]/40 transition-colors cursor-pointer text-[#d1d7db]"
        >
          <div className="flex items-center gap-4">
            <Archive className="w-5 h-5 text-[#00a884]" />
            <span className="text-sm font-medium">
              {showArchived ? "Exit Archived" : "Archived"}
            </span>
          </div>
          <span className="text-xs text-[#00a884] font-semibold">{archivedCount}</span>
        </div>
      )}

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto whatsapp-scrollbar divide-y divide-[#222e35]/40">
        {sortedChats.map((chat) => {
          const isSelected = selectedChat?._id === chat._id;
          const otherUser = !chat.isGroupChat
            ? chat.users?.find((u) => u._id !== user?._id)
            : null;
          const isOtherOnline = otherUser && onlineUsers[otherUser._id];
          const hasStatus = otherUser && usersWithStatus.has(otherUser._id);
          const isTyping =
            typingUsers[otherUser?._id] || (chat.isGroupChat && typingUsers[chat._id]);

          const chatTitle = chat.isGroupChat
            ? chat.chatName
            : otherUser?.fullName || otherUser?.email || "User";

          const latestMsg = chat.latestMessage;
          const isSentByMe =
            latestMsg &&
            (latestMsg.senderId === user?._id || latestMsg.senderId?._id === user?._id);

          const isPinned = chat.isPinned || chat.pinnedBy?.includes(user?._id);
          const isMuted = chat.isMuted || chat.mutedBy?.includes(user?._id);

          return (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat)}
              onContextMenu={(e) => handleContextMenu(e, chat)}
              className={`flex items-center gap-3.5 px-3 py-3 cursor-pointer transition-colors relative group ${
                isSelected ? "bg-[#2a3942]" : "hover:bg-[#202c33]"
              }`}
            >
              {/* Avatar + Status Ring */}
              <div
                className="relative shrink-0"
                onClick={(e) => {
                  if (hasStatus) {
                    e.stopPropagation();
                    const st = statuses.find((s) => s.user?._id === otherUser?._id);
                    if (st) onOpenStatusViewer(st);
                  }
                }}
              >
                <div
                  className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-base bg-[#202c33] text-[#00a884] shadow-sm ${
                    hasStatus
                      ? "p-[2.5px] border-2 border-[#00a884] cursor-pointer"
                      : "border border-[#222e35]"
                  }`}
                >
                  {chat.isGroupChat ? (
                    chat.groupIcon ? (
                      <img
                        src={getMediaUrl(chat.groupIcon)}
                        alt={chatTitle}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <Users className="w-6 h-6 text-[#8696a0]" />
                    )
                  ) : otherUser?.profilePic ? (
                    <img
                      src={getMediaUrl(otherUser.profilePic)}
                      alt={chatTitle}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    (chatTitle || "?").charAt(0).toUpperCase()
                  )}
                </div>

                {/* Online Green Dot (for 1-on-1) */}
                {!chat.isGroupChat && isOtherOnline && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00a884] rounded-full border-2 border-[#111b21]" />
                )}
              </div>

              {/* Chat Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[16px] font-normal text-[#e9edef] truncate tracking-tight">
                    {chatTitle}
                  </h4>
                  <span className="text-[12px] text-[#8696a0] shrink-0 font-light">
                    {formatChatTime(latestMsg?.createdAt || chat.updatedAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  {/* Latest Message Preview */}
                  <div className="flex items-center gap-1 min-w-0 text-[13px] text-[#8696a0] truncate font-light">
                    {isTyping ? (
                      <span className="text-[#00a884] font-medium animate-pulse">
                        typing...
                      </span>
                    ) : (
                      <>
                        {/* Sent tick indicator if sent by current user */}
                        {isSentByMe && (
                          <span className="shrink-0 mr-0.5">
                            {latestMsg.readBy?.length > 1 ? (
                              <CheckCheck className="w-4 h-4 text-[#53bdeb]" />
                            ) : latestMsg.deliveredTo?.length > 0 ? (
                              <CheckCheck className="w-4 h-4 text-[#8696a0]" />
                            ) : (
                              <Check className="w-4 h-4 text-[#8696a0]" />
                            )}
                          </span>
                        )}

                        {/* Media type icon if applicable */}
                        {latestMsg?.messageType === "voice" || latestMsg?.messageType === "audio" ? (
                          <span className="flex items-center gap-1 text-[#00a884]">
                            <Mic className="w-3.5 h-3.5" />
                            Voice message
                          </span>
                        ) : latestMsg?.messageType === "image" ? (
                          <span className="flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5" />
                            Photo
                          </span>
                        ) : latestMsg?.messageType === "video" ? (
                          <span className="flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" />
                            Video
                          </span>
                        ) : latestMsg?.messageType === "document" ? (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            Document
                          </span>
                        ) : (
                          <span className="truncate">
                            {latestMsg?.message || "No messages yet"}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Badges & Icons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isMuted && <BellOff className="w-3.5 h-3.5 text-[#8696a0]" />}
                    {isPinned && <Pin className="w-3.5 h-3.5 text-[#8696a0] rotate-45" />}
                    {chat.unreadCount > 0 && (
                      <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#00a884] text-[#111b21] text-[11px] font-bold flex items-center justify-center">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Global Contacts Search Fallback (if user is looking for new contact) */}
        {searchMatchedUsers.length > 0 && (
          <div className="p-3 bg-[#111b21]">
            <span className="text-[11px] font-semibold text-[#00a884] uppercase tracking-wider block mb-2 px-1">
              Start new chat with
            </span>
            {searchMatchedUsers.map((u) => (
              <div
                key={u._id}
                onClick={async () => {
                  try {
                    const res = await api.post("/chat", { userId: u._id });
                    onSelectChat(res.data.data);
                    fetchChats();
                    setSearchQuery("");
                  } catch (err) {
                    console.error("Failed to start chat", err);
                  }
                }}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#202c33] cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884] font-semibold text-sm">
                  {u.profilePic ? (
                    <img
                      src={getMediaUrl(u.profilePic)}
                      alt={u.fullName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    (u.fullName || u.email || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#e9edef] truncate">{u.fullName || u.email}</p>
                  <p className="text-xs text-[#8696a0] truncate">{u.about || u.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {sortedChats.length === 0 && !searchQuery.trim() && (
          <div className="p-4">
            <div className="flex flex-col items-center text-center py-6 px-4 bg-[#202c33]/40 rounded-xl mb-4 border border-[#222e35]">
              <div className="w-12 h-12 rounded-full bg-[#00a884]/20 text-[#00a884] flex items-center justify-center mb-2.5">
                <MessageSquarePlus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-[#e9edef] mb-1">Start a conversation</h3>
              <p className="text-xs text-[#8696a0] mb-3">Click on any contact below to start chatting</p>
              <button
                onClick={onOpenNewChat}
                className="px-4 py-1.5 rounded-full bg-[#00a884] text-white text-xs font-semibold hover:bg-[#00a884]/90 transition-all cursor-pointer shadow-md"
              >
                New chat
              </button>
            </div>

            <span className="text-[11px] font-semibold text-[#00a884] uppercase tracking-wider block mb-2 px-1">
              Registered Contacts ({allUsers.filter((u) => u._id !== user?._id).length})
            </span>
            <div className="space-y-1">
              {allUsers
                .filter((u) => u._id !== user?._id)
                .map((u) => (
                  <div
                    key={u._id}
                    onClick={async () => {
                      try {
                        const res = await api.post("/chat", { userId: u._id });
                        onSelectChat(res.data.data || u);
                        fetchChats();
                      } catch (err) {
                        onSelectChat(u);
                      }
                    }}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#202c33] cursor-pointer transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884] font-semibold text-sm border border-[#2a3942] shrink-0">
                      {u.profilePic ? (
                        <img
                          src={getMediaUrl(u.profilePic)}
                          alt={u.fullName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        (u.fullName || u.email || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#e9edef] truncate">{u.fullName || u.email}</p>
                      <p className="text-xs text-[#8696a0] truncate">{u.about || u.email}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {sortedChats.length === 0 && searchQuery.trim() && searchMatchedUsers.length === 0 && (
          <div className="text-center py-16 px-4 text-[#8696a0] text-sm font-light">
            No contacts or chats found matching "{searchQuery}"
          </div>
        )}
      </div>

      {/* Context Menu Modal */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 w-48 bg-[#233138] rounded-md shadow-2xl py-1.5 border border-[#374248] text-xs text-[#e9edef] animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            onClick={() => handleTogglePin(contextMenu.chat._id)}
            className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2.5 cursor-pointer"
          >
            <Pin className="w-4 h-4 text-[#8696a0]" />
            <span>{contextMenu.chat.isPinned ? "Unpin chat" : "Pin chat"}</span>
          </button>
          <button
            onClick={() => handleToggleMute(contextMenu.chat._id)}
            className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2.5 cursor-pointer"
          >
            <VolumeX className="w-4 h-4 text-[#8696a0]" />
            <span>{contextMenu.chat.isMuted ? "Unmute notifications" : "Mute notifications"}</span>
          </button>
          <button
            onClick={() => handleToggleArchive(contextMenu.chat._id)}
            className="w-full text-left px-4 py-2.5 hover:bg-[#182229] flex items-center gap-2.5 cursor-pointer"
          >
            <Archive className="w-4 h-4 text-[#8696a0]" />
            <span>{contextMenu.chat.isArchived ? "Unarchive chat" : "Archive chat"}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
