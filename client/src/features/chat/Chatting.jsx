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
import CameraModal from "./CameraModal";
import { applyTheme, THEME_LIST, getSavedTheme } from "../../lib/theme";

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

const appendUniqueMessage = (prevList, msgToAdd) => {
  if (!msgToAdd) return prevList;
  const addId = (msgToAdd._id || msgToAdd.id)?.toString();
  if (!addId) return [...prevList, msgToAdd];
  const exists = prevList.some(
    (m) => (m._id || m.id)?.toString() === addId
  );
  if (exists) return prevList;
  return [...prevList, msgToAdd];
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
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const cameraCaptureInputRef = useRef(null);

  // Advanced messaging states
  const [isFriendTyping, setIsFriendTyping] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeReactionMenuMsgId, setActiveReactionMenuMsgId] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  // Normalize whether selectedFriend is a Chat object (from sidebar) or User object (from new chat / contacts)
  const isGroup = Boolean(selectedFriend?.isGroupChat);
  const otherUser = React.useMemo(() => {
    if (!selectedFriend) return null;
    if (isGroup) return null;
    if (Array.isArray(selectedFriend.users)) {
      return (
        selectedFriend.users.find(
          (u) => (u._id || u).toString() !== user?._id?.toString()
        ) || null
      );
    }
    return selectedFriend;
  }, [selectedFriend, isGroup, user?._id]);

  const targetChatId = isGroup
    ? selectedFriend?._id
    : Array.isArray(selectedFriend?.users)
    ? selectedFriend?._id
    : null;

  const targetReceiverId = isGroup
    ? null
    : otherUser?._id || (typeof otherUser === "string" ? otherUser : null) || (selectedFriend?.users ? null : selectedFriend?._id);

  const displayName = isGroup
    ? selectedFriend?.chatName || "Group"
    : otherUser?.fullName || otherUser?.email || "User";

  const displayAvatar = isGroup
    ? selectedFriend?.groupIcon
    : otherUser?.profilePic;

  const isOtherOnline = Boolean(
    targetReceiverId && onlineUsers[targetReceiverId.toString()]
  );

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
    if (!selectedFriend?._id) return;
    try {
      const res = await api.get(`/user/get-messages/${selectedFriend._id}`);
      setFilteredChatData(res.data.data);

      // Mark messages as read on server and inform sender via socket
      const readTarget = targetChatId || targetReceiverId || selectedFriend._id;
      await api.put(`/user/mark-read/${readTarget}`);
      if (targetReceiverId) {
        socketAPI.emit("mark-read", { from: targetReceiverId });
      }
    } catch (error) {
      console.error("Failed to fetch chat data", error);
    }
  };

  const handleClearChat = async () => {
    if (!selectedFriend?._id) return;
    try {
      const clearTarget = targetChatId || targetReceiverId || selectedFriend._id;
      await api.delete(`/user/messages/${clearTarget}`);
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

    if (editingMessage || (!targetReceiverId && !targetChatId)) return;
    const typingTarget = targetReceiverId || targetChatId;

    if (val.trim()) {
      socketAPI.emit("typing", { to: typingTarget });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketAPI.emit("stop-typing", { to: typingTarget });
      }, 1800);
    } else {
      socketAPI.emit("stop-typing", { to: typingTarget });
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

  const handleMessageSend = async (
    eOrCaption,
    type = "text",
    file = null,
    customCaption = ""
  ) => {
    if (eOrCaption && typeof eOrCaption?.preventDefault === "function") {
      eOrCaption.preventDefault();
    }
    if (editingMessage) {
      return handleEditMessage(eOrCaption);
    }

    const captionText =
      typeof customCaption === "string" && customCaption.trim()
        ? customCaption.trim()
        : typeof eOrCaption === "string" && eOrCaption.trim()
        ? eOrCaption.trim()
        : "";

    if (type === "text" && !message.trim()) return;

    const typingTarget = targetReceiverId || targetChatId;
    if (typingTarget) {
      socketAPI.emit("stop-typing", { to: typingTarget });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    const repliedToId = replyingTo?._id;

    try {
      if (type === "text") {
        const payload = {
          message: message.trim(),
          messageType: "text",
          repliedTo: repliedToId,
        };
        if (targetChatId) payload.chatId = targetChatId;
        if (targetReceiverId) payload.receiverID = targetReceiverId;

        const res = await api.post("/user/send-message", payload);
        setFilteredChatData((prev) => appendUniqueMessage(prev, res.data.data));
        setMessage("");
      } else if (file) {
        const formData = new FormData();
        if (targetChatId) formData.append("chatId", targetChatId);
        if (targetReceiverId) formData.append("receiverID", targetReceiverId);
        formData.append("messageType", type);
        formData.append("media", file);
        if (captionText) {
          formData.append("message", captionText);
        }
        if (repliedToId) {
          formData.append("repliedTo", repliedToId);
        }

        const res = await api.post("/user/send-message", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFilteredChatData((prev) => appendUniqueMessage(prev, res.data.data));
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
      const msgChatId = (newMessage.chat?._id || newMessage.chat)?.toString();
      const msgSenderId = (newMessage.senderId?._id || newMessage.senderId)?.toString();
      const msgReceiverId = (newMessage.receiverId?._id || newMessage.receiverId)?.toString();
      const currentUserId = (user?._id || user?.id)?.toString();

      const isRelevant =
        (targetChatId && msgChatId === targetChatId.toString()) ||
        (targetReceiverId &&
          (msgSenderId === targetReceiverId.toString() || msgReceiverId === targetReceiverId.toString())) ||
        (selectedFriend?._id &&
          (msgChatId === selectedFriend._id.toString() ||
            msgSenderId === selectedFriend._id.toString() ||
            msgReceiverId === selectedFriend._id.toString()));

      if (isRelevant) {
        setFilteredChatData((prev) => appendUniqueMessage(prev, newMessage));

        if (msgSenderId && currentUserId && msgSenderId !== currentUserId) {
          playMessageSound("incoming");
          const markTarget = targetChatId || targetReceiverId || selectedFriend._id;
          api.put(`/user/mark-read/${markTarget}`).catch(console.error);
          if (targetReceiverId) {
            socketAPI.emit("mark-read", { from: targetReceiverId });
          }
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
      if (
        from === targetReceiverId ||
        from === targetChatId ||
        from === selectedFriend?._id
      ) {
        setIsFriendTyping(true);
      }
    };

    const handleStopTyping = ({ from }) => {
      if (
        from === targetReceiverId ||
        from === targetChatId ||
        from === selectedFriend?._id
      ) {
        setIsFriendTyping(false);
      }
    };

    const handleMessagesRead = ({ friendId }) => {
      if (
        friendId === targetReceiverId ||
        friendId === targetChatId ||
        friendId === selectedFriend?._id
      ) {
        setFilteredChatData((prev) =>
          prev.map((msg) =>
            msg.senderId === user._id || msg.senderId?._id === user._id
              ? { ...msg, isRead: true }
              : msg
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
      <div className="p-3 sm:px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] flex items-center justify-between border-b border-base-content/10 bg-base-200 shrink-0">
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
              {isGroup ? (
                selectedFriend.groupIcon ? (
                  <img
                    src={getMediaUrl(selectedFriend.groupIcon)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Users className="w-5 h-5 text-primary" />
                )
              ) : displayAvatar ? (
                <img
                  src={getMediaUrl(displayAvatar)}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                (displayName || "U").charAt(0).toUpperCase()
              )}
            </div>
            {!isGroup && isOtherOnline && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate text-base-content">
              {displayName}
            </h3>
            {isFriendTyping ? (
              <p className="text-xs text-primary font-semibold flex items-center gap-1.5 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping"></span>
                <span>typing...</span>
              </p>
            ) : isGroup ? (
              <p className="text-xs text-base-content/70 truncate">
                {selectedFriend.users?.length || 0} participants
              </p>
            ) : (
              <p className="text-xs text-base-content/70">
                {isOtherOnline ? "Online" : "Offline"}
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
          {!isGroup && initiateCall && (
            <>
              <button
                onClick={() => initiateCall(otherUser || selectedFriend, true)}
                className="text-primary hover:opacity-80 transition-opacity p-1 bg-transparent border-none outline-none cursor-pointer"
              >
                <Video size={24} />
              </button>
              <button
                onClick={() => initiateCall(otherUser || selectedFriend, false)}
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
                const senderIdStr = (chat.senderId?._id || chat.senderId)?.toString();
                const currentUserIdStr = (user?._id || user?.id)?.toString();
                const isMe = Boolean(senderIdStr && currentUserIdStr && senderIdStr === currentUserIdStr);

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
                      <div className="w-full flex justify-center my-3 select-none">
                        <span className="bg-[#182229] px-3 py-1 rounded-lg text-xs text-[#8696a0] shadow-sm border border-[#222e35]/50 font-normal">
                          {dateLabel}
                        </span>
                      </div>
                    )}
                    <div
                      id={`msg-${chat._id}`}
                      className={`w-full flex ${isMe ? "justify-end" : "justify-start"} px-2 sm:px-4 my-0.5 group relative transition-all duration-200 ${
                        highlightedMessageId === chat._id
                          ? "ring-2 ring-[#00a884] ring-offset-2 rounded-2xl bg-[#00a884]/15 p-1"
                          : ""
                      }`}
                    >
                      {/* Micro Hover Action Bar */}
                      <div
                        className={`absolute -top-3.5 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-[#202c33] border border-[#2a3942] rounded-full px-1.5 py-0.5 shadow-lg ${
                          isMe ? "right-4 sm:right-8" : "left-4 sm:left-8"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStar(chat._id);
                          }}
                          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-amber-400 transition-colors cursor-pointer border-none bg-transparent"
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
                          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer border-none bg-transparent"
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
                          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer border-none bg-transparent"
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
                              className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer border-none bg-transparent"
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
                          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-rose-400 transition-colors cursor-pointer border-none bg-transparent"
                          title="Delete"
                        >
                          <MoreVertical size={13} />
                        </button>
                      </div>

                      {/* Quick Reaction Floating Bar */}
                      {activeReactionMenuMsgId === chat._id && (
                        <div
                          className={`reaction-menu-container absolute -top-11 z-40 bg-[#202c33] border border-[#2a3942] shadow-2xl rounded-full px-2 py-1 flex items-center gap-1.5 animate-in fade-in zoom-in-95 ${
                            isMe ? "right-4 sm:right-8" : "left-4 sm:left-8"
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

                      {/* Authentic WhatsApp Message Bubble */}
                      <div
                        onDoubleClick={() => setShowDeleteModal(chat._id)}
                        className={`relative max-w-[85%] sm:max-w-[65%] rounded-lg px-2.5 py-1.5 shadow-xs text-sm select-text transition-all ${
                          isMediaOnly ? "p-1!" : ""
                        } ${
                          isMe
                            ? "bg-[#005c4b] text-[#e9edef] rounded-tr-none"
                            : "bg-[#202c33] text-[#e9edef] rounded-tl-none"
                        } ${emojiOnly ? "bg-transparent! shadow-none! text-5xl p-0!" : ""}`}
                      >
                        {/* Group Sender Name */}
                        {isGroup && !isMe && (
                          <p className="text-[12px] font-semibold text-[#00a884] mb-0.5 select-none">
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
                            className={`mb-1.5 p-1.5 px-2.5 rounded-md border-l-4 text-xs cursor-pointer hover:opacity-90 transition-opacity select-none ${
                              isMe
                                ? "bg-black/20 border-white/60 text-white/90"
                                : "bg-black/30 border-[#00a884] text-[#e9edef]"
                            }`}
                          >
                            <p className={`font-semibold text-[11px] truncate ${isMe ? "text-white" : "text-[#00a884]"}`}>
                              {(chat.repliedTo.senderId?._id || chat.repliedTo.senderId)?.toString() === currentUserIdStr
                                ? "You"
                                : displayName || "Friend"}
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
                          className={`flex flex-wrap items-end gap-x-2 gap-y-0.5 ${emojiOnly ? "flex-col" : ""}`}
                        >
                          <div className={emojiOnly ? "mb-1" : "break-words leading-relaxed text-[14.2px]"}>
                            {renderMessageContent(chat, emojiOnly)}
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[11px] select-none whitespace-nowrap ml-auto pt-1 pl-1.5 ${
                              isMediaOnly
                                ? "absolute bottom-2 right-2 bg-black/60 text-white rounded-full px-2 py-0.5 backdrop-blur-sm"
                                : emojiOnly
                                  ? "absolute -bottom-3 right-0 bg-[#202c33] rounded-full px-1.5 py-0.5 shadow-sm text-[#8696a0]"
                                  : isMe
                                    ? "text-white/65"
                                    : "text-[#8696a0]"
                            }`}
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
                                    { hour: "numeric", minute: "2-digit" },
                                  )
                                : chat.timestamp}
                            </time>
                            {isMe &&
                              (chat.isRead ? (
                                <CheckCheck
                                  size={15}
                                  className="text-[#53bdeb] font-bold"
                                  title="Read"
                                />
                              ) : isOtherOnline ? (
                                <CheckCheck
                                  size={15}
                                  className="text-white/70"
                                  title="Delivered"
                                />
                              ) : (
                                <Check
                                  size={15}
                                  className="text-white/70"
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
                                      ? "bg-[#00a884]/20 border-[#00a884] text-[#00a884] font-bold"
                                      : "bg-[#202c33]/90 border-[#2a3942] text-[#e9edef] hover:bg-[#2a3942]"
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
                        {/* Delete Modal for this message */}
                        {showDeleteModal === chat._id && (
                          <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4">
                            <div className="delete-modal bg-[#202c33] p-6 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-3 border border-[#2a3942] animate-in fade-in zoom-in-95 duration-200">
                              <h3 className="font-semibold text-lg text-[#e9edef] mb-2">
                                Delete message?
                              </h3>
                              {isMe && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleDeleteMessage(chat._id, "for_everyone");
                                    setShowDeleteModal(null);
                                  }}
                                  className="py-2.5 px-4 rounded-xl text-sm font-medium border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                >
                                  Delete for everyone
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteMessage(chat._id, "for_me");
                                  setShowDeleteModal(null);
                                }}
                                className="py-2.5 px-4 rounded-xl text-sm font-medium bg-[#2a3942] hover:bg-[#374248] text-[#e9edef] transition-colors cursor-pointer"
                              >
                                Delete for me
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowDeleteModal(null)}
                                className="py-2 px-4 rounded-xl text-sm font-medium text-[#8696a0] hover:text-[#e9edef] transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </React.Fragment>
                );
              });
            })()}

            {/* Live Typing Indicator Bubble */}
            {isFriendTyping && (
              <div className="w-full flex justify-start px-2 sm:px-4 my-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="bg-[#202c33] text-[#8696a0] rounded-lg rounded-tl-none px-3.5 py-2.5 flex items-center gap-1.5 shadow-xs border border-[#2a3942]/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-bounce"></span>
                  <span className="ml-1 text-[11px] font-medium text-[#8696a0]">
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
                      : displayName || "Friend"}
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
                      onClick={() => {
                        setIsAttachmentOpen(false);
                        if (
                          typeof navigator !== "undefined" &&
                          navigator.mediaDevices &&
                          navigator.mediaDevices.getUserMedia
                        ) {
                          setIsCameraModalOpen(true);
                        } else {
                          cameraCaptureInputRef.current?.click();
                        }
                      }}
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content cursor-pointer"
                    >
                      <div className="bg-[#FF3B30] text-white p-2.5 rounded-full shadow-sm hover:scale-105 transition-transform">
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

      {/* Fallback Native Camera Input */}
      <input
        type="file"
        ref={cameraCaptureInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* WhatsApp Live Camera Modal */}
      <CameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onCapture={(file, caption) => {
          handleMessageSend(null, "image", file, caption);
        }}
      />
    </div>
  );
};

export default Chatting;
