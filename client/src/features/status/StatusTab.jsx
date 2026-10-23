import { useEffect, useRef, useState } from "react";
import { Plus, X, Eye, Trash2, ImagePlus, Type, ChevronLeft, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { getMediaUrl, getInitials, formatListTime } from "../../lib/helpers";
import { useAuth } from "../auth/AuthContext";

const STATUS_BG = ["#075E54", "#128C7E", "#34B7F1", "#7F66FF", "#E64398", "#F18904", "#2C3E50"];

const StatusCreator = ({ open, onClose, onCreated }) => {
  const [mode, setMode] = useState("text");
  const [text, setText] = useState("");
  const [bg, setBg] = useState(STATUS_BG[0]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      if (mode === "text") {
        if (!text.trim()) return toast.error("Write something first");
        fd.append("type", "text");
        fd.append("text", text);
        fd.append("bg", bg);
      } else {
        if (!file) return toast.error("Pick a photo or video");
        fd.append("media", file);
      }
      await api.post("/status", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Status updated");
      setText("");
      setFile(null);
      setPreview(null);
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add status");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <h3 className="font-bold text-lg">Add status</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="join w-full">
            <button
              onClick={() => setMode("text")}
              className={`btn btn-sm join-item flex-1 ${mode === "text" ? "btn-primary" : ""}`}
            >
              <Type size={15} /> Text
            </button>
            <button
              onClick={() => setMode("media")}
              className={`btn btn-sm join-item flex-1 ${mode === "media" ? "btn-primary" : ""}`}
            >
              <ImagePlus size={15} /> Photo / Video
            </button>
          </div>

          {mode === "text" ? (
            <>
              <div
                className="rounded-2xl h-44 flex items-center justify-center p-4"
                style={{ background: bg }}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  maxLength={500}
                  placeholder="Type a status..."
                  className="bg-transparent text-white text-center text-lg outline-none resize-none w-full placeholder:text-white/60"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-center">
                {STATUS_BG.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBg(c)}
                    className={`w-7 h-7 rounded-full border-2 ${bg === c ? "border-primary scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label="background color"
                  />
                ))}
              </div>
            </>
          ) : (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-base-content/20 rounded-2xl h-44 cursor-pointer hover:bg-base-200/50 transition-colors gap-2">
              {preview ? (
                <img src={preview} alt="preview" className="h-full object-contain rounded-2xl" />
              ) : (
                <>
                  <ImagePlus size={32} className="text-base-content/40" />
                  <span className="text-sm text-base-content/60">Click to choose media</span>
                </>
              )}
              <input
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) {
                    setFile(f);
                    setPreview(URL.createObjectURL(f));
                  }
                }}
              />
            </label>
          )}
        </div>

        <div className="p-4 border-t border-base-content/10">
          <button onClick={submit} disabled={saving} className="btn btn-primary w-full">
            {saving ? <span className="loading loading-spinner loading-sm" /> : "Post status"}
          </button>
        </div>
      </div>
    </div>
  );
};

const StatusViewer = ({ groups, startGroup, onClose, onViewed }) => {
  const [groupIdx, setGroupIdx] = useState(startGroup);
  const [itemIdx, setItemIdx] = useState(0);
  const [viewers, setViewers] = useState(null);
  const progressTimer = useRef(null);

  const group = groups[groupIdx];
  const item = group?.items[itemIdx];
  const isMine = group?.isMine;

  const next = () => {
    if (!group) return;
    if (itemIdx + 1 < group.items.length) setItemIdx((i) => i + 1);
    else if (groupIdx + 1 < groups.length) {
      setGroupIdx((g) => g + 1);
      setItemIdx(0);
    } else onClose();
  };
  const prev = () => {
    if (itemIdx > 0) setItemIdx((i) => i - 1);
    else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setItemIdx(0);
    }
  };

  useEffect(() => {
    if (!item) return;
    if (!isMine) {
      api.post(`/status/${item._id}/view`).then(() => onViewed?.()).catch(() => {});
    }
    progressTimer.current = setTimeout(() => {
      next();
    }, 5000);
    return () => clearTimeout(progressTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdx, itemIdx]);

  if (!group || !item) return null;

  const loadViewers = async () => {
    try {
      const res = await api.get(`/status/${item._id}/viewers`);
      setViewers(res.data.data);
    } catch {
      toast.error("Could not load viewers");
    }
  };

  const remove = async () => {
    await api.delete(`/status/${item._id}`);
    toast.success("Status deleted");
    onViewed?.();
    next();
  };

  return (
    <div className="fixed inset-0 z-[130] bg-black/95 flex flex-col">
      <div className="flex items-center gap-3 p-4 text-white">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center overflow-hidden">
          {group.owner?.profilePic ? (
            <img src={getMediaUrl(group.owner.profilePic)} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(group.owner?.fullName)
          )}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {isMine ? "My status" : group.owner?.fullName}
          </p>
          <p className="text-xs text-white/60">{formatListTime(item.createdAt)}</p>
        </div>
        {isMine && (
          <>
            <button onClick={loadViewers} className="btn btn-ghost btn-circle btn-sm text-white">
              <Eye size={18} />
            </button>
            <button onClick={remove} className="btn btn-ghost btn-circle btn-sm text-error">
              <Trash2 size={18} />
            </button>
          </>
        )}
        <button onClick={onClose} className="btn btn-ghost btn-circle btn-sm text-white">
          <X size={20} />
        </button>
      </div>

      {/* Progress bars */}
      <div className="flex gap-1 px-4">
        {group.items.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 bg-white/25 rounded overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-[5000ms] ease-linear"
              style={{ width: i <= itemIdx ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      <div className="flex-1 relative flex items-center justify-center p-4">
        {item.type === "text" ? (
          <div
            className="w-full max-w-lg aspect-[9/14] max-h-full rounded-2xl flex items-center justify-center p-8"
            style={{ background: item.bg || "#075E54" }}
          >
            <p className="text-white text-2xl text-center whitespace-pre-wrap">{item.text}</p>
          </div>
        ) : item.type === "video" ? (
          <video src={getMediaUrl(item.mediaUrl)} controls autoPlay className="max-h-full rounded-2xl" />
        ) : (
          <img src={getMediaUrl(item.mediaUrl)} alt="status" className="max-h-full rounded-2xl object-contain" />
        )}

        <button
          onClick={prev}
          className="absolute left-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-white/15 text-white border-0"
        >
          <ChevronLeft size={20} />
        </button>
        <button
          onClick={next}
          className="absolute right-2 top-1/2 -translate-y-1/2 btn btn-circle btn-sm bg-white/15 text-white border-0"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {viewers && (
        <div className="absolute bottom-0 inset-x-0 bg-base-100 text-base-content rounded-t-2xl p-4 max-h-1/2 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Eye size={16} /> Viewed by {viewers.length}
            </h4>
            <button onClick={() => setViewers(null)} className="btn btn-ghost btn-xs btn-circle">
              <X size={14} />
            </button>
          </div>
          {viewers.length === 0 && <p className="text-sm text-base-content/50 py-3 text-center">No views yet</p>}
          {viewers.map((v) => (
            <div key={String(v.user?._id || v.user)} className="flex items-center gap-3 py-2">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs overflow-hidden">
                {v.user?.profilePic ? (
                  <img src={getMediaUrl(v.user.profilePic)} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(v.user?.fullName)
                )}
              </div>
              <p className="text-sm">{v.user?.fullName}</p>
              <span className="text-xs text-base-content/50 ml-auto">{formatListTime(v.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatusTab = ({ refreshKey }) => {
  const { user } = useAuth();
  const [data, setData] = useState({ mine: [], friends: [] });
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [viewer, setViewer] = useState(null); // {groupIdx}

  const load = async () => {
    try {
      const res = await api.get("/status");
      setData(res.data.data);
    } catch (err) {
      console.error("status load failed", err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [refreshKey]);

  const viewerGroups = [
    ...(data.mine.length
      ? [
          {
            isMine: true,
            owner: { _id: user?._id, fullName: user?.fullName, profilePic: user?.profilePic },
            items: data.mine,
            viewedByMe: true,
          },
        ]
      : []),
    ...data.friends,
  ];

  return (
    <div className="p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 px-1">Status</h3>
        <button onClick={() => setCreatorOpen(true)} className="btn btn-primary btn-sm rounded-full">
          <Plus size={16} /> Add status
        </button>
      </div>

      {/* My status */}
      <button
        onClick={() => data.mine.length > 0 && setViewer({ groupIdx: 0 })}
        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5 text-left"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden">
            {user?.profilePic ? (
              <img src={getMediaUrl(user.profilePic)} alt="" className="w-full h-full object-cover" />
            ) : (
              getInitials(user?.fullName)
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success text-white flex items-center justify-center border-2 border-base-200">
            <Plus size={12} />
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold">My status</p>
          <p className="text-xs text-base-content/50">
            {data.mine.length ? `${data.mine.length} update${data.mine.length > 1 ? "s" : ""} · tap to view` : "Tap to add status update"}
          </p>
        </div>
      </button>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-base-content/50 px-1 mb-1">
          Recent updates
        </h4>
        {data.friends.length === 0 && (
          <p className="text-sm text-base-content/40 text-center py-8">
            No status updates from friends yet
          </p>
        )}
        {data.friends.map((g, idx) => (
          <button
            key={String(g.owner?._id)}
            onClick={() =>
              setViewer({
                groupIdx: data.mine.length ? idx + 1 : idx,
              })
            }
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5 text-left"
          >
            <div
              className={`w-12 h-12 rounded-full p-0.5 ${
                g.viewedByMe ? "bg-base-content/25" : "bg-success"
              }`}
            >
              <div className="w-full h-full rounded-full overflow-hidden border-2 border-base-200 bg-primary flex items-center justify-center text-primary-content">
                {g.owner?.profilePic ? (
                  <img src={getMediaUrl(g.owner.profilePic)} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(g.owner?.fullName)
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium">{g.owner?.fullName}</p>
              <p className="text-xs text-base-content/50">
                {g.items.length} update{g.items.length > 1 ? "s" : ""} ·{" "}
                {formatListTime(g.items[0]?.createdAt)}
              </p>
            </div>
          </button>
        ))}
      </div>

      <StatusCreator open={creatorOpen} onClose={() => setCreatorOpen(false)} onCreated={load} />
      {viewer && (
        <StatusViewer
          groups={viewerGroups}
          startGroup={viewer.groupIdx}
          onClose={() => {
            setViewer(null);
            load();
          }}
          onViewed={load}
        />
      )}
    </div>
  );
};

export default StatusTab;
