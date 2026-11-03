import React, { useEffect, useState, useRef } from "react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";
import { useAuth } from "../auth/AuthContext";
import {
  X,
  Image as ImageIcon,
  Send,
  Plus,
  Mic,
  FileText,
  Camera,
  Music,
  UserPlus,
  StopCircle,
  Smile,
  ArrowLeft,
  MoreVertical,
  Check,
  CheckCheck,
  Video,
  Phone,
  Palette,
  Sun,
  Moon,
  MoonStar,
  MessageSquare,
  Briefcase,
  Leaf,
  Cloud,
  Reply,
  Edit2,
  Search,
  ChevronUp,
  ChevronDown,
  Star,
  Users,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { motion } from "motion/react";
import VoiceNotePlayer from "./VoiceNotePlayer";
import { applyTheme } from "../../lib/theme";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const groupReactions = (reactions = [], currentUserId) => {
  if (!reactions || !Array.isArray(reactions)) return [];
  const map = {};
  reactions.forEach((r) => {
    if (!r || !r.emoji) return;
    const rUserId = typeof r.user === "object" ? r.user?._id?.toString() : r.user?.toString();
    const isMe = rUserId === currentUserId?.toString();
    if (!map[r.emoji]) {
      map[r.emoji] = { emoji: r.emoji, count: 0, hasUserReacted: false };
    }
    map[r.emoji].count += 1;
    if (isMe) map[r.emoji].hasUserReacted = true;
  });
  return Object.values(map);
};

const isEmojiOnly = (text) => {
  if (!text) return false;
  const noSpace = text.replace(/[\s\n]/g, "");
  if (noSpace.length === 0) return false;
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(noSpace);
};

const playMessageSound = (type = 'incoming') => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'outgoing') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio playback failed", e);
  }
};

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const Chatting = ({
  selectedFriend,
  setSelectedFriend,
  onlineUsers = {},
  initiateCall,
  onOpenGroupInfo,
}) => {
  const { user, setUser } = useAuth();
  const [filteredChatData, setFilteredChatData] = useState([]);
  const [message, setMessage] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);

  // Advanced messaging states
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const handleToggleStar = async (msgId) => {
    try {
      const res = await api.put(`/chat/star/${msgId}`);
      setFilteredChatData((prev) =>
        prev.map((m) =>
          m._id === msgId ? { ...m, isStarred: res.data.data.isStarred } : m
        )
      );
    } catch (err) {
      console.error("Failed to star message", err);
    }
  };

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const attachmentRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const fetchChatData = async () => {
    try {
      const res = await api.get(`/user/get-messages/${selectedFriend._id}`);
      setFilteredChatData(res.data.data);

      // Mark messages as read on server and inform sender via socket
      await api.put(`/user/mark-read/${selectedFriend._id}`);
      socketAPI.emit("mark-read", { from: selectedFriend._id });
    } catch (error) {
      console.error("Failed to fetch chat data", error);
    }
  };

  const handleClearChat = async () => {
    try {
      await api.delete(`/user/messages/${selectedFriend._id}`);
      setFilteredChatData([]);
      setIsHeaderMenuOpen(false);
      setIsClearChatModalOpen(false);
    } catch (error) {
      console.error("Failed to clear chat", error);
    }
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      await api.delete(`/user/message/${messageId}?type=${type}`);
      if (type === "for_me") {
        setFilteredChatData((prev) => prev.filter((m) => m._id !== messageId));
      } else {
        setFilteredChatData((prev) =>
          prev.map((m) => {
            if (m._id === messageId) {
              return {
                ...m,
                message: "🚫 This message was deleted",
                messageType: "text",
                mediaUrl: null,
              };
            }
            return m;
          }),
        );
      }
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  };

  const handleTypingInput = (e) => {
    const val = e.target.value;
    setMessage(val);

    if (editingMessage || !selectedFriend?._id) return;

    if (val.trim()) {
      socketAPI.emit("typing", { to: selectedFriend._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketAPI.emit("stop-typing", { to: selectedFriend._id });
      }, 1800);
    } else {
      socketAPI.emit("stop-typing", { to: selectedFriend._id });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleEditMessage = async (e) => {
    e?.preventDefault();
    if (!editingMessage || !message.trim()) return;
    try {
      await api.put(`/user/message/${editingMessage._id}/edit`, {
        message: message.trim(),
      });
      setFilteredChatData((prev) =>
        prev.map((msg) =>
          msg._id === editingMessage._id
            ? { ...msg, message: message.trim(), isEdited: true }
            : msg
        )
      );
      setEditingMessage(null);
      setMessage("");
    } catch (error) {
      console.error("Failed to edit message", error);
    }
  };

  const handleReactToMessage = async (messageId, emoji) => {
    try {
      const res = await api.put(`/user/message/${messageId}/react`, { emoji });
      if (res.data?.reactions) {
        setFilteredChatData((prev) =>
          prev.map((msg) =>
            msg._id === messageId ? { ...msg, reactions: res.data.reactions } : msg
          )
        );
      }
      setActiveReactionMenuMsgId(null);
    } catch (error) {
      console.error("Failed to react to message", error);
    }
  };

  const scrollToMessage = (msgId) => {
    const el = document.getElementById(`msg-${msgId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(msgId);
      setTimeout(() => setHighlightedMessageId(null), 2500);
    }
  };

  const matchedMessageIds = React.useMemo(() => {
    if (!searchKeyword.trim()) return [];
    return filteredChatData
      .filter((m) => m.message && m.message.toLowerCase().includes(searchKeyword.toLowerCase()))
      .map((m) => m._id);
  }, [filteredChatData, searchKeyword]);

  const goToNextSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const nextIdx = (currentSearchIndex + 1) % matchedMessageIds.length;
    setCurrentSearchIndex(nextIdx);
    scrollToMessage(matchedMessageIds[nextIdx]);
  };

  const goToPrevSearchMatch = () => {
    if (matchedMessageIds.length === 0) return;
    const prevIdx = (currentSearchIndex - 1 + matchedMessageIds.length) % matchedMessageIds.length;
    setCurrentSearchIndex(prevIdx);
    scrollToMessage(matchedMessageIds[prevIdx]);
  };

  const handleMessageSend = async (e, type = "text", file = null) => {
    e?.preventDefault();
    if (editingMessage) {
      return handleEditMessage(e);
    }
    if (type === "text" && !message.trim()) return;

    if (selectedFriend?._id) {
      socketAPI.emit("stop-typing", { to: selectedFriend._id });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const repliedToId = replyingTo?._id;

    try {
      if (type === "text") {
        const payload = {
          message,
          messageType: "text",
          repliedTo: repliedToId,
        };
        if (selectedFriend.isGroupChat) {
          payload.chatId = selectedFriend._id;
        } else {
          payload.receiverID = selectedFriend._id;
        }
        const res = await api.post("/user/send-message", payload);
        setFilteredChatData((prev) => [...prev, res.data.data]);
        setMessage("");
      } else if (file) {
        const formData = new FormData();
        if (selectedFriend.isGroupChat) {
          formData.append("chatId", selectedFriend._id);
        } else {
          formData.append("receiverID", selectedFriend._id);
        }
        formData.append("messageType", type);
        formData.append("media", file);
        if (repliedToId) {
          formData.append("repliedTo", repliedToId);
        }

        const res = await api.post("/user/send-message", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFilteredChatData((prev) => [...prev, res.data.data]);
      }
      playMessageSound("outgoing");

      setReplyingTo(null);
      setIsAttachmentOpen(false);
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    let type = "document";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";

    handleMessageSend(null, type, file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioFile = new File([audioBlob], "voice-message.webm", {
          type: "audio/webm",
        });
        handleMessageSend(null, "audio", audioFile);

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    setIsFriendTyping(false);
    setReplyingTo(null);
    setEditingMessage(null);
    setIsSearching(false);
    setSearchKeyword("");
    setActiveReactionMenuMsgId(null);
    fetchChatData();

    if (selectedFriend?._id) {
      socketAPI.emit("join-chat", selectedFriend._id);
    }
    return () => {
      if (selectedFriend?._id) {
        socketAPI.emit("leave-chat", selectedFriend._id);
      }
    };
  }, [selectedFriend]);

  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      const isRelevant =
        newMessage.chat === selectedFriend?._id ||
        newMessage.chat?._id === selectedFriend?._id ||
        newMessage.senderId === selectedFriend?._id ||
        newMessage.receiverId === selectedFriend?._id;

      if (isRelevant) {
        setFilteredChatData((prev) => {
          if (prev.find((msg) => msg._id === newMessage._id)) return prev;
          if (newMessage.senderId !== user._id) {
            playMessageSound("incoming");
          }
          return [...prev, newMessage];
        });

        if (newMessage.senderId !== user._id) {
          api.put(`/user/mark-read/${selectedFriend._id}`).catch(console.error);
          socketAPI.emit("mark-read", { from: selectedFriend._id });
        }
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setFilteredChatData((prev) =>
        prev.map((m) => {
          if (m._id === messageId) {
            return {
              ...m,
              message: "🚫 This message was deleted",
              messageType: "text",
              mediaUrl: null,
            };
          }
          return m;
        }),
      );
    };

    const handleTyping = ({ from }) => {
      if (from === selectedFriend?._id) {
        setIsFriendTyping(true);
      }
    };

    const handleStopTyping = ({ from }) => {
      if (from === selectedFriend?._id) {
        setIsFriendTyping(false);
      }
    };

    const handleMessagesRead = ({ friendId }) => {
      if (friendId === selectedFriend?._id) {
        setFilteredChatData((prev) =>
          prev.map((msg) =>
            msg.senderId === user._id ? { ...msg, isRead: true } : msg
          )
        );
      }
    };

    const handleMessageReaction = ({ messageId, reactions }) => {
      setFilteredChatData((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, reactions } : msg
        )
      );
    };

    const handleMessageEdited = ({ messageId, message: updatedText, isEdited }) => {
      setFilteredChatData((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, message: updatedText, isEdited: isEdited ?? true }
            : msg
        )
      );
    };

    socketAPI.on("newMessage", handleNewMessage);
    socketAPI.on("messageDeleted", handleMessageDeleted);
    socketAPI.on("typing", handleTyping);
    socketAPI.on("stop-typing", handleStopTyping);
    socketAPI.on("messagesRead", handleMessagesRead);
    socketAPI.on("messageReaction", handleMessageReaction);
    socketAPI.on("messageEdited", handleMessageEdited);

    return () => {
      socketAPI.off("newMessage", handleNewMessage);
      socketAPI.off("messageDeleted", handleMessageDeleted);
      socketAPI.off("typing", handleTyping);
      socketAPI.off("stop-typing", handleStopTyping);
      socketAPI.off("messagesRead", handleMessagesRead);
      socketAPI.off("messageReaction", handleMessageReaction);
      socketAPI.off("messageEdited", handleMessageEdited);
    };
  }, [selectedFriend, user._id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        attachmentRef.current &&
        !attachmentRef.current.contains(event.target)
      ) {
        setIsAttachmentOpen(false);
      }
      if (
        showEmojiPicker &&
        !event.target.closest(".emoji-picker-react") &&
        !event.target.closest("button")
      ) {
        setShowEmojiPicker(false);
      }
      if (showDeleteModal && !event.target.closest(".delete-modal")) {
        setShowDeleteModal(null);
      }
      if (isHeaderMenuOpen && !event.target.closest(".header-menu")) {
        setIsHeaderMenuOpen(false);
      }
      if (
        activeReactionMenuMsgId &&
        !event.target.closest(".reaction-menu-container")
      ) {
        setActiveReactionMenuMsgId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showDeleteModal, isHeaderMenuOpen, activeReactionMenuMsgId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredChatData]);

  useEffect(() => {
    const handleResize = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  const renderMessageContent = (chat, emojiOnly) => {
    if (chat.messageType === "text") {
      if (emojiOnly) {
        return (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-5xl leading-none"
          >
            {chat.message}
          </motion.div>
        );
      }

      if (isSearching && searchKeyword.trim()) {
        const safeQuery = searchKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = chat.message.split(new RegExp(`(${safeQuery})`, "gi"));
        return (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {parts.map((part, i) =>
              part.toLowerCase() === searchKeyword.toLowerCase() ? (
                <mark key={i} className="bg-yellow-300 text-black px-0.5 rounded font-semibold">
                  {part}
                </mark>
              ) : (
                part
              )
            )}
          </p>
        );
      }

      return (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {chat.message}
        </p>
      );
    } else if (chat.messageType === "image" && chat.mediaUrl) {
      return (
        <div className="relative">
          <img
            src={getMediaUrl(chat.mediaUrl)}
            alt="Attachment"
            className="max-w-60 sm:max-w-75 h-auto rounded-lg object-cover"
          />
          {chat.message && chat.message !== "Sent an attachment" && (
            <p className="text-sm mt-2 px-1">{chat.message}</p>
          )}
        </div>
      );
    } else if ((chat.messageType === "audio" || chat.messageType === "voice") && chat.mediaUrl) {
      const isMeMsg = chat.senderId === user?._id || chat.senderId?._id === user?._id;
      return (
        <VoiceNotePlayer
          audioUrl={getMediaUrl(chat.mediaUrl)}
          isOutgoing={isMeMsg}
          duration={chat.mediaMetadata?.duration}
        />
      );
    } else if (chat.messageType === "video" && chat.mediaUrl) {
      return (
        <div className="relative">
          <video
            controls
            src={getMediaUrl(chat.mediaUrl)}
            className="max-w-60 sm:max-w-75 rounded-lg object-cover"
          />
        </div>
      );
    } else {
      return (
        <a
          href={getMediaUrl(chat.mediaUrl)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-sm bg-base-100/10 hover:bg-base-100/20 p-3 rounded-xl transition-colors border border-base-content/10"
        >
          <div className="p-2 bg-base-100/50 rounded-lg">
            <FileText size={24} />
          </div>
          <div className="flex flex-col">
            <span className="font-medium underline">Document</span>
            <span className="text-xs opacity-70">Click to view</span>
          </div>
        </a>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="p-3 sm:px-4 flex items-center justify-between border-b border-base-content/10 bg-base-200 shrink-0">
        <div
          onClick={() => {
            if (selectedFriend?.isGroupChat && onOpenGroupInfo) {
              onOpenGroupInfo();
            }
          }}
          className={`flex items-center gap-3 ${
            selectedFriend?.isGroupChat ? "cursor-pointer" : ""
          }`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedFriend(null);
            }}
            className="md:hidden text-base-content/70 hover:text-base-content transition-colors mr-1 cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-base overflow-hidden border border-base-content/10">
              {selectedFriend?.isGroupChat ? (
                selectedFriend.groupIcon ? (
                  <img
                    src={getMediaUrl(selectedFriend.groupIcon)}
                    alt={selectedFriend.chatName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-5 h-5 text-primary" />
                )
              ) : selectedFriend?.profilePic ? (
                <img
                  src={getMediaUrl(selectedFriend.profilePic)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                selectedFriend?.fullName?.charAt(0).toUpperCase() ||
                selectedFriend?.email?.charAt(0).toUpperCase()
              )}
            </div>
            {!selectedFriend?.isGroupChat && onlineUsers[selectedFriend?._id] && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate text-base-content">
              {selectedFriend?.isGroupChat
                ? selectedFriend.chatName
                : selectedFriend?.fullName || selectedFriend?.email}
            </h3>
            {isFriendTyping ? (
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                <span>typing...</span>
              </p>
            ) : selectedFriend?.isGroupChat ? (
              <p className="text-xs text-base-content/70 truncate">
                {selectedFriend.users?.length || 0} participants
              </p>
            ) : (
              <p className="text-xs text-base-content/70">
                {onlineUsers[selectedFriend?._id] ? "Online" : "Offline"}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 relative header-menu shrink-0">
          <button
            type="button"
            onClick={() => {
              setIsSearching(!isSearching);
              if (isSearching) setSearchKeyword("");
            }}
            className={`p-1.5 rounded-full transition-colors cursor-pointer border-none outline-none ${
              isSearching
                ? "bg-primary text-primary-content"
                : "text-base-content/70 hover:text-base-content"
            }`}
            title="Search in conversation"
          >
            <Search size={20} />
          </button>
          {!selectedFriend?.isGroupChat && initiateCall && (
            <>
              <button
                onClick={() => initiateCall(selectedFriend, true)}
                className="text-primary hover:opacity-80 transition-opacity p-1 bg-transparent border-none outline-none cursor-pointer"
              >
                <Video size={24} />
              </button>
              <button
                onClick={() => initiateCall(selectedFriend, false)}
                className="text-primary hover:opacity-80 transition-opacity p-1 bg-transparent border-none outline-none cursor-pointer"
              >
                <Phone size={22} />
              </button>
            </>
          )}
          <button
            onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
            className="text-base-content/70 hover:text-base-content transition-colors p-1 bg-transparent border-none outline-none cursor-pointer"
          >
            <MoreVertical size={20} />
          </button>
          {isHeaderMenuOpen && (
            <div className="absolute top-10 right-8 bg-base-100 border border-base-content/10 rounded-lg shadow-xl z-50 w-36 overflow-hidden">
              <button
                onClick={() => {
                  setIsThemeModalOpen(true);
                  setIsHeaderMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-base-200 transition-colors border-none outline-none cursor-pointer"
              >
                Theme
              </button>
              <button
                onClick={() => {
                  setIsClearChatModalOpen(true);
                  setIsHeaderMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-error hover:bg-base-200 transition-colors border-none outline-none cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Toolbar */}
      {isSearching && (
        <div className="px-4 py-2.5 bg-base-100 border-b border-base-content/10 flex items-center gap-2 shadow-xs animate-in slide-in-from-top-2 duration-200 z-20">
          <div className="relative flex-1 flex items-center">
            <Search size={15} className="absolute left-3 text-base-content/50" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setCurrentSearchIndex(0);
              }}
              placeholder="Search in conversation..."
              className="w-full bg-base-200 text-base-content text-xs pl-8 pr-3 py-1.5 rounded-lg border border-base-content/10 outline-none focus:border-primary"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-1 shrink-0 text-xs text-base-content/70">
            {searchKeyword.trim() && (
              <span className="text-[11px] font-medium mr-1 select-none">
                {matchedMessageIds.length > 0
                  ? `${currentSearchIndex + 1} of ${matchedMessageIds.length}`
                  : "0 matches"}
              </span>
            )}
            <button
              type="button"
              onClick={goToPrevSearchMatch}
              disabled={matchedMessageIds.length === 0}
              className="p-1 rounded-md hover:bg-base-200 disabled:opacity-30 cursor-pointer border-none bg-transparent"
              title="Previous match"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={goToNextSearchMatch}
              disabled={matchedMessageIds.length === 0}
              className="p-1 rounded-md hover:bg-base-200 disabled:opacity-30 cursor-pointer border-none bg-transparent"
              title="Next match"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSearching(false);
                setSearchKeyword("");
              }}
              className="p-1 rounded-md hover:bg-base-200 text-error cursor-pointer border-none bg-transparent"
              title="Close search"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="bg-base-100 p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 border border-base-content/5">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <Palette size={20} className="text-primary" />
                <h3 className="font-bold text-xl text-base-content">
                  Appearance
                </h3>
              </div>
              <button
                onClick={() => setIsThemeModalOpen(false)}
                className="btn btn-sm btn-circle btn-ghost hover:bg-base-content/10"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1 -mr-1 pb-2">
              {[
                { id: "light", name: "Light Mode", icon: Sun },
                { id: "dark", name: "Dark Mode", icon: Moon },
                { id: "black", name: "Midnight", icon: MoonStar },
                { id: "spotify", name: "Spotify", icon: Music },
                { id: "claude", name: "Claude", icon: MessageSquare },
                { id: "corporate", name: "Corporate", icon: Briefcase },
                { id: "ghibli", name: "Ghibli", icon: Leaf },
                { id: "pastel", name: "Pastel", icon: Cloud },
              ].map((theme) => {
                const Icon = theme.icon;
                const isActive = (localStorage.getItem("theme") || "dark") === theme.id;
                
                return (
                <button
                  key={theme.id}
                  data-theme={theme.id}
                  onClick={() => {
                    applyTheme(theme.id, true);
                    setIsThemeModalOpen(false);
                  }}
                  className={`relative flex items-center justify-between w-full p-4 rounded-2xl transition-all duration-300 overflow-hidden group border-2 bg-base-100 text-base-content ${
                    isActive 
                      ? "border-primary shadow-xl scale-[1.02] ring-4 ring-primary/10 z-10" 
                      : "border-transparent hover:border-primary/30 hover:scale-[1.01] shadow-sm hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-2.5 rounded-xl bg-primary text-primary-content shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                      <Icon size={22} />
                    </div>
                    <div className="flex flex-col items-start">
                       <span className="font-bold text-base tracking-tight">{theme.name}</span>
                       <div className="flex gap-1.5 mt-1.5">
                          <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-sm" title="Primary"></div>
                          <div className="w-3.5 h-3.5 rounded-full bg-secondary shadow-sm" title="Secondary"></div>
                          <div className="w-3.5 h-3.5 rounded-full bg-accent shadow-sm" title="Accent"></div>
                          <div className="w-3.5 h-3.5 rounded-full bg-neutral shadow-sm" title="Neutral"></div>
                       </div>
                    </div>
                  </div>
                  
                  {isActive && (
                    <div className="relative z-10 bg-primary text-primary-content rounded-full p-1.5 shadow-md animate-in zoom-in duration-300">
                      <Check size={18} strokeWidth={3} />
                    </div>
                  )}
                  
                  {/* Decorative background element to show off base-200/base-300 */}
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-linear-to-l from-base-200 to-transparent z-0 opacity-80"></div>
                </button>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {isClearChatModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="font-semibold text-lg text-base-content mb-2">
              Clear Chat?
            </h3>
            <p className="text-base-content/70 text-sm">
              Are you sure you want to clear this chat? This action cannot be
              undone.
            </p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setIsClearChatModalOpen(false)}
                className="btn btn-ghost flex-1 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="btn btn-error flex-1 rounded-xl"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
          <div className="flex-1 relative overflow-hidden chat-background">
            <div className="absolute inset-0 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {(() => {
              let lastDate = null;
              return filteredChatData.map((chat) => {
                const isMe = chat.senderId === user._id;
                const emojiOnly =
                  chat.messageType === "text" && isEmojiOnly(chat.message);
                const isMediaOnly =
                  (chat.messageType === "image" ||
                    chat.messageType === "video") &&
                  (!chat.message || chat.message === "Sent an attachment");

                const chatDateObj = chat.createdAt
                  ? new Date(chat.createdAt)
                  : new Date(chat.timestamp || Date.now());
                const chatDate = chatDateObj.toLocaleDateString();
                const isNewDate = lastDate !== chatDate;
                lastDate = chatDate;

                let dateLabel = chatDate;
                const today = new Date().toLocaleDateString();
                const yesterday = new Date(
                  Date.now() - 86400000,
                ).toLocaleDateString();
                if (chatDate === today) dateLabel = "Today";
                else if (chatDate === yesterday) dateLabel = "Yesterday";

                return (
                  <React.Fragment key={chat._id}>
                    {isNewDate && (
                      <div className="w-full flex justify-center my-4">
                        <span className="bg-base-200/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-base-content/70 shadow-sm border border-base-content/10 font-medium">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div
                      id={`msg-${chat._id}`}
                      className={`chat ${isMe ? "chat-sender" : "chat-receiver"} group relative transition-all duration-300 ${
                        highlightedMessageId === chat._id
                          ? "ring-2 ring-primary ring-offset-2 rounded-2xl bg-primary/10 p-1"
                          : ""
                      }`}
                    >
                      <div className="chat-avatar avatar">
                        <div className="w-10 h-10 rounded-full border border-base-content/10 overflow-hidden">
                          <img
                            src={
                              isMe
                                ? user?.profilePic
                                  ? getMediaUrl(user.profilePic)
                                  : `https://ui-avatars.com/api/?name=${user?.fullName}`
                                : selectedFriend?.isGroupChat
                                  ? chat.senderId?.profilePic
                                    ? getMediaUrl(chat.senderId.profilePic)
                                    : `https://ui-avatars.com/api/?name=${chat.senderId?.fullName || "User"}`
                                  : selectedFriend?.profilePic
                                    ? getMediaUrl(selectedFriend.profilePic)
                                    : `https://ui-avatars.com/api/?name=${selectedFriend?.fullName}`
                            }
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Quick Reaction Floating Bar */}
                      {activeReactionMenuMsgId === chat._id && (
                        <div
                          className={`reaction-menu-container absolute -top-11 z-40 bg-base-100 border border-base-content/10 shadow-2xl rounded-full px-2 py-1 flex items-center gap-1 animate-in fade-in zoom-in-95 ${
                            isMe ? "right-10" : "left-10"
                          }`}
                        >
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReactToMessage(chat._id, emoji);
                              }}
                              className="text-base hover:scale-130 transition-transform p-1 cursor-pointer border-none bg-transparent"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Micro Hover Action Bar */}
                      <div
                        className={`absolute -top-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-base-100 border border-base-content/10 rounded-full px-1 py-0.5 shadow-md ${
                          isMe ? "right-12" : "left-12"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(chat._id);
                          }}
                          className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-amber-400 transition-colors cursor-pointer border-none bg-transparent"
                          title={chat.isStarred ? "Unstar" : "Star"}
                        >
                          <Star size={13} className={chat.isStarred ? "text-amber-400 fill-amber-400" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMenuMsgId(
                              activeReactionMenuMsgId === chat._id ? null : chat._id,
                            );
                          }}
                          className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none bg-transparent"
                          title="React"
                        >
                          <Smile size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setReplyingTo(chat);
                            setEditingMessage(null);
                          }}
                          className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none bg-transparent"
                          title="Reply"
                        >
                          <Reply size={13} />
                        </button>
                        {isMe &&
                          chat.messageType === "text" &&
                          !chat.isDeletedForEveryone && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMessage(chat);
                                setMessage(chat.message);
                                setReplyingTo(null);
                              }}
                              className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none bg-transparent"
                              title="Edit"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteModal(chat._id);
                          }}
                          className="p-1 rounded-full hover:bg-base-200 text-base-content/70 hover:text-error transition-colors cursor-pointer border-none bg-transparent"
                          title="Delete"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>

                      <div
                        onDoubleClick={() => setShowDeleteModal(chat._id)}
                        className={`chat-bubble relative cursor-pointer shadow-sm ${isMediaOnly ? "p-1.5!" : ""} ${isMe ? "chat-bubble-me" : "chat-bubble-friend"} ${emojiOnly ? "bg-transparent! shadow-none! text-5xl p-0" : ""}`}
                      >
                        {/* Group Sender Name */}
                        {selectedFriend?.isGroupChat && !isMe && (
                          <p className="text-[11px] font-semibold text-[#00a884] mb-1 select-none">
                            {chat.senderId?.fullName || chat.senderId?.email || "Member"}
                          </p>
                        )}

                        {/* Replying-to Quote Block */}
                        {chat.repliedTo && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(chat.repliedTo._id || chat.repliedTo);
                            }}
                            className="mb-1.5 p-1.5 px-2.5 rounded-lg bg-black/10 dark:bg-white/10 border-l-4 border-primary text-xs cursor-pointer hover:opacity-85 transition-opacity select-none"
                          >
                            <p className="font-semibold text-[11px] text-primary truncate">
                              {chat.repliedTo.senderId === user._id
                                ? "You"
                                : selectedFriend?.fullName || "Friend"}
                            </p>
                            <p className="text-[11px] opacity-80 truncate max-w-xs">
                              {chat.repliedTo.messageType === "image"
                                ? "📷 Photo"
                                : chat.repliedTo.messageType === "audio"
                                  ? "🎵 Voice message"
                                  : chat.repliedTo.messageType === "video"
                                    ? "🎥 Video"
                                    : chat.repliedTo.messageType === "document"
                                      ? "📄 Document"
                                      : chat.repliedTo.message}
                            </p>
                          </div>
                        )}

                        <div
                          className={`flex flex-wrap items-end gap-x-3 gap-y-1 ${emojiOnly ? "flex-col" : ""}`}
                        >
                          <div className={emojiOnly ? "mb-2" : "wrap-break-word"}>
                            {renderMessageContent(chat, emojiOnly)}
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[10px] select-none whitespace-nowrap ml-auto ${isMediaOnly ? "absolute bottom-2.5 right-2.5 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm" : emojiOnly ? "absolute -bottom-3 right-0 bg-base-100/80 backdrop-blur-md rounded-full px-1.5 py-0.5 shadow-sm text-base-content/80" : "opacity-70"}`}
                          >
                            {chat.isStarred && (
                              <Star size={11} className="text-amber-400 fill-amber-400 mr-0.5" />
                            )}
                            {chat.isEdited && (
                              <span className="text-[9px] italic opacity-80 mr-0.5">
                                (edited)
                              </span>
                            )}
                            <time>
                              {chat.createdAt
                                ? new Date(chat.createdAt).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                  )
                                : chat.timestamp}
                            </time>
                            {isMe &&
                              (chat.isRead ? (
                                <CheckCheck
                                  size={14}
                                  className="text-sky-500 font-bold"
                                  title="Read"
                                />
                              ) : onlineUsers[selectedFriend?._id] ? (
                                <CheckCheck
                                  size={14}
                                  className={
                                    isMediaOnly
                                      ? "text-white/80"
                                      : emojiOnly
                                        ? "text-primary/70"
                                        : "text-black/50"
                                  }
                                  title="Delivered"
                                />
                              ) : (
                                <Check
                                  size={14}
                                  className={
                                    isMediaOnly
                                      ? "text-white/80"
                                      : emojiOnly
                                        ? "text-primary/70"
                                        : "text-black/50"
                                  }
                                  title="Sent"
                                />
                              ))}
                          </div>
                        </div>

                        {/* Reaction Badges */}
                        {chat.reactions && chat.reactions.length > 0 && (
                          <div
                            className={`flex flex-wrap gap-1 mt-1 z-10 ${
                              isMe ? "justify-end" : "justify-start"
                            }`}
                          >
                            {groupReactions(chat.reactions, user._id).map(
                              ({ emoji, count, hasUserReacted }) => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReactToMessage(chat._id, emoji);
                                  }}
                                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border shadow-2xs transition-all active:scale-95 cursor-pointer ${
                                    hasUserReacted
                                      ? "bg-primary/20 border-primary text-primary font-bold"
                                      : "bg-base-100/90 border-base-content/10 text-base-content/80 hover:bg-base-200"
                                  }`}
                                  title={hasUserReacted ? "Remove reaction" : "React"}
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && (
                                    <span className="text-[10px]">{count}</span>
                                  )}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      {showDeleteModal === chat._id && (
                        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 px-4">
                          <div className="delete-modal bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                            <h3 className="font-semibold text-lg text-base-content mb-2">
                              Delete message?
                            </h3>
                            {isMe && (
                              <button
                                onClick={() => {
                                  handleDeleteMessage(chat._id, "for_everyone");
                                  setShowDeleteModal(null);
                                }}
                                className="btn btn-error btn-outline w-full rounded-xl"
                              >
                                Delete for everyone
                              </button>
                            )}
                            <button
                              onClick={() => {
                                handleDeleteMessage(chat._id, "for_me");
                                setShowDeleteModal(null);
                              }}
                              className="btn btn-base-300 w-full rounded-xl"
                            >
                              Delete for me
                            </button>
                            <button
                              onClick={() => setShowDeleteModal(null)}
                              className="btn btn-ghost w-full rounded-xl"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              });
            })()}

            {/* Live Typing Indicator Bubble */}
            {isFriendTyping && (
              <div className="chat chat-receiver group relative animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="chat-avatar avatar">
                  <div className="w-8 h-8 rounded-full border border-base-content/10 overflow-hidden">
                    <img
                      src={
                        selectedFriend?.profilePic
                          ? getMediaUrl(selectedFriend.profilePic)
                          : `https://ui-avatars.com/api/?name=${selectedFriend?.fullName}`
                      }
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="chat-bubble bg-base-100 shadow-sm border border-base-content/10 py-2.5 px-3.5 flex items-center gap-1.5 text-xs text-base-content/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></span>
                  <span className="ml-1 text-[11px] font-medium text-base-content/60">
                    typing...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="p-3 bg-base-100 border-t border-base-content/10 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            {/* Replying-to Preview Bar */}
            {replyingTo && (
              <div className="mb-2 p-2 px-3 bg-base-200/95 backdrop-blur-md rounded-xl border-l-4 border-primary flex items-center justify-between shadow-xs animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex flex-col text-xs max-w-[85%] truncate">
                  <span className="font-semibold text-primary text-[11px]">
                    Replying to{" "}
                    {replyingTo.senderId === user._id
                      ? "yourself"
                      : selectedFriend?.fullName || "Friend"}
                  </span>
                  <span className="text-base-content/70 text-[11px] truncate">
                    {replyingTo.messageType === "image"
                      ? "📷 Photo"
                      : replyingTo.messageType === "audio"
                        ? "🎵 Voice message"
                        : replyingTo.messageType === "video"
                          ? "🎥 Video"
                          : replyingTo.messageType === "document"
                            ? "📄 Document"
                            : replyingTo.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="btn btn-ghost btn-circle btn-xs hover:bg-base-content/10"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Editing Message Preview Bar */}
            {editingMessage && (
              <div className="mb-2 p-2 px-3 bg-primary/10 rounded-xl border-l-4 border-primary flex items-center justify-between shadow-xs animate-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 text-xs truncate">
                  <Edit2 size={13} className="text-primary shrink-0" />
                  <span className="font-semibold text-primary text-[11px]">
                    Editing message:
                  </span>
                  <span className="text-base-content/70 text-[11px] truncate">
                    {editingMessage.message}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(null);
                    setMessage("");
                  }}
                  className="btn btn-ghost btn-circle btn-xs hover:bg-base-content/10"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => handleMessageSend(e, "text")}
              className="flex items-center gap-1 sm:gap-2 bg-base-200 rounded-full p-1 sm:p-1.5 border border-base-content/10 shadow-sm relative"
            >
              {/* Attachment Menu */}
              <div className="relative" ref={attachmentRef}>
                <button
                  type="button"
                  onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  className="p-2.5 bg-base-content/10 rounded-full text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none outline-none"
                >
                  <Plus
                    size={20}
                    className={`transition-transform duration-300 ${isAttachmentOpen ? "rotate-45" : ""}`}
                  />
                </button>

                {isAttachmentOpen && (
                  <div className="absolute bottom-14 left-0 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-1.5 w-56 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current.accept = "*/*";
                        fileInputRef.current.click();
                      }}
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content"
                    >
                      <div className="bg-[#7F66FF] text-white p-2.5 rounded-full shadow-sm">
                        <FileText size={18} />
                      </div>{" "}
                      Document
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current.accept = "image/*,video/*";
                        fileInputRef.current.click();
                      }}
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content"
                    >
                      <div className="bg-[#007BFF] text-white p-2.5 rounded-full shadow-sm">
                        <ImageIcon size={18} />
                      </div>{" "}
                      Photo & Video
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content opacity-50 cursor-not-allowed"
                    >
                      <div className="bg-[#FF3B30] text-white p-2.5 rounded-full shadow-sm">
                        <Camera size={18} />
                      </div>{" "}
                      Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current.accept = "audio/*";
                        fileInputRef.current.click();
                      }}
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content"
                    >
                      <div className="bg-[#FF9500] text-white p-2.5 rounded-full shadow-sm">
                        <Music size={18} />
                      </div>{" "}
                      Audio
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-base-content/70 hover:text-base-content transition-colors"
                >
                  <Smile size={20} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-12 left-0 z-50 shadow-2xl">
                    <EmojiPicker
                      onEmojiClick={(emojiData) =>
                        setMessage((prev) => prev + emojiData.emoji)
                      }
                      theme={
                        localStorage.getItem("theme") === "dark" ||
                        localStorage.getItem("theme") === "black"
                          ? "dark"
                          : "light"
                      }
                    />
                  </div>
                )}
              </div>

              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 px-3 text-error animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <span className="text-sm font-medium">
                    Recording... {Math.floor(recordingTime / 60)}:
                    {(recordingTime % 60).toString().padStart(2, "0")}
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={message}
                  onChange={handleTypingInput}
                  placeholder={
                    editingMessage ? "Edit your message..." : "Type your message..."
                  }
                  className="flex-1 bg-transparent text-base-content outline-none px-3 text-sm placeholder:text-base-content/50"
                />
              )}

              {isRecording ? (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="p-2.5 bg-error text-error-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-error/20"
                >
                  <StopCircle size={18} />
                </button>
              ) : editingMessage ? (
                <button
                  type="submit"
                  className="p-2.5 bg-primary text-primary-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-primary/20"
                  title="Save edit"
                >
                  <Check size={18} />
                </button>
              ) : message.trim() ? (
                <button
                  type="submit"
                  className="p-2.5 bg-primary text-primary-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-primary/20"
                >
                  <Send size={18} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-2.5 bg-success text-success-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-success/20"
                >
                  <Mic size={18} />
                </button>
              )}
            </form>
          </div>

    </div>
  );
};

export default Chatting;
