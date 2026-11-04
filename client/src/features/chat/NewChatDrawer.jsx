import React, { useState } from "react";
import {
  ArrowLeft,
  Search,
  Users,
  User,
  X,
  MessageSquare,
} from "lucide-react";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http")
    ? url
    : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
};

const NewChatDrawer = ({
  isOpen,
  onClose,
  allUsers = [],
  onSelectContact,
  onOpenNewGroup,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  // Filter out self and match search
  const availableUsers = allUsers.filter(
    (u) =>
      u._id !== user?._id &&
      ((u.fullName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.mobileNumber || "").includes(searchQuery))
  );

  const handleUserClick = async (contact) => {
    try {
      setIsStarting(true);
      const res = await api.post("/chat", { userId: contact._id });
      onSelectContact(res.data.data || contact);
      onClose();
    } catch (err) {
      console.error("Failed to start direct chat", err);
      // Fallback: pass contact directly
      onSelectContact(contact);
      onClose();
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 sm:left-[60px] z-40 w-full sm:w-[420px] bg-[#111b21] border-r border-[#222e35] shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200 text-[#e9edef] select-none">
      {/* Top Header */}
      <div className="h-[108px] bg-[#202c33] flex items-end px-5 pb-4 gap-6 border-b border-[#222e35] shrink-0">
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[19px] font-medium text-[#e9edef]">New chat</h2>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-[#111b21] border-b border-[#222e35]/60 shrink-0">
        <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5 focus-within:ring-1 focus-within:ring-[#00a884] transition-all">
          <Search className="w-4 h-4 text-[#8696a0] shrink-0" />
          <input
            type="text"
            placeholder="Search name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none pl-3 text-[14px] text-[#e9edef] placeholder-[#8696a0]"
            autoFocus
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
      </div>

      {/* Action Options & Contact List */}
      <div className="flex-1 overflow-y-auto whatsapp-scrollbar divide-y divide-[#222e35]/30">
        {/* New Group Option */}
        <div
          onClick={() => {
            onClose();
            onOpenNewGroup();
          }}
          className="flex items-center gap-4 px-4 py-3.5 hover:bg-[#202c33] transition-colors cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center font-bold shadow-sm group-hover:scale-105 transition-transform">
            <Users className="w-5 h-5 text-[#111b21]" />
          </div>
          <div>
            <h4 className="text-[16px] font-medium text-[#e9edef]">New group</h4>
            <p className="text-xs text-[#8696a0]">Create a group with 2+ contacts</p>
          </div>
        </div>

        {/* Section Header */}
        <div className="px-4 py-2.5 bg-[#111b21]">
          <span className="text-[11px] font-semibold text-[#00a884] uppercase tracking-wider">
            Contacts on WhatsApp ({availableUsers.length})
          </span>
        </div>

        {/* Available Contacts */}
        <div className="divide-y divide-[#222e35]/20">
          {availableUsers.map((u) => (
            <div
              key={u._id}
              onClick={() => handleUserClick(u)}
              className="flex items-center gap-3.5 px-4 py-3 hover:bg-[#202c33] cursor-pointer transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-[#202c33] flex items-center justify-center text-[#00a884] font-semibold text-base overflow-hidden border border-[#2a3942] shrink-0">
                {u.profilePic ? (
                  <img
                    src={getMediaUrl(u.profilePic)}
                    alt={u.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  (u.fullName || u.email || "?").charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[15px] font-normal text-[#e9edef] truncate">
                  {u.fullName || u.email}
                </h4>
                <p className="text-xs text-[#8696a0] truncate mt-0.5">
                  {u.about || "Hey there! I am using WhatsApp."}
                </p>
              </div>
            </div>
          ))}

          {availableUsers.length === 0 && (
            <div className="text-center py-12 px-4 text-[#8696a0] text-sm">
              {searchQuery ? "No contacts found matching search" : "No other contacts registered yet"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewChatDrawer;
