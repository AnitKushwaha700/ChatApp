import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  Plus,
  Camera,
  Edit3,
  Image as ImageIcon,
  X,
  Send,
  ChevronLeft,
  ChevronRight,
  Type,
} from "lucide-react";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";

const BG_COLORS = [
  "#263238", // Slate / Charcoal (Default in screenshot)
  "#00a884", // WhatsApp Teal Green
  "#0288d1", // Vibrant Blue
  "#7c4dff", // Purple
  "#ec4899", // Pink / Magenta
  "#ef4444", // Coral Red
  "#f59e0b", // Amber Orange
  "#075e54", // WhatsApp Deep Teal
  "#1f2937", // Midnight Slate
];

const FONT_STYLES = [
  { name: "Sans", className: "font-sans font-medium" },
  { name: "Serif", className: "font-serif font-normal" },
  { name: "Casual", className: "font-serif italic font-normal" },
  { name: "Monospace", className: "font-mono font-normal tracking-tight" },
  { name: "Impact", className: "font-black tracking-wide" },
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
  const [fontIndex, setFontIndex] = useState(0);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [mediaCaption, setMediaCaption] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);
  const colorListRef = useRef(null);

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
    <div className="fixed inset-y-0 left-0 md:left-[60px] z-40 w-full md:w-[380px] lg:w-[420px] pb-20 md:pb-0 bg-[#111b21] border-r border-[#222e35] shadow-2xl flex flex-col h-full animate-in slide-in-from-left duration-200 text-[#e9edef]">
      {/* Top Header */}
      <div className="h-[calc(60px+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-[#202c33] px-4 flex items-center justify-between border-b border-[#222e35] shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
            title="Back to Chats"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-[#e9edef] font-semibold text-lg">
            <span className="md:hidden">Updates</span>
            <span className="hidden md:inline">Status</span>
          </h2>
        </div>

        <div className="hidden md:flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsCreatingText(true)}
            className="p-2 rounded-full hover:bg-[#374248] text-[#aebac1] hover:text-[#e9edef] transition-colors cursor-pointer"
            title="New text status"
          >
            <Edit3 size={19} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full hover:bg-[#374248] text-[#00a884] hover:text-[#00c897] transition-colors cursor-pointer"
            title="Add photo or video"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
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

          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,video/*"
            className="hidden"
          />
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

      {/* Mobile Floating Action Buttons (Pencil & Camera) */}
      <div className="md:hidden fixed bottom-20 right-5 flex flex-col items-center gap-3 z-40">
        <button
          type="button"
          onClick={() => setIsCreatingText(true)}
          className="w-11 h-11 rounded-full bg-[#202c33] text-[#e9edef] flex items-center justify-center shadow-xl border border-[#2a3942] active:scale-95 transition-transform cursor-pointer"
          title="Text status"
        >
          <Edit3 size={18} />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-14 h-14 rounded-2xl bg-[#00a884] hover:bg-[#008f72] text-white flex items-center justify-center shadow-2xl active:scale-95 transition-transform cursor-pointer border-none"
          title="Camera status"
        >
          <Camera size={24} />
        </button>
      </div>

      {/* Create Text Status Full-Screen Overlay (matches media_1794640762822_19ab4785.png) */}
      {isCreatingText &&
        createPortal(
          <div
            style={{ backgroundColor: selectedBg }}
            className="fixed inset-0 z-100 flex flex-col justify-between p-6 sm:p-8 select-none transition-colors duration-300"
          >
            {/* Top Bar: Close button on left, color picker & font switch on right */}
            <div className="flex items-center justify-between text-white w-full max-w-7xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  setIsCreatingText(false);
                  setTextContent("");
                }}
                className="p-2.5 rounded-full hover:bg-black/25 text-white/90 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                title="Discard status"
              >
                <X size={26} />
              </button>

              {/* Color Swatches and Font controls */}
              <div className="flex items-center gap-1.5 sm:gap-2 bg-black/25 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = BG_COLORS.indexOf(selectedBg);
                    const prevIndex =
                      currentIndex <= 0 ? BG_COLORS.length - 1 : currentIndex - 1;
                    setSelectedBg(BG_COLORS[prevIndex]);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Previous color"
                >
                  <ChevronLeft size={16} />
                </button>

                <div
                  ref={colorListRef}
                  className="flex items-center gap-2 overflow-x-auto max-w-[240px] sm:max-w-[340px] py-1 custom-scrollbar px-1"
                >
                  {BG_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      style={{ backgroundColor: c }}
                      onClick={() => setSelectedBg(c)}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 cursor-pointer transition-all shrink-0 ${
                        selectedBg === c
                          ? "scale-115 border-white ring-2 ring-white/60 shadow-lg"
                          : "border-white/30 hover:scale-105"
                      }`}
                      title={c}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = BG_COLORS.indexOf(selectedBg);
                    const nextIndex =
                      currentIndex >= BG_COLORS.length - 1 ? 0 : currentIndex + 1;
                    setSelectedBg(BG_COLORS[nextIndex]);
                  }}
                  className="p-1 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors cursor-pointer"
                  title="Next color"
                >
                  <ChevronRight size={16} />
                </button>

                <div className="h-4 w-px bg-white/20 mx-1" />

                {/* Font Toggle button (T icon circle from screenshot) */}
                <button
                  type="button"
                  onClick={() =>
                    setFontIndex((prev) => (prev + 1) % FONT_STYLES.length)
                  }
                  className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center font-bold text-xs cursor-pointer transition-all border border-white/20"
                  title={`Font: ${FONT_STYLES[fontIndex].name} (Click to switch)`}
                >
                  <Type size={15} />
                </button>
              </div>
            </div>

            {/* Middle: Centered Full-Screen Textarea */}
            <div className="flex-1 flex items-center justify-center w-full max-w-4xl mx-auto px-4 my-auto">
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Type a status..."
                rows={4}
                maxLength={700}
                className={`w-full bg-transparent text-white text-3xl sm:text-5xl md:text-6xl text-center placeholder-white/50 outline-none resize-none leading-relaxed transition-all ${FONT_STYLES[fontIndex].className}`}
                autoFocus
              />
            </div>

            {/* Bottom Right Floating Send Button */}
            <div className="w-full max-w-7xl mx-auto flex justify-end">
              <button
                type="button"
                disabled={!textContent.trim() || isSubmitting}
                onClick={handleCreateTextStatus}
                className="w-14 h-14 rounded-full bg-[#00a884] hover:bg-[#00c897] text-white flex items-center justify-center disabled:opacity-40 disabled:hover:scale-100 shadow-2xl cursor-pointer border-none hover:scale-105 active:scale-95 transition-all"
                title="Send status"
              >
                <Send size={24} className="translate-x-0.5 -translate-y-0.5" />
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* Media Upload Preview Full-Screen Overlay */}
      {mediaPreview &&
        createPortal(
          <div className="fixed inset-0 z-100 bg-[#0c1317] flex flex-col justify-between p-4 sm:p-6 select-none animate-in fade-in duration-150">
            {/* Top Bar */}
            <div className="flex items-center justify-between text-white w-full max-w-5xl mx-auto">
              <button
                type="button"
                onClick={() => {
                  setMediaFile(null);
                  setMediaPreview(null);
                  setMediaCaption("");
                }}
                className="p-2.5 rounded-full hover:bg-white/10 text-white cursor-pointer border-none bg-transparent transition-colors"
                title="Discard"
              >
                <X size={24} />
              </button>
              <span className="text-sm font-semibold tracking-wide text-[#e9edef]">
                Preview Status
              </span>
              <div className="w-10" />
            </div>

            {/* Center: Image / Video Preview */}
            <div className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden max-w-5xl mx-auto w-full">
              {mediaFile?.type.startsWith("video/") ? (
                <video
                  src={mediaPreview}
                  controls
                  autoPlay
                  className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/5"
                />
              ) : (
                <img
                  src={mediaPreview}
                  alt="Preview"
                  className="max-h-[72vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/5"
                />
              )}
            </div>

            {/* Bottom Caption Bar */}
            <div className="flex items-center gap-3 w-full max-w-2xl mx-auto pb-2">
              <input
                type="text"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                placeholder="Add a caption..."
                className="flex-1 bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] text-sm sm:text-base px-5 py-3 rounded-full outline-none border border-[#2a3942] focus:border-[#00a884] shadow-lg backdrop-blur-md transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateMediaStatus();
                  }
                }}
              />
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreateMediaStatus}
                className="w-12 h-12 bg-[#00a884] hover:bg-[#00c897] text-white rounded-full flex items-center justify-center disabled:opacity-40 shadow-xl cursor-pointer border-none hover:scale-105 active:scale-95 transition-all shrink-0"
                title="Send status"
              >
                <Send size={20} className="translate-x-0.5 -translate-y-0.5" />
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default StatusDrawer;
