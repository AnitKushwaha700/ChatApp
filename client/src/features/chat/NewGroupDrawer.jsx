import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Camera,
  Search,
  X,
  Users,
} from "lucide-react";
import api from "../../lib/api";

const NewGroupDrawer = ({
  isOpen,
  allUsers = [],
  onClose,
  onGroupCreated,
}) => {
  const [step, setStep] = useState(1); // 1 = select participants, 2 = group subject & icon
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupIconFile, setGroupIconFile] = useState(null);
  const [groupIconPreview, setGroupIconPreview] = useState(null);
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef(null);

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http")
      ? url
      : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.mobileNumber?.includes(q)
    );
  });

  const toggleSelectUser = (userId) => {
    if (selectedUserIds.includes(userId)) {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
    } else {
      setSelectedUserIds((prev) => [...prev, userId]);
    }
  };

  const handleIconSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setGroupIconFile(file);
    setGroupIconPreview(URL.createObjectURL(file));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUserIds.length < 2) return;
    try {
      setIsCreating(true);
      const formData = new FormData();
      formData.append("name", groupName.trim());
      formData.append("description", groupDescription.trim());
      formData.append("users", JSON.stringify(selectedUserIds));
      if (groupIconFile) {
        formData.append("groupIcon", groupIconFile);
      }

      const res = await api.post("/chat/group", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (onGroupCreated) {
        onGroupCreated(res.data.data);
      }
      onClose();
    } catch (err) {
      console.error("Failed to create group", err);
      alert(err.response?.data?.message || "Failed to create group");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedUsers = allUsers.filter((u) => selectedUserIds.includes(u._id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 sm:left-[60px] z-40 w-full sm:w-[420px] bg-[#111b21] border-r border-[#222e35] shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200 text-[#e9edef]">
      {/* Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-6 px-4 pt-[calc(env(safe-area-inset-top))] shrink-0">
        <button
          type="button"
          onClick={() => {
            if (step === 2) setStep(1);
            else onClose();
          }}
          className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer border-none bg-transparent text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <h3 className="font-semibold text-lg">
          {step === 1 ? "Add group members" : "New group"}
        </h3>
      </div>

      {step === 1 ? (
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Selected Users Chips */}
          {selectedUsers.length > 0 && (
            <div className="p-3 border-b border-base-content/10 flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar">
              {selectedUsers.map((u) => (
                <div
                  key={u._id}
                  className="flex items-center gap-1.5 bg-base-200 px-2.5 py-1 rounded-full text-xs font-medium"
                >
                  <span>{u.fullName || u.email}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(u._id)}
                    className="p-0.5 rounded-full hover:bg-base-300 border-none bg-transparent cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search Box */}
          <div className="p-3 border-b border-base-content/10">
            <div className="relative flex items-center bg-base-200 rounded-lg p-2 border border-base-content/10">
              <Search size={16} className="text-base-content/50 absolute left-3" />
              <input
                type="text"
                placeholder="Type contact name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none pl-8 text-sm text-base-content"
              />
            </div>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredUsers.map((u) => {
              const isSelected = selectedUserIds.includes(u._id);
              return (
                <div
                  key={u._id}
                  onClick={() => toggleSelectUser(u._id)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-base-200/60 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="checkbox checkbox-sm checkbox-primary rounded-md"
                  />
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-primary text-primary-content flex items-center justify-center font-bold text-sm shrink-0">
                    {u.profilePic ? (
                      <img
                        src={getMediaUrl(u.profilePic)}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      u.fullName?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="flex flex-col flex-1 truncate">
                    <span className="font-semibold text-sm text-base-content truncate">
                      {u.fullName || u.email}
                    </span>
                    <span className="text-xs text-base-content/60 truncate">
                      {u.about || u.email}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Floating Next Button */}
          {selectedUserIds.length >= 2 && (
            <div className="absolute bottom-6 right-6 z-10">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-13 h-13 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-xl hover:scale-105 transition-all cursor-pointer border-none"
                title="Next"
              >
                <ArrowRight size={22} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Step 2: Subject, Icon & Description */
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto custom-scrollbar relative">
          {/* Group Icon */}
          <div className="flex justify-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-[#00a884] flex items-center justify-center cursor-pointer group bg-base-200"
            >
              {groupIconPreview ? (
                <img
                  src={groupIconPreview}
                  alt="Group"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-base-content/60 group-hover:text-primary transition-colors">
                  <Camera size={26} />
                  <span className="text-[10px] mt-1 font-medium">Add icon</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                <Camera size={22} />
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleIconSelect}
              accept="image/*"
              className="hidden"
            />
          </div>

          {/* Group Name Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-base-content/70">
              Group Subject
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (e.g. Weekend Trip)"
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-base-200 text-sm text-base-content border border-base-content/10 outline-none focus:border-[#00a884]"
              autoFocus
            />
            <div className="text-right text-[11px] text-base-content/50">
              {100 - groupName.length}
            </div>
          </div>

          {/* Group Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-base-content/70">
              Group Description (optional)
            </label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Add group description..."
              rows={3}
              className="w-full px-4 py-2 rounded-xl bg-base-200 text-sm text-base-content border border-base-content/10 outline-none focus:border-[#00a884] resize-none"
            />
          </div>

          {/* Members count preview */}
          <div className="text-xs text-base-content/60 flex items-center gap-2">
            <Users size={16} />
            <span>
              {selectedUserIds.length + 1} participants (including you)
            </span>
          </div>

          {/* Floating Create Button */}
          <div className="absolute bottom-6 right-6 z-10">
            <button
              type="button"
              disabled={!groupName.trim() || isCreating}
              onClick={handleCreateGroup}
              className="w-13 h-13 rounded-full bg-[#00a884] text-white flex items-center justify-center shadow-xl hover:scale-105 disabled:opacity-40 transition-all cursor-pointer border-none"
              title="Create group"
            >
              <Check size={24} strokeWidth={3} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewGroupDrawer;
