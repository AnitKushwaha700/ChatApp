import React, { useEffect, useState, useRef } from "react";
import api from "../../config/api";
import socketAPI from "../../config/webSocket";
import { useAuth } from "../../context/AuthContext";
import { X, Image as ImageIcon, Send, Plus, Mic, FileText, Camera, Music, UserPlus, StopCircle, Smile, ArrowLeft, Trash2, MoreVertical, Check, CheckCheck } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { motion } from "motion/react";

const isEmojiOnly = (text) => {
  if (!text) return false;
  const noSpace = text.replace(/[\s\n]/g, '');
  if (noSpace.length === 0) return false;
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(noSpace);
};

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const Chatting = ({ selectedFriend, setSelectedFriend, onlineUsers = {} }) => {
  const { user, setUser } = useAuth();
  const [filteredChatData, setFilteredChatData] = useState([]);
  const [message, setMessage] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  
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
    if (window.confirm("Are you sure you want to clear this chat?")) {
      try {
        await api.delete(`/user/messages/${selectedFriend._id}`);
        setFilteredChatData([]);
        setIsHeaderMenuOpen(false);
      } catch (error) {
        console.error("Failed to clear chat", error);
      }
    }
  };

  const handleDeleteMessage = async (messageId, type) => {
    try {
      await api.delete(`/user/message/${messageId}?type=${type}`);
      if (type === "for_me") {
        setFilteredChatData(prev => prev.filter(m => m._id !== messageId));
      } else {
        setFilteredChatData(prev => prev.map(m => {
          if (m._id === messageId) {
            return { ...m, message: "🚫 This message was deleted", messageType: "text", mediaUrl: null };
          }
          return m;
        }));
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
          headers: { "Content-Type": "multipart/form-data" }
        });
        setFilteredChatData((prev) => [...prev, res.data.data]);
      }
      
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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", { type: "audio/webm" });
        handleMessageSend(null, "audio", audioFile);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
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
      if (newMessage.senderId === selectedFriend?._id || newMessage.receiverId === selectedFriend?._id) {
        setFilteredChatData((prev) => {
          // Check if message already exists to avoid duplicates
          if (prev.find(msg => msg._id === newMessage._id)) return prev;
          return [...prev, newMessage];
        });

        // Mark as read if the chat is currently open
        if (newMessage.senderId === selectedFriend?._id) {
          api.put(`/user/mark-read/${selectedFriend._id}`).catch(console.error);
        }
      }
    };

    const handleMessageDeleted = ({ messageId }) => {
      setFilteredChatData((prev) => prev.map((m) => {
        if (m._id === messageId) {
          return { ...m, message: "🚫 This message was deleted", messageType: "text", mediaUrl: null };
        }
        return m;
      }));
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
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setIsAttachmentOpen(false);
      }
      // Simple way to close emoji picker when clicking outside without a dedicated ref
      if (showEmojiPicker && !event.target.closest('.emoji-picker-react') && !event.target.closest('button')) {
        setShowEmojiPicker(false);
      }
      if (showDeleteModal && !event.target.closest('.delete-modal')) {
        setShowDeleteModal(null);
      }
      if (isHeaderMenuOpen && !event.target.closest('.header-menu')) {
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
      return <p className="text-sm leading-relaxed">{chat.message}</p>;
    } else if (chat.messageType === "image" && chat.mediaUrl) {
      return <img src={getMediaUrl(chat.mediaUrl)} alt="Attachment" className="max-w-[250px] rounded-lg mt-1 object-cover" />;
    } else if (chat.messageType === "audio" && chat.mediaUrl) {
      return <audio controls src={getMediaUrl(chat.mediaUrl)} className="w-[200px] h-10 mt-1 outline-none" />;
    } else if (chat.messageType === "video" && chat.mediaUrl) {
      return <video controls src={getMediaUrl(chat.mediaUrl)} className="max-w-[250px] rounded-lg mt-1" />;
    } else {
      return (
        <a href={getMediaUrl(chat.mediaUrl)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm bg-base-100/20 p-3 rounded-lg">
          <FileText size={20} /> <span className="underline">View Document</span>
        </a>
      );
    }
  };

  const isFriend = user?.friends?.includes(selectedFriend?._id);
  const isRequestSent = user?.sentRequests?.includes(selectedFriend?._id);
  const isRequestReceived = user?.pendingRequests?.includes(selectedFriend?._id);

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
                  <img src={getMediaUrl(selectedFriend.profilePic)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  selectedFriend?.fullName?.charAt(0).toUpperCase() || selectedFriend?.email?.charAt(0).toUpperCase()
                )}
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
          </div>
          <div>
            <h3 className="font-semibold text-sm">{selectedFriend?.fullName || selectedFriend?.email}</h3>
            <p className="text-xs text-base-content/70">{onlineUsers[selectedFriend?._id] ? "Online" : "Offline"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative header-menu">
          <button onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)} className="text-base-content/70 hover:text-base-content transition-colors p-1 bg-transparent border-none outline-none cursor-pointer">
            <MoreVertical size={20} />
          </button>
          {isHeaderMenuOpen && (
            <div className="absolute top-10 right-8 bg-base-100 border border-base-content/10 rounded-lg shadow-xl z-50 w-36 overflow-hidden">
              <button onClick={handleClearChat} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-base-200 transition-colors border-none outline-none cursor-pointer">
                Clear Chat
              </button>
            </div>
          )}
          <button onClick={() => setSelectedFriend(null)} className="text-base-content/70 hover:text-base-content transition-colors p-1 bg-transparent border-none outline-none cursor-pointer">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Connection UI or Chat */}
      {!isFriend ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
          <div className="w-24 h-24 rounded-full bg-base-200 flex items-center justify-center mb-4">
            <UserPlus className="w-10 h-10 text-base-content/50" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Connect with {selectedFriend?.fullName}</h3>
          
          {filteredChatData.length > 0 && filteredChatData[filteredChatData.length - 1].message.includes("declined") ? (
            <p className="text-error font-medium text-sm mb-6 max-w-md px-4 py-2 bg-error/10 rounded-lg">
              {filteredChatData[filteredChatData.length - 1].message}
            </p>
          ) : (
            <p className="text-base-content/70 text-sm mb-6 max-w-md">
              You must be friends to chat. Send a request to start communicating!
            </p>
          )}
          
          {isRequestSent ? (
            <button disabled className="btn btn-primary opacity-50 cursor-not-allowed px-8">
              Request Sent...
            </button>
          ) : isRequestReceived ? (
            <div className="flex gap-4">
              <button onClick={handleAcceptRequest} className="btn btn-success text-success-content px-8">
                Accept
              </button>
              <button onClick={handleDeclineRequest} className="btn btn-error text-error-content px-8">
                Decline
              </button>
            </div>
          ) : (
            <button onClick={handleSendRequest} className="btn btn-primary px-8">
              Send Chat Request
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Messages */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-base-300/50 bg-repeat bg-center"
            style={{ backgroundImage: "url('https://media.istockphoto.com/id/1403848173/vector/vector-online-chatting-pattern-online-chatting-seamless-background.jpg?s=612x612&w=0&k=20&c=W3O15mtJiNlJuIgU6S9ZlnzM_yCE27eqwTCfXGYwCSo=')", backgroundSize: "300px", backgroundBlendMode: "overlay" }}
          >
            {filteredChatData.map((chat) => {
              const isMe = chat.senderId === user._id;
              const emojiOnly = chat.messageType === "text" && isEmojiOnly(chat.message);
              return (
                <div key={chat._id} className={`chat ${isMe ? 'chat-sender' : 'chat-receiver'} group relative`}>
                  <div className="chat-avatar avatar">
                    <div className="w-10 h-10 rounded-full border border-base-content/10">
                      <img 
                        src={isMe 
                          ? (user?.profilePic ? getMediaUrl(user.profilePic) : `https://ui-avatars.com/api/?name=${user?.fullName}`)
                          : (selectedFriend?.profilePic ? getMediaUrl(selectedFriend.profilePic) : `https://ui-avatars.com/api/?name=${selectedFriend?.fullName}`)
                        } 
                        alt="avatar" 
                      />
                    </div>
                  </div>
                  <div 
                    onDoubleClick={() => setShowDeleteModal(chat._id)}
                    className={`chat-bubble relative cursor-pointer ${isMe ? 'bg-primary text-primary-content' : 'bg-base-200 text-base-content'} ${emojiOnly ? '!bg-transparent !shadow-none text-5xl p-0' : ''}`}
                  >
                    <div className={`flex flex-wrap items-end gap-x-3 gap-y-1 ${emojiOnly ? 'flex-col' : ''}`}>
                      <div className={emojiOnly ? "mb-2" : "break-words"}>{renderMessageContent(chat, emojiOnly)}</div>
                      
                      <div className={`flex items-center gap-1 text-[10px] select-none whitespace-nowrap ml-auto ${emojiOnly ? 'absolute -bottom-3 right-0 bg-base-100/80 backdrop-blur-md rounded-full px-1.5 py-0.5 shadow-sm text-base-content/80' : 'opacity-70'}`}>
                        <time>
                          {chat.createdAt ? new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : chat.timestamp}
                        </time>
                        {isMe && (
                          chat.isRead ? <CheckCheck size={14} className={emojiOnly ? "text-primary" : (isMe ? "text-white" : "text-info")} /> : <Check size={14} />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {showDeleteModal === chat._id && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
                      <div className="delete-modal bg-base-100 p-6 rounded-2xl shadow-xl w-full max-w-sm flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="font-semibold text-lg text-base-content mb-2">Delete message?</h3>
                        {isMe && (
                          <button onClick={() => { handleDeleteMessage(chat._id, "for_everyone"); setShowDeleteModal(null); }} className="btn btn-error btn-outline w-full rounded-xl">
                            Delete for everyone
                          </button>
                        )}
                        <button onClick={() => { handleDeleteMessage(chat._id, "for_me"); setShowDeleteModal(null); }} className="btn btn-base-300 w-full rounded-xl">
                          Delete for me
                        </button>
                        <button onClick={() => setShowDeleteModal(null)} className="btn btn-ghost w-full rounded-xl">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-base-100 border-t border-base-content/10">
            <form onSubmit={(e) => handleMessageSend(e, "text")} className="flex items-center gap-1 sm:gap-2 bg-base-200 rounded-full p-1 sm:p-1.5 border border-base-content/10 shadow-sm relative">
              
              {/* Attachment Menu */}
              <div className="relative" ref={attachmentRef}>
                <button 
                  type="button" 
                  onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
                  className="p-2.5 bg-base-content/10 rounded-full text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none outline-none"
                >
                  <Plus size={20} className={`transition-transform duration-300 ${isAttachmentOpen ? "rotate-45" : ""}`} />
                </button>

                {isAttachmentOpen && (
                  <div className="absolute bottom-14 left-0 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-3 flex flex-col gap-3 w-48 z-50">
                    <button type="button" onClick={() => { fileInputRef.current.accept="*/*"; fileInputRef.current.click(); }} className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-lg transition-colors text-left text-sm text-base-content/80">
                      <div className="bg-indigo-500/10 text-indigo-500 p-2 rounded-full"><FileText size={16} /></div> Document
                    </button>
                    <button type="button" onClick={() => { fileInputRef.current.accept="image/*,video/*"; fileInputRef.current.click(); }} className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-lg transition-colors text-left text-sm text-base-content/80">
                      <div className="bg-pink-500/10 text-pink-500 p-2 rounded-full"><ImageIcon size={16} /></div> Photo & Video
                    </button>
                    <button type="button" className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-lg transition-colors text-left text-sm text-base-content/80 opacity-50 cursor-not-allowed">
                      <div className="bg-red-500/10 text-red-500 p-2 rounded-full"><Camera size={16} /></div> Camera
                    </button>
                    <button type="button" onClick={() => { fileInputRef.current.accept="audio/*"; fileInputRef.current.click(); }} className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-lg transition-colors text-left text-sm text-base-content/80">
                      <div className="bg-orange-500/10 text-orange-500 p-2 rounded-full"><Music size={16} /></div> Audio
                    </button>
                    <button type="button" className="flex items-center gap-3 hover:bg-base-200 p-2 rounded-lg transition-colors text-left text-sm text-base-content/80 opacity-50 cursor-not-allowed">
                      <div className="bg-green-500/10 text-green-500 p-2 rounded-full"><UserPlus size={16} /></div> Contact
                    </button>
                  </div>
                )}
                
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
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
                      onEmojiClick={(emojiData) => setMessage((prev) => prev + emojiData.emoji)}
                      theme={localStorage.getItem("theme") === "dark" || localStorage.getItem("theme") === "black" ? "dark" : "light"}
                    />
                  </div>
                )}
              </div>

              {isRecording ? (
                <div className="flex-1 flex items-center gap-3 px-3 text-error animate-pulse">
                  <div className="w-2.5 h-2.5 rounded-full bg-error"></div>
                  <span className="text-sm font-medium">Recording... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
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