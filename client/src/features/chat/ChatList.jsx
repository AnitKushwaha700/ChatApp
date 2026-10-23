import { useState } from "react";
import { Users, BellOff, Pin, Archive, ArchiveRestore, Search } from "lucide-react";
import { getMediaUrl, getInitials, formatListTime, previewText } from "../../lib/helpers";
import { useAuth } from "../auth/AuthContext";

const ChatList = ({ chats, selectedChat, onSelect, onlineUsers }) => {
  const { user } = useAuth();
  const [showArchived, setShowArchived] = useState(false);

  const visible = chats.filter((c) =>
    showArchived ? c.settings?.archived : !c.settings?.archived,
  );
  const archivedCount = chats.filter((c) => c.settings?.archived).length;

  const lastSenderPrefix = (chat) => {
    const msg = chat.lastMessage;
    if (!msg) return "";
    const senderId =
      typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;
    const mine = String(senderId) === String(user?._id);
    if (chat.chatType === "group") {
      if (mine) return "You: ";
      const name =
        typeof msg.senderId === "object" ? msg.senderId?.fullName?.split(" ")[0] : "";
      return name ? `${name}: ` : "";
    }
    return mine ? "You: " : "";
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {archivedCount > 0 && !showArchived && (
        <button
          onClick={() => setShowArchived(true)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-base-content/5 border-b border-base-content/5"
        >
          <Archive size={17} />
          Archived
          <span className="badge badge-sm badge-ghost ml-auto">{archivedCount}</span>
        </button>
      )}
      {showArchived && (
        <button
          onClick={() => setShowArchived(false)}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-primary hover:bg-base-content/5 border-b border-base-content/5"
        >
          <ArchiveRestore size={17} /> Back to chats
        </button>
      )}

      {visible.map((chat) => {
        const active = selectedChat?._id === chat._id && selectedChat?.chatType === chat.chatType;
        const isOnline = chat.chatType === "dm" && (onlineUsers[chat._id] || chat.isOnline);
        const isMuted =
          chat.settings?.mutedUntil && new Date(chat.settings.mutedUntil) > new Date();
        return (
          <div
            key={`${chat.chatType}-${chat._id}`}
            onClick={() => onSelect(chat)}
            className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors ${
              active ? "bg-base-content/10" : "hover:bg-base-content/5"
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold overflow-hidden">
                {chat.avatar ? (
                  <img src={getMediaUrl(chat.avatar)} alt="" className="w-full h-full object-cover" />
                ) : chat.chatType === "group" ? (
                  <Users size={20} />
                ) : (
                  getInitials(chat.name)
                )}
              </div>
              {isOnline && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-base-200" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-semibold truncate flex items-center gap-1">
                  {chat.name}
                  {chat.settings?.pinned && <Pin size={11} className="text-base-content/50 shrink-0" />}
                  {isMuted && <BellOff size={11} className="text-base-content/50 shrink-0" />}
                </h4>
                <span
                  className={`text-[10px] shrink-0 ${
                    chat.unreadCount > 0 ? "text-success font-semibold" : "text-base-content/45"
                  }`}
                >
                  {chat.lastMessage ? formatListTime(chat.lastMessage.createdAt) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-base-content/55 truncate">
                  {chat.lastMessage
                    ? `${lastSenderPrefix(chat)}${previewText(chat.lastMessage)}`
                    : chat.chatType === "group"
                      ? `${chat.memberCount} members`
                      : chat.about || "No messages yet"}
                </p>
                {chat.unreadCount > 0 &&
                  (isMuted ? (
                    <span className="w-5 h-5 rounded-full bg-base-content/25 text-[10px] flex items-center justify-center font-bold shrink-0">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  ) : (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-success text-white text-[10px] flex items-center justify-center font-bold shrink-0">
                      {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        );
      })}

      {visible.length === 0 && (
        <div className="text-center text-sm text-base-content/45 mt-12 px-6">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
          {showArchived
            ? "No archived chats"
            : "No chats yet. Add friends or create a group to get started."}
        </div>
      )}
    </div>
  );
};

export default ChatList;
