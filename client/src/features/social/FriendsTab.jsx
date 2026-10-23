import { useEffect, useState, useCallback } from "react";
import {
  UserPlus,
  Check,
  X,
  Search,
  MessageSquare,
  Trash2,
  Ban,
  Users,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getMediaUrl, getInitials } from "../../lib/helpers";

const Avatar = ({ user, size = "w-10 h-10" }) => (
  <div className={`${size} rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden shrink-0`}>
    {user?.profilePic ? (
      <img src={getMediaUrl(user.profilePic)} alt="" className="w-full h-full object-cover" />
    ) : (
      getInitials(user?.fullName || user?.email)
    )}
  </div>
);

const FriendsTab = ({ onOpenChat, onCountChange }) => {
  const [section, setSection] = useState("requests"); // requests | friends | add | blocked
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [friends, setFriends] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [reqRes, friendRes, blockedRes, usersRes] = await Promise.all([
        api.get("/social/friend-requests"),
        api.get("/social/friends"),
        api.get("/social/blocked"),
        api.get("/user/allUsers"),
      ]);
      setReceived(reqRes.data.data.received);
      setSent(reqRes.data.data.sent);
      setFriends(friendRes.data.data);
      setBlocked(blockedRes.data.data);
      setAllUsers(usersRes.data.data);
      onCountChange?.(reqRes.data.data.received.length);
    } catch (err) {
      console.error("social load failed", err);
    }
  }, [onCountChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const act = async (promise, success) => {
    try {
      await promise;
      toast.success(success);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    }
  };

  const friendIds = new Set(friends.map((f) => String(f._id)));
  const sentIds = new Set(sent.map((f) => String(f._id)));
  const blockedIds = new Set(blocked.map((f) => String(f._id)));
  const filteredUsers = allUsers.filter((u) =>
    (u.fullName || u.email || "").toLowerCase().includes(query.toLowerCase()),
  );

  const tabs = [
    { id: "requests", label: "Requests", icon: UserPlus, badge: received.length },
    { id: "friends", label: "Friends", icon: Users },
    { id: "add", label: "Add", icon: Search },
    { id: "blocked", label: "Blocked", icon: Ban },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-base-content/10">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setSection(t.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium relative transition-colors ${
                section === t.id ? "text-primary" : "text-base-content/55"
              }`}
            >
              <Icon size={17} />
              {t.label}
              {t.badge > 0 && (
                <span className="absolute top-1 right-1/4 w-4 h-4 rounded-full bg-error text-white text-[9px] flex items-center justify-center">
                  {t.badge}
                </span>
              )}
              {section === t.id && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {section === "requests" && (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase text-base-content/50 px-2 py-1">
                Received ({received.length})
              </h4>
              {received.length === 0 && (
                <p className="text-sm text-base-content/40 text-center py-6">No pending requests</p>
              )}
              {received.map((u) => (
                <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName || u.email}</p>
                    <p className="text-xs text-base-content/50 truncate">{u.about || u.email}</p>
                  </div>
                  <button
                    className="btn btn-circle btn-sm btn-success text-white"
                    title="Accept"
                    onClick={() =>
                      act(api.post(`/social/friend-request/${u._id}/accept`), "Request accepted")
                    }
                  >
                    <Check size={15} />
                  </button>
                  <button
                    className="btn btn-circle btn-sm btn-ghost text-error"
                    title="Decline"
                    onClick={() =>
                      act(api.post(`/social/friend-request/${u._id}/decline`), "Request declined")
                    }
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-base-content/50 px-2 py-1 flex items-center gap-1">
                <Clock size={12} /> Sent ({sent.length})
              </h4>
              {sent.length === 0 && (
                <p className="text-sm text-base-content/40 text-center py-6">No sent requests</p>
              )}
              {sent.map((u) => (
                <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5">
                  <Avatar user={u} />
                  <p className="flex-1 text-sm font-medium truncate">{u.fullName || u.email}</p>
                  <button
                    className="btn btn-xs btn-ghost text-error"
                    onClick={() =>
                      act(api.post(`/social/friend-request/${u._id}/decline`), "Request canceled")
                    }
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "friends" && (
          <div>
            {friends.length === 0 && (
              <p className="text-sm text-base-content/40 text-center py-10">
                No friends yet — add people from the Add tab
              </p>
            )}
            {friends.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5">
                <Avatar user={u} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{u.fullName || u.email}</p>
                  <p className="text-xs text-base-content/50 truncate">{u.about || ""}</p>
                </div>
                <button
                  className="btn btn-circle btn-sm btn-ghost text-primary"
                  title="Message"
                  onClick={() =>
                    onOpenChat({ ...u, chatType: "dm", name: u.fullName || u.email })
                  }
                >
                  <MessageSquare size={16} />
                </button>
                <button
                  className="btn btn-circle btn-sm btn-ghost text-error"
                  title="Remove friend"
                  onClick={() => {
                    if (confirm(`Remove ${u.fullName || u.email}?`)) {
                      act(api.delete(`/social/friend/${u._id}`), "Friend removed");
                    }
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {section === "add" && (
          <div>
            <div className="relative mb-2 px-1">
              <Search className="w-4 h-4 text-base-content/50 absolute left-4 top-3.5" />
              <input
                className="input input-sm input-bordered w-full pl-9"
                placeholder="Search people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            {filteredUsers.map((u) => {
              const isFriend = friendIds.has(String(u._id));
              const isSent = sentIds.has(String(u._id));
              const isBlocked = blockedIds.has(String(u._id));
              return (
                <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5">
                  <Avatar user={u} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.fullName || u.email}</p>
                    <p className="text-xs text-base-content/50 truncate">{u.email}</p>
                  </div>
                  {isBlocked ? (
                    <button
                      className="btn btn-xs btn-outline"
                      onClick={() => act(api.delete(`/social/block/${u._id}`), "User unblocked")}
                    >
                      Unblock
                    </button>
                  ) : isFriend ? (
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => onOpenChat({ ...u, chatType: "dm", name: u.fullName || u.email })}
                    >
                      <MessageSquare size={13} /> Chat
                    </button>
                  ) : isSent ? (
                    <span className="text-xs text-base-content/50 flex items-center gap-1">
                      <Clock size={13} /> Pending
                    </span>
                  ) : (
                    <button
                      className="btn btn-xs btn-outline btn-primary"
                      onClick={() =>
                        act(api.post(`/social/friend-request/${u._id}`), "Friend request sent")
                      }
                    >
                      <UserPlus size={13} /> Add
                    </button>
                  )}
                </div>
              );
            })}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-base-content/40 text-center py-8">No users found</p>
            )}
          </div>
        )}

        {section === "blocked" && (
          <div>
            {blocked.length === 0 && (
              <p className="text-sm text-base-content/40 text-center py-10">No blocked contacts</p>
            )}
            {blocked.map((u) => (
              <div key={u._id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5">
                <Avatar user={u} />
                <p className="flex-1 text-sm font-medium truncate">{u.fullName || u.email}</p>
                <button
                  className="btn btn-xs btn-outline"
                  onClick={() => act(api.delete(`/social/block/${u._id}`), "User unblocked")}
                >
                  <Ban size={13} /> Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsTab;
