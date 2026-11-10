import React, { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Send, Eye } from "lucide-react";
import api from "../../lib/api";

const StatusViewer = ({ storyGroup, onClose, currentUserId, onReplyToStatus }) => {
  const statuses = storyGroup?.statuses || [];
  const author = storyGroup?.user;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");
  const [showViewersModal, setShowViewersModal] = useState(false);

  const DURATION_MS = 5000;
  const currentStatus = statuses[currentIndex];

  const getMediaUrl = (url) => {
    if (!url) return "";
    return url.startsWith("http")
      ? url
      : `${import.meta.env.VITE_API_URL || "http://localhost:4500"}${url}`;
  };

  // Mark status as viewed
  useEffect(() => {
    if (!currentStatus || !currentUserId) return;
    const isMine = author?._id === currentUserId;
    if (!isMine) {
      api.put(`/status/${currentStatus._id}/view`).catch(console.error);
    }
  }, [currentStatus, author?._id, currentUserId]);

  // Story progress timer
  useEffect(() => {
    setProgress(0);
    if (!currentStatus || isPaused) return;

    const intervalTime = 50;
    const step = (intervalTime / DURATION_MS) * 100;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (currentIndex < statuses.length - 1) {
            setCurrentIndex((idx) => idx + 1);
          } else {
            onClose();
          }
          return 0;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, currentStatus, statuses.length, onClose]);

  const handleNext = () => {
    if (currentIndex < statuses.length - 1) {
      setCurrentIndex((i) => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setProgress(0);
    }
  };

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!replyText.trim() || !author?._id) return;
    try {
      if (onReplyToStatus) {
        onReplyToStatus(author, `Replying to status: ${replyText}`);
      }
      setReplyText("");
      onClose();
    } catch (err) {
      console.error("Failed to reply to status", err);
    }
  };

  if (!currentStatus) return null;

  const isMine = author?._id === currentUserId;

  return (
    <div className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center select-none backdrop-blur-md animate-in fade-in duration-200">
      {/* Container simulating phone screen or web modal */}
      <div
        className="relative w-full max-w-md h-full sm:h-[90dvh] sm:rounded-2xl overflow-hidden flex flex-col justify-between shadow-2xl bg-black"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Header & Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 p-4 bg-linear-to-b from-black/80 via-black/40 to-transparent">
          {/* Segmented Progress Bars */}
          <div className="flex items-center gap-1.5 w-full mb-3">
            {statuses.map((s, idx) => {
              let width = "0%";
              if (idx < currentIndex) width = "100%";
              else if (idx === currentIndex) width = `${progress}%`;

              return (
                <div
                  key={s._id}
                  className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
                >
                  <div
                    style={{ width }}
                    className="h-full bg-white transition-all duration-75"
                  />
                </div>
              );
            })}
          </div>

          {/* Author info & Close */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 shrink-0">
                {author?.profilePic ? (
                  <img
                    src={getMediaUrl(author.profilePic)}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#00a884] text-white font-bold flex items-center justify-center">
                    {author?.fullName?.charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight">
                  {isMine ? "My Status" : author?.fullName || author?.email}
                </span>
                <span className="text-[11px] text-white/70">
                  {currentStatus.createdAt
                    ? new Date(currentStatus.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Just now"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Story Body */}
        <div className="flex-1 w-full h-full flex items-center justify-center relative">
          {currentStatus.mediaType === "text" ? (
            <div
              style={{ backgroundColor: currentStatus.backgroundColor || "#075E54" }}
              className="w-full h-full flex items-center justify-center p-8 text-center text-white"
            >
              <p className="text-2xl sm:text-3xl font-medium leading-relaxed font-sans">
                {currentStatus.caption}
              </p>
            </div>
          ) : currentStatus.mediaType === "video" ? (
            <video
              src={getMediaUrl(currentStatus.mediaUrl)}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
          ) : (
            <img
              src={getMediaUrl(currentStatus.mediaUrl)}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}

          {/* Left / Right click zones */}
          <div
            onClick={handlePrev}
            className="absolute top-20 bottom-24 left-0 w-1/3 cursor-pointer z-10"
          />
          <div
            onClick={handleNext}
            className="absolute top-20 bottom-24 right-0 w-2/3 cursor-pointer z-10"
          />
        </div>

        {/* Bottom Caption & Reply Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-linear-to-t from-black/90 via-black/50 to-transparent flex flex-col gap-2">
          {currentStatus.caption && currentStatus.mediaType !== "text" && (
            <p className="text-white text-center text-sm font-medium px-4 py-1.5 drop-shadow-md">
              {currentStatus.caption}
            </p>
          )}

          {isMine ? (
            <button
              type="button"
              onClick={() => setShowViewersModal(true)}
              className="flex items-center justify-center gap-2 text-white/90 text-xs py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl transition-colors cursor-pointer border-none"
            >
              <Eye size={16} />
              <span>{currentStatus.viewers?.length || 0} views</span>
            </button>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Reply to status..."
                className="flex-1 bg-white/20 text-white placeholder-white/60 text-sm px-4 py-2.5 rounded-full outline-none border border-white/20 backdrop-blur-md focus:border-white"
              />
              <button
                type="submit"
                disabled={!replyText.trim()}
                className="p-2.5 bg-[#00a884] text-white rounded-full disabled:opacity-40 hover:brightness-110 transition-all cursor-pointer border-none"
              >
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Viewers Modal */}
      {showViewersModal && (
        <div className="fixed inset-0 z-110 bg-black/60 flex items-center justify-center px-4 backdrop-blur-sm">
          <div className="bg-base-100 p-5 rounded-2xl w-full max-w-sm max-h-[70vh] flex flex-col gap-3 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-2">
              <h4 className="font-bold text-base flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                <span>Viewed by ({currentStatus.viewers?.length || 0})</span>
              </h4>
              <button
                onClick={() => setShowViewersModal(false)}
                className="btn btn-ghost btn-circle btn-xs"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {currentStatus.viewers?.map((v, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-primary text-primary-content flex items-center justify-center font-bold text-xs">
                    {v.user?.profilePic ? (
                      <img src={getMediaUrl(v.user.profilePic)} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      v.user?.fullName?.charAt(0) || "U"
                    )}
                  </div>
                  <div className="flex flex-col text-xs">
                    <span className="font-semibold">{v.user?.fullName || "User"}</span>
                    <span className="opacity-60 text-[10px]">
                      {new Date(v.viewedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {(!currentStatus.viewers || currentStatus.viewers.length === 0) && (
                <p className="text-xs opacity-60 text-center py-4">No views yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusViewer;
