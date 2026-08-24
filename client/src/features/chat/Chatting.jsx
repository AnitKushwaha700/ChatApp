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
  Trash2,
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
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { motion } from "motion/react";

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

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const attachmentRef = useRef(null);

  const handleSendRequest = async () => {
    try {
      const res = await api.post(`/user/request/${selectedFriend._id}`);
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to send request", error);
    }
  };

  const handleAcceptRequest = async () => {
    try {
      const res = await api.post(`/user/accept/${selectedFriend._id}`);
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to accept request", error);
    }
  };

  const handleDeclineRequest = async () => {
    try {
      const res = await api.post(`/user/decline/${selectedFriend._id}`);
      setUser(res.data.data);
      sessionStorage.setItem("AppUser", JSON.stringify(res.data.data));
    } catch (error) {
      console.error("Failed to decline request", error);
    }
  };

  const fetchChatData = async () => {
    try {
      const res = await api.get(`/user/get-messages/${selectedFriend._id}`);
      setFilteredChatData(res.data.data);

      // Mark messages as read
      await api.put(`/user/mark-read/${selectedFriend._id}`);
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
      setActiveMessageDropdown(null);
    } catch (error) {
      console.error("Failed to delete message", error);
    }
  };

  const handleMessageSend = async (e, type = "text", file = null) => {
    e?.preventDefault();
    if (type === "text" && !message.trim()) return;

    try {
      if (type === "text") {
        const res = await api.post("/user/send-message", {
          receiverID: selectedFriend._id,
          message,
          messageType: "text",
        });
        setFilteredChatData((prev) => [...prev, res.data.data]);
        setMessage("");
      } else if (file) {
        const formData = new FormData();
        formData.append("receiverID", selectedFriend._id);
        formData.append("messageType", type);
        formData.append("media", file);

        const res = await api.post("/user/send-message", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setFilteredChatData((prev) => [...prev, res.data.data]);
      }
      playMessageSound('outgoing');

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
    fetchChatData();
  }, [selectedFriend]);

  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      if (
        newMessage.senderId === selectedFriend?._id ||
        newMessage.receiverId === selectedFriend?._id
      ) {
        setFilteredChatData((prev) => {
          // Check if message already exists to avoid duplicates
          if (prev.find((msg) => msg._id === newMessage._id)) return prev;
          if (newMessage.senderId !== user._id) {
            playMessageSound('incoming');
          }
          return [...prev, newMessage];
        });

        // Mark as read if the chat is currently open
        if (newMessage.senderId === selectedFriend?._id) {
          api.put(`/user/mark-read/${selectedFriend._id}`).catch(console.error);
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

    socketAPI.on("newMessage", handleNewMessage);
    socketAPI.on("messageDeleted", handleMessageDeleted);

    return () => {
      socketAPI.off("newMessage", handleNewMessage);
      socketAPI.off("messageDeleted", handleMessageDeleted);
    };
  }, [selectedFriend]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        attachmentRef.current &&
        !attachmentRef.current.contains(event.target)
      ) {
        setIsAttachmentOpen(false);
      }
      // Simple way to close emoji picker when clicking outside without a dedicated ref
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker, showDeleteModal, isHeaderMenuOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredChatData]);

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
            className="max-w-[240px] sm:max-w-[300px] rounded-lg object-cover"
          />
          {chat.message && chat.message !== "Sent an attachment" && (
            <p className="text-sm mt-2 px-1">{chat.message}</p>
          )}
        </div>
      );
    } else if (chat.messageType === "audio" && chat.mediaUrl) {
      return (
        <div className="flex flex-col gap-1 w-[240px] mt-1">
          <audio
            controls
            src={getMediaUrl(chat.mediaUrl)}
            className="w-full h-10 outline-none rounded-full"
          />
        </div>
      );
    } else if (chat.messageType === "video" && chat.mediaUrl) {
      return (
        <div className="relative">
          <video
            controls
            src={getMediaUrl(chat.mediaUrl)}
            className="max-w-[240px] sm:max-w-[300px] rounded-lg object-cover"
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

  const isFriend = user?.friends?.includes(selectedFriend?._id);
  const isRequestSent = user?.sentRequests?.includes(selectedFriend?._id);
  const isRequestReceived = user?.pendingRequests?.includes(
    selectedFriend?._id,
  );

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-base-content/10 bg-base-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedFriend(null)}
            className="md:hidden text-base-content/70 hover:text-base-content transition-colors mr-1 cursor-pointer bg-transparent border-none p-0 outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-base-100">
              {selectedFriend?.profilePic ? (
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
            {onlineUsers[selectedFriend?._id] && (
              <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              {selectedFriend?.fullName || selectedFriend?.email}
            </h3>
            <p className="text-xs text-base-content/70">
              {onlineUsers[selectedFriend?._id] ? "Online" : "Offline"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 relative header-menu">
          {initiateCall && (
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

      {/* Theme Modal */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
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
                    document.documentElement.setAttribute("data-theme", theme.id);
                    localStorage.setItem("theme", theme.id);
                    localStorage.setItem("mingoTheme", theme.id);
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
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-base-200 to-transparent -z-0 opacity-80"></div>
                </button>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Confirmation Modal */}
      {isClearChatModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
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

      {/* Connection UI or Chat */}
      {!isFriend ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 rounded-full bg-base-200 flex items-center justify-center mb-4">
            <UserPlus className="w-10 h-10 text-base-content/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            Connect with {selectedFriend?.fullName}
          </h3>

          {filteredChatData.length > 0 &&
          filteredChatData[filteredChatData.length - 1].message.includes(
            "declined",
          ) ? (
            <p className="text-error font-medium text-sm mb-6 max-w-md px-4 py-2 bg-error/10 rounded-lg">
              {filteredChatData[filteredChatData.length - 1].message}
            </p>
          ) : (
            <p className="text-base-content/70 text-sm mb-6 max-w-md">
              You must be friends to chat. Send a request to start
              communicating!
            </p>
          )}

          {isRequestSent ? (
            <button
              disabled
              className="btn btn-primary opacity-50 cursor-not-allowed px-8"
            >
              Request Sent...
            </button>
          ) : isRequestReceived ? (
            <div className="flex gap-4">
              <button
                onClick={handleAcceptRequest}
                className="btn btn-success text-success-content px-8"
              >
                Accept
              </button>
              <button
                onClick={handleDeclineRequest}
                className="btn btn-error text-error-content px-8"
              >
                Decline
              </button>
            </div>
          ) : (
            <button
              onClick={handleSendRequest}
              className="btn btn-primary px-8"
            >
              Send Chat Request
            </button>
          )}
        </div>
      ) : (
        <>
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
                      className={`chat ${isMe ? "chat-sender" : "chat-receiver"} group relative`}
                    >
                      <div className="chat-avatar avatar">
                        <div className="w-10 h-10 rounded-full border border-base-content/10">
                          <img
                            src={
                              isMe
                                ? user?.profilePic
                                  ? getMediaUrl(user.profilePic)
                                  : `https://ui-avatars.com/api/?name=${user?.fullName}`
                                : selectedFriend?.profilePic
                                  ? getMediaUrl(selectedFriend.profilePic)
                                  : `https://ui-avatars.com/api/?name=${selectedFriend?.fullName}`
                            }
                            alt="avatar"
                          />
                        </div>
                      </div>
                      <div
                        onDoubleClick={() => setShowDeleteModal(chat._id)}
                        className={`chat-bubble relative cursor-pointer shadow-sm ${isMediaOnly ? "!p-1.5" : ""} ${isMe ? "bg-[#dcf8c6] text-black" : "bg-white text-black"} ${emojiOnly ? "!bg-transparent !shadow-none text-5xl p-0" : ""}`}
                      >
                        <div
                          className={`flex flex-wrap items-end gap-x-3 gap-y-1 ${emojiOnly ? "flex-col" : ""}`}
                        >
                          <div className={emojiOnly ? "mb-2" : "break-words"}>
                            {renderMessageContent(chat, emojiOnly)}
                          </div>

                          <div
                            className={`flex items-center gap-1 text-[10px] select-none whitespace-nowrap ml-auto ${isMediaOnly ? "absolute bottom-2.5 right-2.5 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm" : emojiOnly ? "absolute -bottom-3 right-0 bg-base-100/80 backdrop-blur-md rounded-full px-1.5 py-0.5 shadow-sm text-base-content/80" : "opacity-70"}`}
                          >
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
                                  className={
                                    isMediaOnly
                                      ? "text-info"
                                      : emojiOnly
                                        ? "text-primary"
                                        : isMe
                                          ? "text-white"
                                          : "text-info"
                                  }
                                />
                              ) : (
                                <Check size={14} />
                              ))}
                          </div>
                        </div>
                      </div>

                      {showDeleteModal === chat._id && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
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
            <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="p-3 bg-base-100 border-t border-base-content/10">
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
                    <button
                      type="button"
                      className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium text-base-content opacity-50 cursor-not-allowed"
                    >
                      <div className="bg-[#34C759] text-white p-2.5 rounded-full shadow-sm">
                        <UserPlus size={18} />
                      </div>{" "}
                      Contact
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
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
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
        </>
      )}
    </div>
  );
};

export default Chatting;
