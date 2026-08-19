import React, { useEffect, useState, useRef } from "react";
import api from "../../config/api";
import { useAuth } from "../../context/AuthContext";
import { X, Image, Send } from "lucide-react";

const Chatting = ({ selectedFriend, setSelectedFriend }) => {
  const { user } = useAuth();
  const [filteredChatData, setFilteredChatData] = useState([]);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  const fetchChatData = async () => {
    try {
      const res = await api.get(`/user/get-messages/${selectedFriend._id}`);
      setFilteredChatData(res.data.data);
    } catch (error) {
      console.error("Failed to fetch chat data", error);
    }
  };

  const handleMessageSend = async (e) => {
    e?.preventDefault();
    if (!message.trim()) return;

    try {
      await api.post("/user/send-message", {
        receiverID: selectedFriend._id,
        message,
      });
      setMessage("");
      fetchChatData();
    } catch (error) {
      console.error("Failed to send message", error);
    }
  };

  useEffect(() => {
    fetchChatData();

    const interval = setInterval(() => {
      fetchChatData();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [selectedFriend]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [filteredChatData]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/5 bg-[#161a23]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white font-bold text-lg">
              {selectedFriend?.fullName?.charAt(0).toUpperCase() || selectedFriend?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#161a23]"></div>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">{selectedFriend?.fullName || selectedFriend?.email}</h3>
            <p className="text-xs text-gray-400">Online</p>
          </div>
        </div>
        <button
          onClick={() => setSelectedFriend(null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredChatData.map((chat) => {
          const isMe = chat.senderId === user._id;
          return (
            <div key={chat._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${
                  isMe
                    ? "bg-[#1d8a8a] text-white rounded-tr-sm"
                    : "bg-[#232936] text-white rounded-tl-sm"
                }`}
              >
                <p className="text-sm leading-relaxed">{chat.message}</p>
                <p className="text-[10px] text-white/50 mt-1 text-right">
                  {chat.createdAt ? new Date(chat.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : chat.timestamp}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#0f1218]">
        <form
          onSubmit={handleMessageSend}
          className="flex items-center gap-2 bg-[#161a23] rounded-xl p-2 border border-white/10"
        >
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-transparent text-white outline-none px-3 text-sm placeholder:text-gray-500"
          />
          <button type="button" className="p-2 text-gray-400 hover:text-white transition-colors">
            <Image size={20} />
          </button>
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-[#1d8a8a] text-white rounded-lg hover:bg-[#156e6e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatting;