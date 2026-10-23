import { useEffect, useState } from "react";
import {
  X,
  Users,
  Crown,
  UserMinus,
  UserPlus,
  LogOut,
  Trash2,
  Link2,
  Check,
  Search,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import socketAPI from "../../lib/webSocket";
import { getMediaUrl, getInitials } from "../../lib/helpers";

// ───────────────────────── Create group ─────────────────────────
export const CreateGroupModal = ({ open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName("");
    setDescription("");
    setAvatar(null);
    setPreview(null);
    setPicked([]);
    api
      .get("/user/allUsers")
      .then((res) => setUsers(res.data.data))
      .catch(console.error);
  }, [open]);

  if (!open) return null;

  const filtered = users.filter((u) =>
    (u.fullName || u.email || "").toLowerCase().includes(query.toLowerCase()),
  );

  const toggle = (id) =>
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Group name is required");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      fd.append("memberIds", JSON.stringify(picked));
      if (avatar) fd.append("avatar", avatar);
      const res = await api.post("/groups", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      socketAPI.emit("group:join", { groupId: res.data.data._id });
      toast.success("Group created");
      onCreated?.(res.data.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={submit}
        className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]"
      >
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Users size={20} className="text-primary" /> New Group
          </h3>
          <button type="button" onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden shrink-0">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <Users size={24} />
              )}
            </div>
            <label className="btn btn-sm btn-outline cursor-pointer">
              Group icon
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) {
                    setAvatar(f);
                    setPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
          </div>

          <input
            className="input input-bordered w-full"
            placeholder="Group name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
          <textarea
            className="textarea textarea-bordered w-full"
            placeholder="Group description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            rows={2}
          />

          <div className="relative">
            <Search className="w-4 h-4 text-base-content/50 absolute left-3 top-3" />
            <input
              className="input input-bordered w-full pl-9"
              placeholder="Search users to add..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {picked.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((id) => {
                const u = users.find((x) => x._id === id);
                return (
                  <span key={id} className="badge badge-primary gap-1">
                    {u?.fullName || u?.email || "user"}
                    <button type="button" onClick={() => toggle(id)}>
                      <X size={11} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto custom-scrollbar divide-y divide-base-content/5">
            {filtered.map((u) => (
              <label
                key={u._id}
                className="flex items-center gap-3 p-2.5 hover:bg-base-content/5 rounded-lg cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm checkbox-primary"
                  checked={picked.includes(u._id)}
                  onChange={() => toggle(u._id)}
                />
                <div className="w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden">
                  {u.profilePic ? (
                    <img src={getMediaUrl(u.profilePic)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(u.fullName || u.email)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{u.fullName || u.email}</p>
                  <p className="text-xs text-base-content/50 truncate">{u.email}</p>
                </div>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-base-content/50 py-6">No users found</p>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-base-content/10">
          <button className="btn btn-primary w-full" disabled={saving || !name.trim()}>
            {saving ? <span className="loading loading-spinner loading-sm" /> : <Send size={16} />}
            Create group{picked.length ? ` · ${picked.length} members` : ""}
          </button>
        </div>
      </form>
    </div>
  );
};

// ───────────────────────── Group info / admin ─────────────────────────
export const GroupInfoModal = ({ open, onClose, groupId, currentUserId }) => {
  const [group, setGroup] = useState(null);
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const load = async () => {
    try {
      const [gRes, uRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get("/user/allUsers"),
      ]);
      setGroup(gRes.data.data);
      setName(gRes.data.data.name);
      setDescription(gRes.data.data.description || "");
      setUsers(uRes.data.data);
    } catch {
      toast.error("Failed to load group");
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open && groupId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, groupId]);

  if (!open) return null;

  const myMember = group?.members.find(
    (m) => String(m.user?._id || m.user) === String(currentUserId),
  );
  const isAdmin = myMember?.role === "admin";
  const isCreator = String(group?.createdBy) === String(currentUserId);
  const memberIds = new Set(
    group?.members.map((m) => String(m.user?._id || m.user)) || [],
  );
  const addable = users.filter(
    (u) =>
      !memberIds.has(String(u._id)) &&
      (u.fullName || u.email || "").toLowerCase().includes(addQuery.toLowerCase()),
  );

  const saveDetails = async () => {
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("description", description);
      const res = await api.patch(`/groups/${groupId}`, fd);
      setGroup(res.data.data);
      setEditing(false);
      toast.success("Group updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const addMembers = async (userIds) => {
    const res = await api.post(`/groups/${groupId}/members`, { userIds });
    setGroup(res.data.data);
    setShowAdd(false);
    toast.success("Members added");
  };

  const removeMember = async (userId) => {
    const res = await api.delete(`/groups/${groupId}/members/${userId}`);
    setGroup(res.data.data);
    toast.success("Member removed");
  };

  const changeRole = async (userId, role) => {
    const res = await api.post(`/groups/${groupId}/role/${userId}`, { role });
    setGroup(res.data.data);
    toast.success(role === "admin" ? "Promoted to admin" : "Demoted to member");
  };

  const leave = async () => {
    if (!confirm("Leave this group?")) return;
    await api.post(`/groups/${groupId}/leave`);
    toast.success("You left the group");
    onClose();
  };

  const removeGroup = async () => {
    if (!confirm("Delete this group for everyone? This cannot be undone.")) return;
    await api.delete(`/groups/${groupId}`);
    toast.success("Group deleted");
    onClose();
  };

  const copyInvite = async () => {
    const res = await api.post(`/groups/${groupId}/invite-link`);
    const code = res.data.inviteCode;
    setInviteCode(code);
    const link = `${window.location.origin}/chat?join=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast(link);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]">
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <h3 className="font-bold text-lg">Group info</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        {!group ? (
          <div className="p-10 flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : (
          <div className="overflow-y-auto custom-scrollbar flex-1">
            <div className="flex flex-col items-center gap-2 p-6 bg-base-200/50">
              <div className="w-24 h-24 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden text-3xl font-bold">
                {group.avatar ? (
                  <img src={getMediaUrl(group.avatar)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Users size={36} />
                )}
              </div>
              {editing ? (
                <div className="w-full space-y-2 mt-2">
                  <input
                    className="input input-bordered input-sm w-full"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <textarea
                    className="textarea textarea-bordered textarea-sm w-full"
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button className="btn btn-primary btn-sm flex-1" onClick={saveDetails}>
                      Save
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold">{group.name}</h2>
                  <p className="text-sm text-base-content/60 text-center">
                    {group.description || "No description"}
                  </p>
                  <p className="text-xs text-base-content/50">
                    Group · {group.members.length} members
                  </p>
                  {isAdmin && (
                    <button className="btn btn-xs btn-outline mt-1" onClick={() => setEditing(true)}>
                      Edit name & description
                    </button>
                  )}
                </>
              )}
              <button onClick={copyInvite} className="btn btn-sm btn-ghost gap-1 mt-1">
                <Link2 size={14} /> Invite link {inviteCode && <Check size={13} className="text-success" />}
              </button>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="checkbox"
                  className="toggle toggle-primary toggle-sm"
                  checked={group.onlyAdminsCanSend}
                  disabled={!isAdmin}
                  onChange={async (e) => {
                    const fd = new FormData();
                    fd.append("onlyAdminsCanSend", String(e.target.checked));
                    const res = await api.patch(`/groups/${groupId}`, fd);
                    setGroup(res.data.data);
                  }}
                />
                Only admins can send messages
              </label>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">{group.members.length} members</h4>
                {isAdmin && (
                  <button className="btn btn-xs btn-primary" onClick={() => setShowAdd((v) => !v)}>
                    <UserPlus size={14} /> Add
                  </button>
                )}
              </div>

              {showAdd && (
                <div className="mb-3 border border-base-content/10 rounded-xl p-2">
                  <input
                    className="input input-sm input-bordered w-full mb-2"
                    placeholder="Search users..."
                    value={addQuery}
                    onChange={(e) => setAddQuery(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto custom-scrollbar">
                    {addable.map((u) => (
                      <button
                        key={u._id}
                        onClick={() => addMembers([u._id])}
                        className="flex items-center gap-2 w-full p-2 hover:bg-base-200 rounded-lg text-left text-sm"
                      >
                        <span className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs">
                          {getInitials(u.fullName || u.email)}
                        </span>
                        {u.fullName || u.email}
                      </button>
                    ))}
                    {addable.length === 0 && (
                      <p className="text-xs text-base-content/50 text-center py-3">
                        Everyone available is already in the group
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {group.members.map((m) => {
                  const u = m.user;
                  const uid = u?._id || m.user;
                  const canManage =
                    isAdmin &&
                    String(uid) !== String(currentUserId) &&
                    String(group.createdBy) !== String(uid);
                  return (
                    <div key={String(uid)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-content/5">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden relative">
                        {u?.profilePic ? (
                          <img src={getMediaUrl(u.profilePic)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          getInitials(u?.fullName || u?.email || "?")
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {u?.fullName || u?.email || "User"}
                          {String(group.createdBy) === String(uid) && (
                            <Crown size={13} className="text-amber-500" />
                          )}
                          {m.role === "admin" && (
                            <span className="badge badge-xs badge-primary badge-outline">admin</span>
                          )}
                        </p>
                        <p className="text-xs text-base-content/50 truncate">{u?.about || ""}</p>
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            title={m.role === "admin" ? "Demote" : "Make admin"}
                            className="btn btn-ghost btn-xs btn-circle"
                            onClick={() =>
                              changeRole(uid, m.role === "admin" ? "member" : "admin")
                            }
                          >
                            <Crown size={14} />
                          </button>
                          <button
                            title="Remove from group"
                            className="btn btn-ghost btn-xs btn-circle text-error"
                            onClick={() => removeMember(uid)}
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-base-content/10 space-y-2">
              {!isCreator && (
                <button onClick={leave} className="btn btn-outline btn-error w-full">
                  <LogOut size={16} /> Leave group
                </button>
              )}
              {isCreator && (
                <button onClick={removeGroup} className="btn btn-error w-full">
                  <Trash2 size={16} /> Delete group
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
