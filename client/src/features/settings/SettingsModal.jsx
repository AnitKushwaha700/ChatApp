import { useEffect, useState } from "react";
import { X, ShieldCheck, Info } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";

const LEVELS = [
  { value: "everyone", label: "Everyone" },
  { value: "friends", label: "My friends" },
  { value: "nobody", label: "Nobody" },
];

const SettingsModal = ({ open, onClose }) => {
  const { user, setUser } = useAuth();
  const [privacy, setPrivacy] = useState({
    lastSeen: "everyone",
    profilePhoto: "everyone",
    about: "everyone",
    readReceipts: true,
  });
  const [about, setAbout] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrivacy({
        lastSeen: user.privacy?.lastSeen || "everyone",
        profilePhoto: user.privacy?.profilePhoto || "everyone",
        about: user.privacy?.about || "everyone",
        readReceipts: user.privacy?.readReceipts !== false,
      });
      setAbout(user.about || "");
    }
  }, [open, user]);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    try {
      const [privRes] = await Promise.all([
        api.patch("/social/privacy", privacy),
        api.patch("/social/about", { about }),
      ]);
      const fresh = await api.get("/user/me");
      setUser({ ...fresh.data.data, privacy: privRes.data.data });
      sessionStorage.setItem("AppUser", JSON.stringify(fresh.data.data));
      toast.success("Settings saved");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "select select-sm select-bordered w-full";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[88vh]">
        <div className="p-4 border-b border-base-content/10 flex items-center justify-between">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Privacy & settings
          </h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5 flex-1">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wide text-base-content/50 mb-3 flex items-center gap-1">
              <Info size={13} /> Who can see my...
            </h4>
            <div className="space-y-3">
              {[
                { key: "lastSeen", label: "Last seen & online" },
                { key: "profilePhoto", label: "Profile photo" },
                { key: "about", label: "About info" },
              ].map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <label className="text-sm">{row.label}</label>
                  <select
                    className={selectClass}
                    value={privacy[row.key]}
                    onChange={(e) =>
                      setPrivacy((p) => ({ ...p, [row.key]: e.target.value }))
                    }
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm">Read receipts</p>
              <p className="text-xs text-base-content/50">
                If turned off, you won't send or receive blue ticks
              </p>
            </div>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={privacy.readReceipts}
              onChange={(e) =>
                setPrivacy((p) => ({ ...p, readReceipts: e.target.checked }))
              }
            />
          </div>

          <div className="divider text-xs text-base-content/40">Profile</div>

          <div>
            <label className="text-sm font-medium">About</label>
            <textarea
              className="textarea textarea-bordered w-full mt-1"
              rows={2}
              maxLength={139}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Hey there! I am using ChatApp"
            />
            <p className="text-[10px] text-right text-base-content/40">{about.length}/139</p>
          </div>
        </div>

        <div className="p-4 border-t border-base-content/10 flex gap-3">
          <button onClick={onClose} className="btn btn-ghost flex-1">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1">
            {saving ? <span className="loading loading-spinner loading-sm" /> : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
