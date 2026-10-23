import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";
import { useAuth } from "../auth/AuthContext";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import ForwardModal from "./ForwardModal";
import {
  X,
  ArrowLeft,
  MoreVertical,
  CheckCheck,
  Video,
  Phone,
  Palette,
  Sun,
  Moon,
  MoonStar,
  Music,
  MessageSquare,
  Briefcase,
  Leaf,
  Cloud,
  Star,
  Trash2,
  Forward,
  Ban,
  Pin,
  PinOff,
  BellOff,
  Archive,
  Timer,
  Info,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getMediaUrl,
  getInitials,
  formatLastSeen,
  playMessageSound,
} from "../../lib/helpers";

const THEMES = [
  { id: "light", name: "Light Mode", icon: Sun },
  { id: "dark", name: "Dark Mode", icon: Moon },
  { id: "black", name: "Midnight", icon: MoonStar },
  { id: "spotify", name: "Spotify", icon: Music },
  { id: "claude", name: "Claude", icon: MessageSquare },
  { id: "corporate", name: "Corporate", icon: Briefcase },
  { id: "ghibli", name: "Ghibli", icon: Leaf },
  { id: "pastel", name: "Pastel", icon: Cloud },
];

const MUTE_OPTIONS = [
  { label: "Mute for 8 hours", ms: 8 * 3600 * 1000 },
  { label: "Mute for 1 week", ms: 7 * 24 * 3600 * 1000 },
  { label: "Mute for 1 year", ms: 365 * 24 * 3600 * 1000 },
];
const DISAPPEAR_OPTIONS = [
  { label: "Off", hours: 0 },
  { label: "24 hours", hours: 24 },
  { label: "7 days", hours: 168 },
  { label: "30 days", hours: 720 },
];

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const Chatting = ({
  selectedChat,
  setSelectedChat,
  onlineUsers = {},
  initiateCall,
  onOpenGroupInfo,
  onChatChanged,
}) => {
  const { user } = useAuth();
  const isGroup = selectedChat?.chatType === "group";
  const chatId = selectedChat?._id;

  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [forwardMsg, setForwardMsg] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [typing, setTyping] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [themeModal, setThemeModal] = useState(false);
  const [clearModal, setClearModal] = useState(false);
  const [starredOpen, setStarredOpen] = useState(false);
  const [starred, setStarred] = useState([]);

  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const menuRef = useRef(null);
  const typingTimers = useRef({});

  const historyUrl = (cursor) => {
    const base = isGroup
      ? `/user/group-messages/${chatId}`
      : `/user/get-messages/${chatId}`;
    return cursor ? `${base}?cursor=${cursor}` : base;
  };

  const markRead = useCallback(() => {
    if (!chatId) return;
    const url = isGroup
      ? `/user/mark-read-group/${chatId}`
      : `/user/mark-read/${chatId}`;
    api.put(url).catch(() => {});
    socketAPI.emit("message:read", isGroup ? { groupId: chatId } : { friendId: chatId });
  }, [chatId, isGroup]);

  const fetchMessages = useCallback(
    async (cursor = null) => {
      try {
        const res = await api.get(historyUrl(cursor));
        return res.data;
      } catch (err) {
        console.error("Failed to fetch messages", err);
        return { data: [], nextCursor: null, hasMore: false };
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chatId, isGroup],
  );

  // Initial load on chat switch
  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages([]);
    setReplyTo(null);
    setEditTarget(null);
    setSelectionMode(false);
    setSelectedIds([]);
    setTyping({});
    fetchMessages().then((res) => {
      if (!active) return;
      setMessages(res.data || []);
      setNextCursor(res.nextCursor || null);
      setHasMore(!!res.hasMore);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "auto" }), 50);
      markRead();
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isGroup]);

  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !nextCursor) return;
    setLoadingOlder(true);
    const container = scrollContainerRef.current;
    const prevHeight = container?.scrollHeight || 0;
    const res = await fetchMessages(nextCursor);
    setMessages((prev) => [...(res.data || []), ...prev]);
    setNextCursor(res.nextCursor || null);
    setHasMore(!!res.hasMore);
    requestAnimationFrame(() => {
      if (container) container.scrollTop += container.scrollHeight - prevHeight;
    });
    setLoadingOlder(false);
  };

  // ───────── Socket events ─────────
  useEffect(() => {
    const belongsToChat = (msg) => {
      if (isGroup) return String(msg.groupId) === String(chatId);
      const senderId =
        typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
      return (
        String(senderId) === String(chatId) ||
        String(msg.receiverId) === String(chatId)
      );
    };

    const handleNewMessage = (msg) => {
      if (!belongsToChat(msg)) return;
      const senderId =
        typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
      const isIncoming = String(senderId) !== String(user._id);
      setMessages((prev) => {
        if (prev.find((m) => m._id === msg._id)) return prev;
        if (
          msg.tempClientId &&
          prev.find((m) => m.tempClientId === msg.tempClientId)
        ) {
          return prev.map((m) => (m.tempClientId === msg.tempClientId ? msg : m));
        }
        if (isIncoming) {
          playMessageSound("incoming");
          if (!isGroup) {
            socketAPI.emit("message:delivered", { messageId: msg._id });
          }
        }
        return [...prev, msg];
      });
      if (isIncoming) markRead();
      onChatChanged?.();
    };

    const handleDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? {
                ...m,
                message: "🚫 This message was deleted",
                messageType: "text",
                mediaUrl: null,
                isDeletedForEveryone: true,
                reactions: [],
              }
            : m,
        ),
      );
    };

    const handleUpdated = (updated) => {
      if (!belongsToChat(updated)) return;
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    };

    const handleReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)),
      );
    };

    const handleStatus = (payload) => {
      if (payload.chatType === "group") {
        if (String(payload.chatId) !== String(chatId)) return;
        if (payload.status === "read") {
          setMessages((prev) =>
            prev.map((m) => {
              if (String(m.groupId) !== String(chatId)) return m;
              if (m.readBy?.some((r) => String(r.user?._id || r.user) === String(payload.userId))) {
                return m;
              }
              return { ...m, readBy: [...(m.readBy || []), { user: payload.userId }] };
            }),
          );
        }
        return;
      }
      // DM
      if (payload.messageId) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m._id !== payload.messageId) return m;
            if (payload.status === "delivered") {
              return {
                ...m,
                deliveredTo: Array.from(
                  new Set([...(m.deliveredTo || []), payload.userId]),
                ),
              };
            }
            return { ...m, isRead: true, readBy: [{ user: payload.userId }] };
          }),
        );
      } else if (payload.status === "read" && String(payload.chatId) === String(chatId)) {
        setMessages((prev) =>
          prev.map((m) =>
            String(m.receiverId) === String(chatId) && String(m.senderId) === String(user._id)
              ? { ...m, isRead: true, readBy: [{ user: chatId }] }
              : m,
          ),
        );
      }
    };

    const handleTyping = (data) => {
      if (isGroup) {
        if (String(data.groupId) !== String(chatId)) return;
        const uid = String(data.userId);
        if (data.isTyping) {
          setTyping((prev) => ({ ...prev, [uid]: data.name || "Someone" }));
          clearTimeout(typingTimers.current[uid]);
          typingTimers.current[uid] = setTimeout(() => {
            setTyping((prev) => {
              const next = { ...prev };
              delete next[uid];
              return next;
            });
          }, 4000);
        } else {
          setTyping((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
        }
      } else if (String(data.from) === String(chatId)) {
        setTyping({ dm: data.isTyping });
        clearTimeout(typingTimers.current.dm);
        if (data.isTyping) {
          typingTimers.current.dm = setTimeout(() => setTyping({}), 4000);
        }
      }
    };

    const handleGroupUpdated = (payload) => {
      if (String(payload?._id) === String(chatId)) onChatChanged?.();
    };

    socketAPI.on("newMessage", handleNewMessage);
    socketAPI.on("messageDeleted", handleDeleted);
    socketAPI.on("message:updated", handleUpdated);
    socketAPI.on("message:reaction", handleReaction);
    socketAPI.on("message:status", handleStatus);
    socketAPI.on("typing", handleTyping);
    socketAPI.on("group:updated", handleGroupUpdated);
    const timers = typingTimers.current;
    return () => {
      socketAPI.off("newMessage", handleNewMessage);
      socketAPI.off("messageDeleted", handleDeleted);
      socketAPI.off("message:updated", handleUpdated);
      socketAPI.off("message:reaction", handleReaction);
      socketAPI.off("message:status", handleStatus);
      socketAPI.off("typing", handleTyping);
      socketAPI.off("group:updated", handleGroupUpdated);
      Object.values(timers).forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId, isGroup, user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ───────── Actions ─────────
  const sendText = async (text, extras = {}) => {
    const tempClientId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const optimistic = {
      _id: `temp-${tempClientId}`,
      tempClientId,
      senderId: user._id,
      receiverId: isGroup ? null : chatId,
      groupId: isGroup ? chatId : null,
      message: text,
      messageType: "text",
      createdAt: new Date().toISOString(),
      deliveredTo: [],
      readBy: [],
      reactions: [],
      replyTo: extras.replyTo || null,
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const payload = {
        message: text,
        messageType: "text",
        tempClientId,
        ...(extras.replyTo && { replyTo: extras.replyTo }),
        ...(isGroup ? { groupId: chatId } : { receiverID: chatId }),
      };
      const res = await api.post("/user/send-message", payload);
      setMessages((prev) =>
        prev.map((m) => (m.tempClientId === tempClientId ? res.data.data : m)),
      );
      playMessageSound("outgoing");
      onChatChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send");
      setMessages((prev) => prev.filter((m) => m.tempClientId !== tempClientId));
    }
  };

  const sendFile = async (file, type) => {
    const formData = new FormData();
    if (isGroup) formData.append("groupId", chatId);
    else formData.append("receiverID", chatId);
    formData.append("messageType", type);
    formData.append("media", file);
    if (replyTo) formData.append("replyTo", replyTo._id);
    try {
      const res = await api.post("/user/send-message", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessages((prev) => [...prev, res.data.data]);
      setReplyTo(null);
      playMessageSound("outgoing");
      onChatChanged?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send media");
    }
  };

  const editText = async (messageId, text) => {
    try {
      const res = await api.patch(`/user/message/${messageId}`, { message: text });
      setMessages((prev) => prev.map((m) => (m._id === messageId ? res.data.data : m)));
      setEditTarget(null);
      toast.success("Message edited");
    } catch (err) {
      toast.error(err.response?.data?.message || "Edit failed");
    }
  };

  const react = async (msg, emoji) => {
    try {
      const res = await api.post(`/user/message/${msg._id}/react`, { emoji });
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, reactions: res.data.data.reactions } : m)),
      );
    } catch {
      toast.error("Reaction failed");
    }
  };

  const toggleStar = async (msg) => {
    const isStarred = msg.starredBy?.some((id) => String(id) === String(user._id));
    try {
      const res = await api({
        method: isStarred ? "delete" : "post",
        url: `/user/message/${msg._id}/star`,
      });
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msg._id ? { ...m, starredBy: res.data.data.starredBy } : m,
        ),
      );
      toast.success(isStarred ? "Unstarred" : "Starred");
    } catch {
      toast.error("Star action failed");
    }
  };

  const confirmDelete = async () => {
    const { id, type } = deleteTarget;
    try {
      await api.delete(`/user/message/${id}?type=${type}`);
      if (type === "for_me") {
        setMessages((prev) => prev.filter((m) => m._id !== id));
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === id
              ? {
                  ...m,
                  message: "🚫 This message was deleted",
                  messageType: "text",
                  mediaUrl: null,
                  isDeletedForEveryone: true,
                  reactions: [],
                }
              : m,
          ),
        );
      }
      toast.success("Message deleted");
    } catch (err) {
      toast.error(err.response?.data?.message || "Delete failed");
    } finally {
      setDeleteTarget(null);
    }
  };

  const clearChat = async () => {
    try {
      await api.delete(
        isGroup ? `/user/group-messages/${chatId}` : `/user/messages/${chatId}`,
      );
      setMessages([]);
      setClearModal(false);
      toast.success("Chat cleared");
      onChatChanged?.();
    } catch {
      toast.error("Clear chat failed");
    }
  };

  const updateChatSetting = async (patch) => {
    await api.patch(`/social/chat-settings/${isGroup ? "group" : "dm"}/${chatId}`, patch);
    toast.success("Updated");
    onChatChanged?.();
  };

  const toggleBlock = async () => {
    try {
      const nextBlocked = !selectedChat.blocked;
      if (selectedChat.blocked) {
        await api.delete(`/social/block/${chatId}`);
        toast.success("User unblocked");
      } else {
        await api.post(`/social/block/${chatId}`);
        toast.success("User blocked");
      }
      setSelectedChat({ ...selectedChat, blocked: nextBlocked });
      setMenuOpen(false);
      onChatChanged?.();
    } catch {
      toast.error("Action failed");
    }
  };

  const openStarred = async () => {
    setMenuOpen(false);
    setStarredOpen(true);
    try {
      const res = await api.get("/user/starred-messages");
      setStarred(res.data.data);
    } catch {
      toast.error("Failed to load starred messages");
    }
  };

  // Group permission helpers
  const myMembership = isGroup
    ? selectedChat.members?.find((m) => String(m.user?._id || m.user) === String(user._id))
    : null;
  const myRole = myMembership?.role || "member";
  const sendDisabled =
    isGroup && selectedChat.onlyAdminsCanSend && myRole !== "admin";
  const isMuted = selectedChat.settings?.mutedUntil
    ? new Date(selectedChat.settings.mutedUntil) > new Date()
    : false;

  // Header subtitle
  const headerSubtitle = () => {
    if (isGroup) {
      const typingUsers = Object.values(typing);
      if (typingUsers.length > 0)
        return `${typingUsers.slice(0, 2).join(", ")} typing...`;
      return `${selectedChat.memberCount || selectedChat.members?.length || 0} members`;
    }
    if (typing.dm) return "typing...";
    if (onlineUsers[chatId]) return "online";
    return selectedChat.lastSeen ? formatLastSeen(selectedChat.lastSeen) : "offline";
  };

  // Date separators
  const renderMessages = () => {
    let lastDate = null;
    return messages.map((msg) => {
      const dateObj = new Date(msg.createdAt);
      const dateKey = dateObj.toLocaleDateString();
      const isNewDate = lastDate !== dateKey;
      lastDate = dateKey;
      let label = dateKey;
      if (dateKey === new Date().toLocaleDateString()) label = "Today";
      else if (dateKey === new Date(Date.now() - 86400000).toLocaleDateString()) {
        label = "Yesterday";
      }
      const isMe =
        String(typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId) ===
        String(user._id);
      return (
        <React.Fragment key={msg._id}>
          {isNewDate && (
            <div className="w-full flex justify-center my-3">
              <span className="bg-base-200/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-base-content/70 shadow-sm border border-base-content/10 font-medium">
                {label}
              </span>
            </div>
          )}
          <MessageBubble
            msg={msg}
            isMe={isMe}
            chatType={isGroup ? "group" : "dm"}
            currentUserId={user._id}
            peerId={chatId}
            selectionMode={selectionMode}
            isSelected={selectedIds.includes(msg._id)}
            onReply={(m) => setReplyTo(m)}
            onReact={react}
            onStar={toggleStar}
            onForward={(m) => setForwardMsg(m)}
            onEdit={(m) => setEditTarget(m)}
            onDelete={(m, type) => setDeleteTarget({ id: m._id, type })}
            onSelect={(id) =>
              setSelectedIds((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
              )
            }
          />
        </React.Fragment>
      );
    });
  };

  const bulkAction = async (action) => {
    try {
      if (action === "delete") {
        await Promise.all(
          selectedIds.map((id) => api.delete(`/user/message/${id}?type=for_me`)),
        );
        setMessages((prev) => prev.filter((m) => !selectedIds.includes(m._id)));
        toast.success("Messages deleted");
      } else if (action === "star") {
        await Promise.all(selectedIds.map((id) => api.post(`/user/message/${id}/star`)));
        toast.success("Messages starred");
      } else if (action === "forward") {
        const first = messages.find((m) => m._id === selectedIds[0]);
        setForwardMsg(first);
      }
      setSelectionMode(false);
      setSelectedIds([]);
    } catch {
      toast.error("Bulk action failed");
    }
  };

  const menuItem =
    "w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-base-200 transition-colors text-left bg-transparent border-0 cursor-pointer";

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-base-content/10 bg-base-200 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setSelectedChat(null)}
            className="md:hidden text-base-content/70 hover:text-base-content transition-colors mr-1 cursor-pointer bg-transparent border-none p-0"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => isGroup && onOpenGroupInfo?.(selectedChat)}
            className="relative shrink-0 bg-transparent border-0 p-0 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-base-100">
              {selectedChat.avatar ? (
                <img src={getMediaUrl(selectedChat.avatar)} alt="" className="w-full h-full object-cover" />
              ) : isGroup ? (
                <Users size={18} />
              ) : (
                getInitials(selectedChat.name)
              )}
            </div>
            {!isGroup && onlineUsers[chatId] && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200" />
            )}
          </button>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate flex items-center gap-1.5">
              {selectedChat.name}
              {isMuted && <BellOff size={12} className="text-base-content/50 shrink-0" />}
              {selectedChat.settings?.pinned && <Pin size={12} className="text-base-content/50 shrink-0" />}
            </h3>
            <p className="text-xs text-base-content/70 truncate flex items-center gap-1.5">
              {Object.keys(typing).length > 0 ? (
                <>
                  <TypingDots /> {headerSubtitle()}
                </>
              ) : (
                headerSubtitle()
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 relative" ref={menuRef}>
          {!isGroup && initiateCall && (
            <>
              <button
                onClick={() => initiateCall(selectedChat, true)}
                className="text-primary hover:opacity-80 transition-opacity p-1 bg-transparent border-none outline-none cursor-pointer"
                aria-label="Video call"
              >
                <Video size={22} />
              </button>
              <button
                onClick={() => initiateCall(selectedChat, false)}
                className="text-primary hover:opacity-80 transition-opacity p-1 bg-transparent border-none outline-none cursor-pointer"
                aria-label="Voice call"
              >
                <Phone size={20} />
              </button>
            </>
          )}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="text-base-content/70 hover:text-base-content transition-colors p-1 bg-transparent border-none outline-none cursor-pointer"
            aria-label="Chat menu"
          >
            <MoreVertical size={20} />
          </button>
          {menuOpen && (
            <div className="absolute top-10 right-0 bg-base-100 border border-base-content/10 rounded-lg shadow-xl z-50 w-56 overflow-hidden py-1 max-h-[70vh] overflow-y-auto">
              {isGroup && (
                <button className={menuItem} onClick={() => { onOpenGroupInfo?.(selectedChat); setMenuOpen(false); }}>
                  <Info size={16} /> Group info
                </button>
              )}
              <button className={menuItem} onClick={openStarred}>
                <Star size={16} /> Starred messages
              </button>
              <button
                className={menuItem}
                onClick={() => {
                  updateChatSetting({ pinned: !selectedChat.settings?.pinned });
                  setMenuOpen(false);
                }}
              >
                {selectedChat.settings?.pinned ? <PinOff size={16} /> : <Pin size={16} />}
                {selectedChat.settings?.pinned ? "Unpin chat" : "Pin chat"}
              </button>
              <button
                className={menuItem}
                onClick={() => {
                  updateChatSetting({ archived: !selectedChat.settings?.archived });
                  setMenuOpen(false);
                }}
              >
                <Archive size={16} />
                {selectedChat.settings?.archived ? "Unarchive" : "Archive chat"}
              </button>
              {!isMuted ? (
                MUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.label}
                    className={menuItem}
                    onClick={() => {
                      updateChatSetting({ mutedUntil: new Date(Date.now() + opt.ms).toISOString() });
                      setMenuOpen(false);
                    }}
                  >
                    <BellOff size={16} /> {opt.label}
                  </button>
                ))
              ) : (
                <button
                  className={menuItem}
                  onClick={() => {
                    updateChatSetting({ mutedUntil: null });
                    setMenuOpen(false);
                  }}
                >
                  <BellOff size={16} /> Unmute notifications
                </button>
              )}
              <div className="menu-dropdown">
                <details className="group">
                  <summary className={`${menuItem} list-none [&::-webkit-details-marker]:hidden`}>
                    <Timer size={16} /> Disappearing messages
                  </summary>
                  <div className="pl-6">
                    {DISAPPEAR_OPTIONS.map((opt) => (
                      <button
                        key={opt.hours}
                        className={`${menuItem} text-xs`}
                        onClick={() => {
                          updateChatSetting({ disappearingHours: opt.hours });
                          setMenuOpen(false);
                        }}
                      >
                        {opt.label}
                        {selectedChat.settings?.disappearingHours === opt.hours && <CheckCheck size={14} className="ml-auto text-primary" />}
                      </button>
                    ))}
                  </div>
                </details>
              </div>
              <button className={menuItem} onClick={() => { setThemeModal(true); setMenuOpen(false); }}>
                <Palette size={16} /> Theme
              </button>
              {!isGroup && (
                <button className={`${menuItem} text-error`} onClick={toggleBlock}>
                  <Ban size={16} /> {selectedChat.blocked ? "Unblock user" : "Block user"}
                </button>
              )}
              <button
                className={`${menuItem} text-error`}
                onClick={() => { setClearModal(true); setMenuOpen(false); }}
              >
                <Trash2 size={16} /> Clear chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selection mode bar */}
      {selectionMode && (
        <div className="flex items-center gap-3 px-4 py-2 bg-base-200 border-b border-base-content/10">
          <button onClick={() => { setSelectionMode(false); setSelectedIds([]); }} className="btn btn-ghost btn-circle btn-sm">
            <X size={18} />
          </button>
          <span className="text-sm font-medium flex-1">{selectedIds.length} selected</span>
          <button onClick={() => bulkAction("star")} className="btn btn-ghost btn-sm" disabled={!selectedIds.length}>
            <Star size={18} />
          </button>
          <button onClick={() => bulkAction("forward")} className="btn btn-ghost btn-sm" disabled={selectedIds.length !== 1}>
            <Forward size={18} />
          </button>
          <button onClick={() => bulkAction("delete")} className="btn btn-ghost btn-sm text-error" disabled={!selectedIds.length}>
            <Trash2 size={18} />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 relative overflow-hidden chat-background">
        <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {hasMore && (
            <div className="flex justify-center">
              <button
                onClick={loadOlder}
                disabled={loadingOlder}
                className="btn btn-sm btn-ghost border border-base-content/10"
              >
                {loadingOlder ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  "Load older messages"
                )}
              </button>
            </div>
          )}
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-base-content/40 text-sm">
              No messages yet — say hello 👋
            </div>
          )}
          {renderMessages()}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <MessageInput
        chat={selectedChat}
        replyTo={replyTo}
        clearReply={() => setReplyTo(null)}
        editTarget={editTarget}
        clearEdit={() => setEditTarget(null)}
        onSendText={sendText}
        onSendFile={sendFile}
        onEditText={editText}
        disabled={sendDisabled || selectedChat.blocked}
        disabledReason={
          sendDisabled
            ? "Only admins can send messages in this group"
            : "You blocked this contact — unblock to message"
        }
      />

      <ForwardModal open={!!forwardMsg} onClose={() => setForwardMsg(null)} message={forwardMsg} />

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Delete message?</h3>
            <div className="flex flex-col gap-2">
              {deleteTarget.type === "for_everyone" && (
                <button onClick={confirmDelete} className="btn btn-error btn-outline w-full">
                  Delete for everyone
                </button>
              )}
              <button
                onClick={() => {
                  setDeleteTarget({ ...deleteTarget, type: "for_me" });
                  setTimeout(confirmDelete, 0);
                }}
                className="btn w-full"
              >
                Delete for me
              </button>
              <button onClick={() => setDeleteTarget(null)} className="btn btn-ghost w-full">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear chat */}
      {clearModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3">
            <h3 className="font-semibold text-lg">Clear Chat?</h3>
            <p className="text-base-content/70 text-sm">This removes the chat history on this device.</p>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setClearModal(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={clearChat} className="btn btn-error flex-1">Clear</button>
            </div>
          </div>
        </div>
      )}

      {/* Theme modal */}
      {themeModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="bg-base-100 p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-xl flex items-center gap-2">
                <Palette size={20} className="text-primary" /> Appearance
              </h3>
              <button onClick={() => setThemeModal(false)} className="btn btn-sm btn-circle btn-ghost">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {THEMES.map((t) => {
                const Icon = t.icon;
                const active = (localStorage.getItem("theme") || "dark") === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      document.documentElement.setAttribute("data-theme", t.id);
                      localStorage.setItem("theme", t.id);
                      setThemeModal(false);
                    }}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all ${
                      active ? "border-primary ring-2 ring-primary/20" : "border-transparent hover:border-primary/30"
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-primary text-primary-content">
                      <Icon size={18} />
                    </div>
                    <span className="font-medium text-sm flex-1 text-left">{t.name}</span>
                    {active && <CheckCheck size={16} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Starred messages */}
      {starredOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <Star size={18} className="fill-amber-400 text-amber-500" /> Starred Messages
              </h3>
              <button onClick={() => setStarredOpen(false)} className="btn btn-sm btn-circle btn-ghost">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {starred.length === 0 && (
                <p className="text-center text-sm text-base-content/50 py-8">No starred messages yet</p>
              )}
              {starred.map((m) => (
                <div key={m._id} className="p-3 rounded-xl bg-base-200 text-sm">
                  <p className="whitespace-pre-wrap break-words">
                    {m.isDeletedForEveryone ? "🚫 This message was deleted" : m.message}
                  </p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chatting;
