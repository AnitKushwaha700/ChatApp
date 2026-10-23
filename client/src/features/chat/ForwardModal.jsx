import { useEffect, useState } from "react";
import { X, Forward, Search } from "lucide-react";
import api from "../../lib/api";
import { getMediaUrl } from "../../lib/helpers";

const ForwardModal = ({ open, onClose, message, onForwarded }) => {
  const [chats, setChats] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    api
      .get("/user/chat-list")
      .then((res) => setChats(res.data.data))
      .catch(console.error);
  }, [open]);

  if (!open || !message) return null;

  const filtered = chats.filter((c) =>
    (c.name || "").toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (chat) => {
    setSelected((prev) => {
      const key = `${chat.chatType}:${chat._id}`;
      return prev.some((p) => p.key === key)
        ? prev.filter((p) => p.key !== key)
        : [...prev, { key, chatType: chat.chatType, id: chat._id }];
    });
  };

  const handleForward = async () => {
    if (selected.length === 0) return;
    setSending(true);
    try {
      await api.post("/user/message/forward", {
        messageId: message._id,
        targets: selected.map(({ chatType, id }) => ({ chatType, id })),
      });
      onForwarded?.(selected.length);
      setSelected([]);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Forward failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Forward size={20} className="text-primary" /> Forward to
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="p-3 border-b border-base-content/10">
          <div className="relative flex items-center bg-base-content/5 rounded-lg p-2 border border-base-content/10">
            <Search className="w-4 h-4 text-base-content/50 absolute left-3" />
            <input
              className="bg-transparent outline-none pl-8 text-sm w-full"
              placeholder="Search chats..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((chat) => {
            const key = `${chat.chatType}:${chat._id}`;
            const checked = selected.some((p) => p.key === key);
            return (
              <div
                key={key}
                onClick={() => toggle(chat)}
                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                  checked ? "bg-primary/15" : "hover:bg-base-content/5"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold overflow-hidden shrink-0">
                  {chat.avatar ? (
                    <img src={getMediaUrl(chat.avatar)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (chat.name || "?").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.name}</p>
                  <p className="text-xs text-base-content/60">
                    {chat.chatType === "group"
                      ? `${chat.memberCount} members`
                      : chat.isOnline
                        ? "online"
                        : "offline"}
                  </p>
                </div>
                <input type="checkbox" readOnly checked={checked} className="checkbox checkbox-sm checkbox-primary" />
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-center text-sm text-base-content/50 py-8">No chats found</p>
          )}
        </div>

        <div className="p-4 border-t border-base-content/10">
          <button
            onClick={handleForward}
            disabled={selected.length === 0 || sending}
            className="btn btn-primary w-full"
          >
            {sending ? (
              <span className="loading loading-spinner loading-sm" />
            ) : (
              `Forward ${selected.length > 0 ? `(${selected.length})` : ""}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForwardModal;
