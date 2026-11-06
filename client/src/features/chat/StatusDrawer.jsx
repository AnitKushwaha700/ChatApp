import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  Plus,
  Camera,
  Edit3,
  Image as ImageIcon,
  X,
  Send,
} from "lucide-react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";

const BG_COLORS = [
  "#075E54",
  "#128C7E",
  "#25D366",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#F59E0B",
  "#1F2937",
];

const StatusDrawer = ({
  isOpen,
  user,
  onClose,
  onSelectStory,
}) => {
  const [statusesData, setStatusesData] = useState({
    myStatus: [],
    recentUpdates: [],
    viewedUpdates: [],
  });

  const [isCreatingText, setIsCreatingText] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0]);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http")
      ? url
      : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
  };

  const fetchStatuses = async () => {
    try {
      const res = await api.get("/status");
      setStatusesData(res.data.data);
    } catch (err) {
      console.error("Failed to fetch statuses", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }

    const handleNewStatus = () => {
      if (isOpen) fetchStatuses();
    };
    socketAPI.on("newStatus", handleNewStatus);

    return () => {
      socketAPI.off("newStatus", handleNewStatus);
    };
  }, [isOpen]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleCreateMediaStatus = async () => {
    if (!mediaFile) return;
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("media", mediaFile);
      formData.append("caption", mediaCaption);
      formData.append(
        "mediaType",
        mediaFile.type.startsWith("video/") ? "video" : "image"
      );

      await api.post("/status", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setMediaFile(null);
      setMediaPreview(null);
      setMediaCaption("");
      fetchStatuses();
    } catch (err) {
      console.error("Failed to post status", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTextStatus = async () => {
    if (!textContent.trim()) return;
    try {
      setIsSubmitting(true);
      await api.post("/status", {
        caption: textContent.trim(),
        mediaType: "text",
        backgroundColor: selectedBg,
      });

      setTextContent("");
      setIsCreatingText(false);
      fetchStatuses();
    } catch (err) {
      console.error("Failed to post text status", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasMyStatus = statusesData.myStatus && statusesData.myStatus.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 sm:left-[60px] z-40 w-full sm:w-[420px] bg-[#111b21] border-r border-[#222e35] shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200 text-[#e9edef]">
      {/* Top Header */}
      <div className="h-16 bg-[#008069] dark:bg-[#202c33] text-white flex items-center gap-6 px-4 pt-[calc(env(safe-area-inset-top))] shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="p-1 hover:bg-black/10 rounded-full transition-colors cursor-pointer border-none bg-transparent text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <h3 className="font-semibold text-lg">Status</h3>
      </div>

      {/* Body List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* My Status Card */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-base-200/60 transition-colors">
          <div
            onClick={() => {
              if (hasMyStatus) {
                onSelectStory({ user, statuses: statusesData.myStatus });
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="flex items-center gap-3 cursor-pointer flex-1"
          >
            <div className="relative shrink-0">
              <div
                className={`w-12 h-12 rounded-full overflow-hidden p-0.5 ${
                  hasMyStatus
                    ? "border-2 border-[#00a884]"
                    : "border border-base-content/10"
                }`}
              >
                <div className="w-full h-full rounded-full overflow-hidden">
                  {user?.profilePic ? (
                    <img
                      src={getMediaUrl(user.profilePic)}
                      alt="avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#00a884] text-white font-bold flex items-center justify-center">
                      {user?.fullName?.charAt(0) || "U"}
                    </div>
                  )}
                </div>
              </div>
              {!hasMyStatus && (
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xs font-bold border-2 border-base-100">
                  <Plus size={10} strokeWidth={4} />
                </div>
              )}
            </div>

            <div className="flex flex-col">
              <span className="font-semibold text-sm text-base-content">
                My Status
              </span>
              <span className="text-xs text-base-content/60">
                {hasMyStatus
                  ? `${statusesData.myStatus.length} update${statusesData.myStatus.length > 1 ? "s" : ""}`
                  : "Tap to add status update"}
              </span>
            </div>
          </div>

          {/* Action buttons to create status */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none bg-transparent"
              title="Add photo or video"
            >
              <Camera size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingText(true)}
              className="p-2 rounded-full hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none bg-transparent"
              title="Add text status"
            >
              <Edit3 size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>
        </div>

        {/* Recent Updates */}
        {statusesData.recentUpdates.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#00a884] px-2 py-1">
              Recent updates
            </h4>
            {statusesData.recentUpdates.map((group) => (
              <div
                key={group.user._id}
                onClick={() => onSelectStory(group)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-base-200/60 cursor-pointer transition-colors"
              >
                <div className="w-12 h-12 rounded-full border-2 border-[#00a884] p-0.5 shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {group.user?.profilePic ? (
                      <img
                        src={getMediaUrl(group.user.profilePic)}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#00a884] text-white font-bold flex items-center justify-center">
                        {group.user?.fullName?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="font-semibold text-sm text-base-content truncate">
                    {group.user?.fullName || group.user?.email}
                  </span>
                  <span className="text-xs text-base-content/60">
                    {new Date(group.statuses[0]?.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Viewed Updates */}
        {statusesData.viewedUpdates.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-base-content/50 px-2 py-1">
              Viewed updates
            </h4>
            {statusesData.viewedUpdates.map((group) => (
              <div
                key={group.user._id}
                onClick={() => onSelectStory(group)}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-base-200/60 cursor-pointer transition-colors opacity-80"
              >
                <div className="w-12 h-12 rounded-full border-2 border-base-content/20 p-0.5 shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {group.user?.profilePic ? (
                      <img
                        src={getMediaUrl(group.user.profilePic)}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-base-300 text-base-content font-bold flex items-center justify-center">
                        {group.user?.fullName?.charAt(0) || "U"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-col flex-1 truncate">
                  <span className="font-semibold text-sm text-base-content truncate">
                    {group.user?.fullName || group.user?.email}
                  </span>
                  <span className="text-xs text-base-content/60">
                    {new Date(group.statuses[0]?.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {statusesData.recentUpdates.length === 0 &&
          statusesData.viewedUpdates.length === 0 && (
            <div className="text-center py-12 px-4 text-xs text-base-content/50">
              No recent updates from your contacts.
            </div>
          )}
      </div>

      {/* Create Text Status Modal */}
      {isCreatingText && (
        <div
          style={{ backgroundColor: selectedBg }}
          className="fixed inset-0 z-110 flex flex-col justify-between p-6 animate-in fade-in"
        >
          <div className="flex items-center justify-between text-white">
            <button
              onClick={() => setIsCreatingText(false)}
              className="p-2 rounded-full hover:bg-black/20 text-white cursor-pointer border-none bg-transparent"
            >
              <X size={22} />
            </button>
            {/* Color circles */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  style={{ backgroundColor: c }}
                  onClick={() => setSelectedBg(c)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                    selectedBg === c ? "scale-125 border-white shadow-md" : "border-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            placeholder="Type a status..."
            rows={5}
            className="w-full bg-transparent text-white text-2xl sm:text-3xl text-center placeholder-white/50 outline-none resize-none font-sans font-medium"
            autoFocus
          />

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!textContent.trim() || isSubmitting}
              onClick={handleCreateTextStatus}
              className="w-12 h-12 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-40 shadow-lg cursor-pointer border-none hover:scale-105 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Media Upload Preview Modal */}
      {mediaPreview && (
        <div className="fixed inset-0 z-110 bg-black/95 flex flex-col justify-between p-4 animate-in fade-in">
          <div className="flex items-center justify-between text-white">
            <button
              onClick={() => {
                setMediaFile(null);
                setMediaPreview(null);
              }}
              className="p-2 rounded-full hover:bg-white/20 text-white cursor-pointer border-none bg-transparent"
            >
              <X size={22} />
            </button>
            <span className="text-sm font-semibold">Preview Status</span>
            <div className="w-8" />
          </div>

          <div className="flex-1 flex items-center justify-center p-2 overflow-hidden">
            {mediaFile?.type.startsWith("video/") ? (
              <video
                src={mediaPreview}
                controls
                autoPlay
                className="max-h-[65vh] max-w-full rounded-xl object-contain"
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="max-h-[65vh] max-w-full rounded-xl object-contain"
              />
            )}
          </div>

          <div className="flex items-center gap-2 max-w-md mx-auto w-full pb-2">
            <input
              type="text"
              value={mediaCaption}
              onChange={(e) => setMediaCaption(e.target.value)}
              placeholder="Add a caption..."
              className="flex-1 bg-white/20 text-white placeholder-white/60 text-sm px-4 py-2.5 rounded-full outline-none border border-white/20 backdrop-blur-md"
            />
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateMediaStatus}
              className="p-3 bg-[#00a884] text-white rounded-full disabled:opacity-40 shadow-lg cursor-pointer border-none hover:scale-105 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusDrawer;
