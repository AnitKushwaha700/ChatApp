import React, { useEffect, useState, useRef } from "react";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { X, Image as ImageIcon, Send, Plus, Mic, FileText, Camera, Music, UserPlus, StopCircle, Smile } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

const Chatting = ({ selectedFriend, setSelectedFriend }) => {
  const { user } = useAuth();
  const [filteredChatData, setFilteredChatData] = useState([]);
  const [message, setMessage] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const attachmentRef = useRef(null);

  const fetchChatData = async () => {
    try {
      const res = await api.get(`/user/get-messages/${selectedFriend._id}`);
      setFilteredChatData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch chat data", error);
    }
  };

  const handleMessageSend = async (e, type = "text", file = null) => {
    e?.preventDefault();
    if (type === "text" && !message.trim()) return;

    try {
      if (type === "text") {
        await api.post("/user/send-message", {
          receiverID: selectedFriend._id,
          message,
          messageType: "text",
        });
        setMessage("");
      } else if (file) {
        const formData = new FormData();
        formData.append("receiverID", selectedFriend._id);
        formData.append("messageType", type);
        formData.append("media", file);
        
        await api.post("/user/send-message", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
      }
      
      fetchChatData();
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
    const interval = setInterval(() => { fetchChatData(); }, 2000);
    return () => clearInterval(interval);
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
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredChatData]);

  const renderMessageContent = (chat) => {
    if (chat.messageType === "text") {
      return <p className="text-sm leading-relaxed">{chat.message}</p>;
    } else if (chat.messageType === "image" && chat.mediaUrl) {
      return <img src={`${api.defaults.baseURL}${chat.mediaUrl}`} alt="Attachment" className="max-w-[250px] rounded-lg mt-1 object-cover" />;
    } else if (chat.messageType === "audio" && chat.mediaUrl) {
      return <audio controls src={`${api.defaults.baseURL}${chat.mediaUrl}`} className="w-[200px] h-10 mt-1 outline-none" />;
    } else if (chat.messageType === "video" && chat.mediaUrl) {
      return <video controls src={`${api.defaults.baseURL}${chat.mediaUrl}`} className="max-w-[250px] rounded-lg mt-1" />;
    } else {
      return (
        <a href={`${api.defaults.baseURL}${chat.mediaUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm bg-base-100/20 p-3 rounded-lg">
          <FileText size={20} /> <span className="underline">View Document</span>
        </a>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-base-content/10 bg-base-200">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold text-lg overflow-hidden border-2 border-base-100">
              {selectedFriend?.profilePic ? (
                  <img src={`${api.defaults.baseURL}${selectedFriend.profilePic}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  selectedFriend?.fullName?.charAt(0).toUpperCase() || selectedFriend?.email?.charAt(0).toUpperCase()
                )}
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200"></div>
          </div>
          <div>
            <h3 className="font-semibold text-sm">{selectedFriend?.fullName || selectedFriend?.email}</h3>
            <p className="text-xs text-base-content/70">Online</p>
          </div>
        </div>
        <button onClick={() => setSelectedFriend(null)} className="text-base-content/70 hover:text-base-content transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {filteredChatData.map((chat) => {
          const isMe = chat.senderId === user._id;
          return (
            <div key={chat._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                  isMe ? "bg-primary text-primary-content rounded-tr-sm shadow-md" : "bg-base-200 text-base-content rounded-tl-sm shadow-md border border-base-content/5"
                }`}
              >
                {renderMessageContent(chat)}
                <p className={`text-[10px] mt-1 text-right ${isMe ? "text-primary-content/70" : "text-base-content/50"}`}>
                  {chat.createdAt ? new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : chat.timestamp}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-base-100 border-t border-base-content/10">
        <form onSubmit={(e) => handleMessageSend(e, "text")} className="flex items-center gap-2 bg-base-200 rounded-full p-1.5 border border-base-content/10 shadow-sm relative">
          
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
    </div>
  );
};

export default Chatting;