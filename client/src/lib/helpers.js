import api from "./api";

export const getMediaUrl = (url) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${api.defaults.baseURL}${url}`;
};

export const getInitials = (name) =>
  (name || "?").trim().charAt(0).toUpperCase();

export const formatTime = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatListTime = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return formatTime(d);
  if (sameDay(d, yesterday)) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
};

export const formatLastSeen = (date) => {
  if (!date) return "offline";
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "last seen just now";
  if (mins < 60) return `last seen ${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `last seen ${hours}h ago`;
  return `last seen ${d.toLocaleDateString([], { day: "numeric", month: "short" })}`;
};

export const formatDuration = (sec) => {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
};

// Tick state for an outgoing message: sent | delivered | read
export const getTickState = (msg, currentUserId, peerId) => {
  const hasOthersRead =
    Array.isArray(msg.readBy) &&
    msg.readBy.some(
      (r) => String((r.user?._id || r.user)) !== String(currentUserId),
    );
  if (hasOthersRead) return "read";
  if (msg.isRead) return "read";

  if (msg.groupId) {
    // Group fan-out means the server accepted the message for all members;
    // blue ticks appear once at least one other member reads it.
    return "delivered";
  }
  if (
    Array.isArray(msg.deliveredTo) &&
    msg.deliveredTo.some((id) => String(id) === String(peerId))
  ) {
    return "delivered";
  }
  return "sent";
};

export const isEmojiOnly = (text) => {
  if (!text) return false;
  const noSpace = text.replace(/[\s\n]/g, "");
  if (noSpace.length === 0) return false;
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(noSpace);
};

export const previewText = (msg) => {
  if (!msg) return "";
  if (msg.isDeletedForEveryone) return "🚫 This message was deleted";
  switch (msg.messageType) {
    case "image":
      return "📷 Photo";
    case "video":
      return "🎥 Video";
    case "audio":
      return "🎤 Voice message";
    case "document":
      return "📄 Document";
    case "system":
      return msg.message;
    default:
      return msg.message || "";
  }
};

export const playMessageSound = (type = "incoming") => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    if (type === "outgoing") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch {
    // audio not available
  }
};
