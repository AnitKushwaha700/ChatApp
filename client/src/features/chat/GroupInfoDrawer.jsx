import React, { useState } from "react";
import {
  X,
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  MoreVertical,
  LogOut,
  Trash2,
  Edit2,
  Check,
  BellOff,
  Bell,
  Star,
  Image as ImageIcon,
  Lock,
  ChevronRight,
  Camera,
} from "lucide-react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";
import { useAuth } from "../auth/AuthContext";

const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

const GroupInfoDrawer = ({
  isOpen,
  onClose,
  groupChat,
  onUpdateGroup,
  allUsers = [],
}) => {
  const { user } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(groupChat?.chatName || "");
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [groupDesc, setGroupDesc] = useState(groupChat?.groupDescription || "");
  const [memberSearch, setMemberSearch] = useState("");
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null);
  const [activeMenuMemberId, setActiveMenuMemberId] = useState(null);
  const [isMuted, setIsMuted] = useState(
    groupChat?.mutedBy?.includes(user?._id) || false
  );
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen || !groupChat) return null;

  const isAdmin = groupChat.groupAdmins?.some(
    (admin) => (admin._id || admin) === user?._id
  );

  const participants = groupChat.users || [];
  const filteredParticipants = participants.filter((p) =>
    (p.fullName || p.email || "").toLowerCase().includes(memberSearch.toLowerCase())
  );

  // Users available to add (not already in group)
  const availableUsers = allUsers.filter(
    (u) => !participants.some((p) => (p._id || p) === u._id) && u._id !== user?._id
  ).filter((u) =>
    (u.fullName || u.email || "").toLowerCase().includes(addMemberSearch.toLowerCase())
  );

  const handleSaveName = async () => {
    if (!groupName.trim() || groupName === groupChat.chatName) {
      setIsEditingName(false);
      return;
    }
    try {
      const res = await api.put("/chat/group/rename", {
        chatId: groupChat._id,
        chatName: groupName.trim(),
      });
      onUpdateGroup(res.data.data);
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to rename group", err);
    }
  };

  const handleSaveDescription = async () => {
    try {
      const res = await api.put("/chat/group/rename", {
        chatId: groupChat._id,
        groupDescription: groupDesc.trim(),
      });
      onUpdateGroup(res.data.data);
      setIsEditingDesc(false);
    } catch (err) {
      console.error("Failed to update description", err);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserToAdd) return;
    setIsLoading(true);
    try {
      const res = await api.put("/chat/group/add", {
        chatId: groupChat._id,
        userId: selectedUserToAdd._id,
      });
      onUpdateGroup(res.data.data);
      setSelectedUserToAdd(null);
      setShowAddMemberModal(false);
    } catch (err) {
      console.error("Failed to add member", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      const res = await api.put("/chat/group/remove", {
        chatId: groupChat._id,
        userId: memberId,
      });
      onUpdateGroup(res.data.data);
      setActiveMenuMemberId(null);
    } catch (err) {
      console.error("Failed to remove member", err);
    }
  };

  const handleToggleMute = async () => {
    try {
      const res = await api.put(`/chat/mute/${groupChat._id}`);
      setIsMuted(res.data.data.isMuted);
    } catch (err) {
      console.error("Failed to toggle mute", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to exit this group?")) return;
    try {
      await api.put("/chat/group/remove", {
        chatId: groupChat._id,
        userId: user._id,
      });
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Failed to exit group", err);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-[#111b21] text-[#e9edef] shadow-2xl border-l border-[#222e35] flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-[60px] bg-[#202c33] flex items-center px-4 gap-4 border-b border-[#222e35] shrink-0">
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-medium text-[#e9edef]">Group info</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto whatsapp-scrollbar divide-y divide-[#222e35]/60">
        {/* Group Hero (Icon & Title) */}
        <div className="bg-[#111b21] p-6 flex flex-col items-center text-center">
          <div className="relative group w-36 h-36 rounded-full overflow-hidden mb-4 border-2 border-[#202c33] bg-[#202c33] flex items-center justify-center shadow-lg">
            {groupChat.groupIcon ? (
              <img
                src={getMediaUrl(groupChat.groupIcon)}
                alt={groupChat.chatName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Users className="w-16 h-16 text-[#667781]" />
            )}
            {isAdmin && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer text-white">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-[11px] font-medium uppercase tracking-wider">Change</span>
              </div>
            )}
          </div>

          {/* Group Name */}
          <div className="w-full flex items-center justify-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-2 w-full max-w-[280px]">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={35}
                  className="w-full bg-[#202c33] text-[#e9edef] px-3 py-1.5 rounded border-b-2 border-[#00a884] outline-none text-base font-medium"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1.5 rounded-full bg-[#00a884] text-white hover:bg-[#00a884]/90 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-semibold text-[#e9edef] tracking-tight">
                  {groupChat.chatName}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setGroupName(groupChat.chatName);
                      setIsEditingName(true);
                    }}
                    className="p-1 text-[#8696a0] hover:text-[#00a884] transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-[13px] text-[#8696a0] mt-1 font-normal">
            Group · {participants.length} {participants.length === 1 ? "participant" : "participants"}
          </p>
        </div>

        {/* Group Description */}
        <div className="bg-[#111b21] p-4">
          <span className="text-xs text-[#8696a0] uppercase font-medium tracking-wider block mb-1.5">
            Description
          </span>
          {isEditingDesc ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={groupDesc}
                onChange={(e) => setGroupDesc(e.target.value)}
                maxLength={200}
                rows={3}
                className="w-full bg-[#202c33] text-[#e9edef] p-2.5 rounded border border-[#00a884] outline-none text-sm resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsEditingDesc(false)}
                  className="text-xs text-[#8696a0] hover:text-[#e9edef] px-2 py-1 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveDescription}
                  className="text-xs bg-[#00a884] text-white px-3 py-1 rounded font-medium cursor-pointer hover:bg-[#00a884]/90"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => isAdmin && setIsEditingDesc(true)}
              className={`text-sm text-[#d1d7db] leading-relaxed ${
                isAdmin ? "cursor-pointer hover:text-white" : ""
              }`}
            >
              {groupChat.groupDescription || (
                <span className="text-[#8696a0] italic">
                  {isAdmin ? "Add group description..." : "No description provided"}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Settings Shortcuts */}
        <div className="bg-[#111b21] py-2">
          <div
            onClick={handleToggleMute}
            className="flex items-center justify-between px-4 py-3 hover:bg-[#202c33] transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {isMuted ? (
                <BellOff className="w-5 h-5 text-[#8696a0]" />
              ) : (
                <Bell className="w-5 h-5 text-[#8696a0]" />
              )}
              <div>
                <p className="text-sm font-medium text-[#e9edef]">Mute notifications</p>
                <p className="text-xs text-[#8696a0]">{isMuted ? "Muted" : "Off"}</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isMuted}
              onChange={handleToggleMute}
              className="toggle toggle-success toggle-sm cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between px-4 py-3 hover:bg-[#202c33] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <Star className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-sm font-medium text-[#e9edef]">Starred messages</p>
                <p className="text-xs text-[#8696a0]">None</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8696a0]" />
          </div>

          <div className="flex items-center justify-between px-4 py-3 hover:bg-[#202c33] transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <Lock className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-sm font-medium text-[#e9edef]">Encryption</p>
                <p className="text-xs text-[#8696a0]">Messages and calls are end-to-end encrypted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Participants Section */}
        <div className="bg-[#111b21] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#8696a0] uppercase font-medium tracking-wider">
              {participants.length} participants
            </span>
            {participants.length > 5 && (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search participants"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="bg-[#202c33] text-xs text-[#e9edef] pl-7 pr-2 py-1 rounded-full outline-none w-36 focus:w-48 transition-all"
                />
                <Search className="w-3.5 h-3.5 text-[#8696a0] absolute left-2.5 top-1.5" />
              </div>
            )}
          </div>

          {/* Add Member button (if admin) */}
          {isAdmin && (
            <div
              onClick={() => setShowAddMemberModal(true)}
              className="flex items-center gap-3.5 p-2.5 rounded-lg hover:bg-[#202c33] transition-colors cursor-pointer text-[#00a884] mb-1"
            >
              <div className="w-10 h-10 rounded-full bg-[#00a884]/20 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#00a884]" />
              </div>
              <span className="text-sm font-medium">Add participant</span>
            </div>
          )}

          {/* Participant Rows */}
          <div className="space-y-1">
            {filteredParticipants.map((p) => {
              const isMemberAdmin = groupChat.groupAdmins?.some(
                (admin) => (admin._id || admin) === p._id
              );
              const isCurrentUser = p._id === user?._id;

              return (
                <div
                  key={p._id}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[#202c33] transition-colors group relative"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#202c33] flex items-center justify-center font-bold text-sm text-[#00a884] overflow-hidden shrink-0 border border-[#222e35]">
                      {p.profilePic ? (
                        <img
                          src={getMediaUrl(p.profilePic)}
                          alt={p.fullName || p.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (p.fullName || p.email || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#e9edef] truncate">
                          {isCurrentUser ? "You" : p.fullName || p.email}
                        </p>
                      </div>
                      <p className="text-xs text-[#8696a0] truncate">
                        {p.about || "Hey there! I am using WhatsApp."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isMemberAdmin && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/30">
                        Group Admin
                      </span>
                    )}

                    {/* Admin Actions Dropdown */}
                    {isAdmin && !isCurrentUser && (
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenuMemberId(
                              activeMenuMemberId === p._id ? null : p._id
                            )
                          }
                          className="p-1 rounded-full text-[#8696a0] hover:text-[#e9edef] hover:bg-[#2a3942] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuMemberId === p._id && (
                          <div className="absolute right-0 top-6 z-50 w-44 bg-[#233138] rounded-md shadow-xl py-1 border border-[#374248] text-xs">
                            <button
                              onClick={() => handleRemoveMember(p._id)}
                              className="w-full text-left px-4 py-2 hover:bg-[#182229] text-red-400 hover:text-red-300 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove {p.fullName?.split(" ")[0] || "User"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exit / Delete Group */}
        <div className="bg-[#111b21] p-4">
          <button
            onClick={handleLeaveGroup}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors font-medium text-sm cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Exit group</span>
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#202c33] rounded-2xl w-full max-w-md overflow-hidden border border-[#2a3942] shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-[#2a3942] flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#e9edef]">Add participant</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUserToAdd(null);
                }}
                className="text-[#8696a0] hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 border-b border-[#2a3942]">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={addMemberSearch}
                  onChange={(e) => setAddMemberSearch(e.target.value)}
                  className="w-full bg-[#111b21] text-sm text-[#e9edef] pl-9 pr-3 py-2 rounded-lg outline-none border border-[#2a3942] focus:border-[#00a884]"
                  autoFocus
                />
                <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 divide-y divide-[#2a3942]/40 max-h-72">
              {availableUsers.map((u) => (
                <div
                  key={u._id}
                  onClick={() => setSelectedUserToAdd(u)}
                  className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedUserToAdd?._id === u._id
                      ? "bg-[#00a884]/20 border border-[#00a884]/40"
                      : "hover:bg-[#111b21]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#111b21] flex items-center justify-center text-[#00a884] font-semibold text-sm">
                      {u.profilePic ? (
                        <img
                          src={getMediaUrl(u.profilePic)}
                          alt={u.fullName || u.email}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        (u.fullName || u.email || "?").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#e9edef]">{u.fullName || u.email}</p>
                      <p className="text-xs text-[#8696a0]">{u.about || u.email}</p>
                    </div>
                  </div>
                  {selectedUserToAdd?._id === u._id && (
                    <Check className="w-5 h-5 text-[#00a884]" />
                  )}
                </div>
              ))}
              {availableUsers.length === 0 && (
                <div className="text-center py-8 text-xs text-[#8696a0]">
                  No contacts found to add
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#2a3942] flex justify-end gap-2 bg-[#182229]">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedUserToAdd(null);
                }}
                className="px-4 py-2 rounded-lg text-sm text-[#8696a0] hover:text-[#e9edef]"
              >
                Cancel
              </button>
              <button
                disabled={!selectedUserToAdd || isLoading}
                onClick={handleAddMember}
                className="px-5 py-2 rounded-lg text-sm bg-[#00a884] text-white font-medium hover:bg-[#00a884]/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? "Adding..." : "Add participant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupInfoDrawer;
