import { useState, useEffect, useRef } from "react";
import {
  Check,
  CheckCheck,
  Reply,
  Star,
  Forward,
  Pencil,
  Trash2,
  SmilePlus,
  CheckSquare,
  FileText,
} from "lucide-react";
import { getMediaUrl, formatTime, getTickState, isEmojiOnly } from "../../lib/helpers";

const QUICK_REACTIONS = ["❤️", "👍", "👎", "😂", "😮", "😢", "🙏"];

const SenderName = ({ msg }) => {
  const name =
    (typeof msg.senderId === "object" && msg.senderId?.fullName) || "Unknown";
  const colors = [
    "text-pink-500",
    "text-purple-500",
    "text-indigo-500",
    "text-teal-500",
    "text-orange-500",
    "text-rose-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return <span className={`text-xs font-semibold ${colors[idx]} mb-0.5 block`}>{name}</span>;
};

const ReplyPreview = ({ reply, currentUserId }) => {
  if (!reply) return null;
  const replySender =
    typeof reply.senderId === "object"
      ? reply.senderId?.fullName
      : String(reply.senderId) === String(currentUserId)
        ? "You"
        : "Message";
  return (
    <div className="border-l-4 border-primary/70 bg-base-100/40 rounded-r-lg px-2 py-1 mb-1.5 max-w-64">
      <p className="text-[11px] font-semibold text-primary">
        {String(reply.senderId) === String(currentUserId) ||
        (typeof reply.senderId === "object" &&
          String(reply.senderId?._id) === String(currentUserId))
          ? "You"
          : replySender}
      </p>
      <p className="text-xs opacity-75 truncate">
        {reply.isDeletedForEveryone
          ? "🚫 This message was deleted"
          : reply.messageType === "image"
            ? "📷 Photo"
            : reply.messageType === "video"
              ? "🎥 Video"
              : reply.messageType === "audio"
                ? "🎤 Voice message"
                : reply.message}
      </p>
    </div>
  );
};

const MessageBubble = ({
  msg,
  isMe,
  chatType,
  currentUserId,
  peerId,
  selectionMode,
  isSelected,
  onReply,
  onReact,
  onStar,
  onForward,
  onEdit,
  onDelete,
  onSelect,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactBarOpen, setReactBarOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        setReactBarOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (msg.messageType === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="bg-base-200/90 backdrop-blur-sm px-3 py-1 rounded-full text-[11px] text-base-content/75 shadow-sm border border-base-content/10 text-center max-w-[85%]">
          {msg.message}
        </span>
      </div>
    );
  }

  const emojiOnly = msg.messageType === "text" && isEmojiOnly(msg.message);
  const isMediaOnly =
    (msg.messageType === "image" || msg.messageType === "video") &&
    (!msg.message || msg.message === "Sent an attachment");
  const isStarred = msg.starredBy?.some((id) => String(id) === String(currentUserId));
  const myReaction = msg.reactions?.find(
    (r) => String((r.user?._id || r.user)) === String(currentUserId),
  );
  const tick = getTickState(msg, currentUserId, peerId);

  const renderContent = () => {
    if (msg.messageType === "image" && msg.mediaUrl) {
      return (
        <div className="relative">
          <img
            src={getMediaUrl(msg.mediaUrl)}
            alt="attachment"
            className="max-w-60 sm:max-w-72 h-auto rounded-lg object-cover"
          />
          {msg.message && msg.message !== "Sent an attachment" && (
            <p className="text-sm mt-2 px-1 whitespace-pre-wrap">{msg.message}</p>
          )}
        </div>
      );
    }
    if (msg.messageType === "audio" && msg.mediaUrl) {
      return (
        <audio controls src={getMediaUrl(msg.mediaUrl)} className="w-56 h-10 outline-none rounded-full" />
      );
    }
    if (msg.messageType === "video" && msg.mediaUrl) {
      return (
        <video controls src={getMediaUrl(msg.mediaUrl)} className="max-w-60 sm:max-w-72 rounded-lg object-cover" />
      );
    }
    if (msg.messageType === "document" && msg.mediaUrl) {
      return (
        <a
          href={getMediaUrl(msg.mediaUrl)}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-sm bg-base-100/20 hover:bg-base-100/30 p-3 rounded-xl transition-colors border border-base-content/10"
        >
          <div className="p-2 bg-base-100/50 rounded-lg">
            <FileText size={22} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium underline truncate">
              {msg.mediaMeta?.name || "Document"}
            </span>
            <span className="text-xs opacity-70">Tap to open</span>
          </div>
        </a>
      );
    }
    if (emojiOnly) {
      return <div className="text-5xl leading-none">{msg.message}</div>;
    }
    return <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-break-word">{msg.message}</p>;
  };

  const actionBtn =
    "flex items-center gap-3 w-full px-3 py-2 text-sm hover:bg-base-200 transition-colors text-left bg-transparent border-0 cursor-pointer";

  return (
    <div
      className={`chat ${isMe ? "chat-sender" : "chat-receiver"} group relative ${
        selectionMode ? "cursor-pointer" : ""
      }`}
      onClick={() => selectionMode && onSelect(msg._id)}
      onDoubleClick={() => !selectionMode && onReply(msg)}
    >
      {chatType === "group" && !isMe && (
        <div className="chat-avatar avatar">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-base-content/10">
            {typeof msg.senderId === "object" && msg.senderId?.profilePic ? (
              <img
                src={getMediaUrl(msg.senderId.profilePic)}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary text-primary-content flex items-center justify-center text-sm font-bold">
                {(typeof msg.senderId === "object" && msg.senderId?.fullName?.charAt(0)) || "?"}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`chat-bubble relative shadow-sm ${
          isMediaOnly ? "p-1.5!" : ""
        } ${isMe ? "bg-[#dcf8c6] text-black" : "bg-white text-black"} ${
          emojiOnly ? "bg-transparent! shadow-none! p-0" : ""
        } ${isSelected ? "ring-2 ring-primary ring-offset-1" : ""}`}
      >
        {selectionMode && (
          <div
            className={`absolute -left-2 -top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center z-10 ${
              isSelected ? "bg-primary border-primary text-white" : "bg-white border-black/30"
            }`}
          >
            {isSelected && <Check size={12} strokeWidth={3} />}
          </div>
        )}

        {chatType === "group" && !isMe && !emojiOnly && <SenderName msg={msg} />}
        {msg.forwardedFrom && (
          <p className="text-[11px] italic opacity-60 mb-1 flex items-center gap-1">
            <Forward size={11} /> Forwarded
          </p>
        )}
        <ReplyPreview reply={msg.replyTo} currentUserId={currentUserId} />
        {renderContent()}

        {/* Reactions */}
        {msg.reactions?.length > 0 && (
          <div className="flex gap-0.5 mt-1 flex-wrap">
            {msg.reactions.map((r, i) => (
              <span
                key={i}
                className={`text-xs px-1.5 py-0.5 rounded-full border ${
                  String((r.user?._id || r.user)) === String(currentUserId)
                    ? "bg-primary/20 border-primary/40"
                    : "bg-base-100/60 border-base-content/10"
                }`}
              >
                {r.emoji}
              </span>
            ))}
          </div>
        )}

        <div
          className={`flex items-center gap-1 text-[10px] select-none whitespace-nowrap ml-auto ${
            isMediaOnly
              ? "absolute bottom-2.5 right-2.5 bg-black/50 text-white rounded-full px-2 py-0.5 backdrop-blur-sm"
              : emojiOnly
                ? "absolute -bottom-3 right-0 bg-base-100/80 backdrop-blur-md rounded-full px-1.5 py-0.5 shadow-sm text-base-content/80"
                : "opacity-70"
          }`}
        >
          {isStarred && <Star size={11} className="fill-amber-400 text-amber-500" />}
          {msg.isEdited && <span className="italic">edited</span>}
          <time>{formatTime(msg.createdAt)}</time>
          {isMe &&
            (tick === "read" ? (
              <CheckCheck size={14} className="text-sky-500" />
            ) : tick === "delivered" ? (
              <CheckCheck size={14} />
            ) : (
              <Check size={14} />
            ))}
          {isMe && chatType === "group" && tick === "read" && (
            <span className="text-[9px]">
              {msg.readBy?.filter(
                (r) => String((r.user?._id || r.user)) !== String(currentUserId),
              ).length || ""}
            </span>
          )}
        </div>

        {/* Hover action trigger */}
        {!selectionMode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className="absolute -top-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-base-100 rounded-full p-1 shadow-md border border-base-content/10 cursor-pointer"
            aria-label="Message actions"
          >
            <SmilePlus size={13} className="text-base-content/70" />
          </button>
        )}

        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute z-50 bottom-full mb-1 right-0 bg-base-100 text-base-content rounded-xl shadow-2xl border border-base-content/10 w-44 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {reactBarOpen && (
              <div className="flex gap-1 px-2 py-2 border-b border-base-content/10">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className={`text-xl hover:scale-125 transition-transform bg-transparent border-0 cursor-pointer ${
                      myReaction?.emoji === emoji ? "grayscale-0 scale-110" : ""
                    }`}
                    onClick={() => {
                      onReact(msg, emoji);
                      setMenuOpen(false);
                      setReactBarOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className={actionBtn} onClick={() => { setReactBarOpen((v) => !v); }}>
              <SmilePlus size={16} /> React
            </button>
            <button type="button" className={actionBtn} onClick={() => { onReply(msg); setMenuOpen(false); }}>
              <Reply size={16} /> Reply
            </button>
            <button type="button" className={actionBtn} onClick={() => { onStar(msg); setMenuOpen(false); }}>
              <Star size={16} className={isStarred ? "fill-amber-400 text-amber-500" : ""} />
              {isStarred ? "Unstar" : "Star"}
            </button>
            <button type="button" className={actionBtn} onClick={() => { onForward(msg); setMenuOpen(false); }}>
              <Forward size={16} /> Forward
            </button>
            {isMe && msg.messageType === "text" && !msg.isDeletedForEveryone && (
              <button type="button" className={actionBtn} onClick={() => { onEdit(msg); setMenuOpen(false); }}>
                <Pencil size={16} /> Edit
              </button>
            )}
            <button type="button" className={actionBtn} onClick={() => { onSelect(msg._id); setMenuOpen(false); }}>
              <CheckSquare size={16} /> Select
            </button>
            <button
              type="button"
              className={`${actionBtn} text-error`}
              onClick={() => { onDelete(msg, isMe ? "for_everyone" : "for_me"); setMenuOpen(false); }}
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
