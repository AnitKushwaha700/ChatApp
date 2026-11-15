import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Search,
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Trash2,
  Plus,
  X,
  User,
  Clock,
} from "lucide-react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";

const formatCallTime = (timestamp) => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${date.toLocaleDateString([], { day: "numeric", month: "short" })}, ${timeStr}`;
};

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const CallsDrawer = ({
  isOpen,
  onClose,
  currentUser,
  allUsers = [],
  onStartCall,
}) => {
  const [calls, setCalls] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewCallModalOpen, setIsNewCallModalOpen] = useState(false);
  const [newCallSearch, setNewCallSearch] = useState("");

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/call");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setCalls(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch call logs:", err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchCalls();
    }
  }, [isOpen, fetchCalls]);

  // Listen for real-time new call logs from socket
  useEffect(() => {
    const handleNewCallLog = (newLog) => {
      setCalls((prev) => [newLog, ...prev.filter((c) => c._id !== newLog._id)]);
    };

    socketAPI.on("newCallLog", handleNewCallLog);
    return () => {
      socketAPI.off("newCallLog", handleNewCallLog);
    };
  }, []);

  const handleDeleteCall = async (callId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/call/${callId}`);
      setCalls((prev) => prev.filter((c) => c._id !== callId));
    } catch (err) {
      console.error("Failed to delete call log:", err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear your entire call history?")) return;
    try {
      await api.delete("/call/clear/all");
      setCalls([]);
    } catch (err) {
      console.error("Failed to clear call history:", err);
    }
  };

  // Filter calls by search query
  const filteredCalls = useMemo(() => {
    if (!searchQuery.trim()) return calls;
    const q = searchQuery.toLowerCase();
    return calls.filter((c) => {
      const isCaller = c.caller?._id === currentUser?._id;
      const partner = isCaller ? c.receiver : c.caller;
      const name = partner?.fullName || partner?.email || "";
      return name.toLowerCase().includes(q);
    });
  }, [calls, searchQuery, currentUser?._id]);

  // Filter contacts for New Call picker
  const filteredContacts = useMemo(() => {
    const query = newCallSearch.toLowerCase().trim();
    return allUsers.filter((u) => {
      if (u._id === currentUser?._id) return false;
      if (!query) return true;
      return (
        u.fullName?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    });
  }, [allUsers, newCallSearch, currentUser?._id]);

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http") ? url : `${api.defaults.baseURL || ""}${url}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 sm:left-[60px] z-40 w-full sm:w-[420px] bg-[#111b21] text-[#e9edef] border-r border-[#222e35] shadow-2xl flex flex-col animate-in slide-in-from-left duration-200 select-none">
      {/* Header */}
      <div className="h-[60px] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
            title="Back to Chats"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[#e9edef] font-semibold text-lg">Calls</h2>
        </div>

        <div className="flex items-center gap-2">
          {calls.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="p-2 rounded-full hover:bg-[#374248] text-[#8696a0] hover:text-red-400 transition-colors cursor-pointer"
              title="Clear call history"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsNewCallModalOpen(true)}
            className="p-2 rounded-full hover:bg-[#374248] text-[#00a884] hover:text-[#008f72] transition-colors cursor-pointer"
            title="New Call"
          >
            <Plus size={22} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2.5 bg-[#111b21] border-b border-[#222e35]">
        <div className="relative flex items-center bg-[#202c33] rounded-lg px-3 py-1.5">
          <Search size={16} className="text-[#8696a0] mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search call history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-[#8696a0] hover:text-[#e9edef]"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Call History List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && calls.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-[#8696a0]">
            Loading call history...
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center px-6 text-[#8696a0]">
            <div className="w-16 h-16 rounded-full bg-[#202c33] flex items-center justify-center mb-3 text-[#00a884]">
              <Phone size={28} />
            </div>
            <p className="text-[#e9edef] font-medium text-base mb-1">
              {searchQuery ? "No matching calls found" : "No call history yet"}
            </p>
            <p className="text-xs leading-relaxed max-w-xs">
              {searchQuery
                ? "Try searching for a different contact name"
                : "To start an audio or video call with friends, tap the + icon above or start a call from any chat"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#222e35]/50">
            {filteredCalls.map((call) => {
              const isCaller = call.caller?._id === currentUser?._id;
              const partner = isCaller ? call.receiver : call.caller;
              if (!partner) return null;

              const isMissed = call.status === "missed";
              const isRejected = call.status === "rejected";
              const durationLabel = formatDuration(call.duration);

              return (
                <div
                  key={call._id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-[#202c33]/70 transition-colors group cursor-pointer"
                  onClick={() => onStartCall(partner, call.callType === "video")}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Partner Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-[#2a3942] flex items-center justify-center text-lg font-semibold text-[#e9edef]">
                        {partner.profilePic ? (
                          <img
                            src={getMediaUrl(partner.profilePic)}
                            alt={partner.fullName || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(partner.fullName || partner.email || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      {partner.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#111b21] rounded-full" />
                      )}
                    </div>

                    {/* Partner Info & Call Direction */}
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-medium truncate ${
                          isMissed || isRejected ? "text-red-400" : "text-[#e9edef]"
                        }`}
                      >
                        {partner.fullName || partner.email}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-xs text-[#8696a0]">
                        {/* Call Direction Icon */}
                        {isCaller ? (
                          <PhoneOutgoing size={13} className="text-[#00a884] shrink-0" />
                        ) : isMissed || isRejected ? (
                          <PhoneMissed size={13} className="text-red-400 shrink-0" />
                        ) : (
                          <PhoneIncoming size={13} className="text-[#00a884] shrink-0" />
                        )}

                        <span>{formatCallTime(call.createdAt || call.startedAt)}</span>

                        {durationLabel && (
                          <>
                            <span>•</span>
                            <span className="font-mono text-[#aebac1]">{durationLabel}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions: Audio Call, Video Call, Delete Log */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(partner, false);
                      }}
                      className="p-2 rounded-full hover:bg-[#2a3942] text-[#00a884] transition-colors cursor-pointer"
                      title="Audio Call"
                    >
                      <Phone size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(partner, true);
                      }}
                      className="p-2 rounded-full hover:bg-[#2a3942] text-[#00a884] transition-colors cursor-pointer"
                      title="Video Call"
                    >
                      <Video size={17} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCall(call._id, e)}
                      className="p-2 rounded-full hover:bg-[#2a3942] text-[#8696a0] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Remove from history"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Call Modal: Select Contact to Call */}
      {isNewCallModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-[#202c33] w-full max-w-md rounded-2xl shadow-2xl border border-[#2a3942] flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-[#2a3942] flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#e9edef]">Start New Call</h3>
              <button
                type="button"
                onClick={() => setIsNewCallModalOpen(false)}
                className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Search */}
            <div className="p-3 border-b border-[#2a3942]">
              <div className="relative flex items-center bg-[#111b21] rounded-lg px-3 py-1.5">
                <Search size={15} className="text-[#8696a0] mr-2 shrink-0" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={newCallSearch}
                  onChange={(e) => setNewCallSearch(e.target.value)}
                  className="w-full bg-transparent text-sm text-[#e9edef] placeholder-[#8696a0] outline-none"
                />
              </div>
            </div>

            {/* Contacts Picker */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#2a3942]/50 custom-scrollbar p-2">
              {filteredContacts.length === 0 ? (
                <div className="text-center text-sm text-[#8696a0] py-8">
                  No contacts found
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className="p-2.5 rounded-xl hover:bg-[#2a3942] flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-sm font-semibold text-[#e9edef] overflow-hidden shrink-0">
                        {contact.profilePic ? (
                          <img
                            src={getMediaUrl(contact.profilePic)}
                            alt={contact.fullName || "User"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(contact.fullName || contact.email || "?").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#e9edef] truncate">
                          {contact.fullName || contact.email}
                        </p>
                        <p className="text-xs text-[#8696a0] truncate">
                          {contact.about || "Available"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCallModalOpen(false);
                          onStartCall(contact, false);
                        }}
                        className="p-2 rounded-full hover:bg-[#111b21] text-[#00a884] transition-colors"
                        title="Voice Call"
                      >
                        <Phone size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewCallModalOpen(false);
                          onStartCall(contact, true);
                        }}
                        className="p-2 rounded-full hover:bg-[#111b21] text-[#00a884] transition-colors"
                        title="Video Call"
                      >
                        <Video size={17} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CallsDrawer;
