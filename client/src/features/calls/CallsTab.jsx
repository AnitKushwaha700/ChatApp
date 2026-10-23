import { useEffect, useState } from "react";
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
} from "lucide-react";
import api from "../../lib/api";
import { getMediaUrl, getInitials, formatListTime } from "../../lib/helpers";

const CallsTab = ({ onInitiate }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/calls/history");
      setLogs(res.data.data);
    } catch (err) {
      console.error("call history failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const otherParty = (log) =>
    log.direction === "outgoing" ? log.callee : log.caller;

  return (
    <div className="p-3">
      <h3 className="font-bold text-sm uppercase tracking-wide text-base-content/60 px-1 mb-2">
        Recent calls
      </h3>
      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-base-content/40">
          <Phone size={36} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No calls yet</p>
          <p className="text-xs mt-1">Start a voice or video call from any chat</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const party = otherParty(log);
            const missed = log.status === "missed" && log.direction === "incoming";
            return (
              <div
                key={log._id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-base-content/5"
              >
                <div className="w-10 h-10 rounded-full bg-primary text-primary-content flex items-center justify-center overflow-hidden shrink-0">
                  {party?.profilePic ? (
                    <img src={getMediaUrl(party.profilePic)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(party?.fullName || party?.email)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${missed ? "text-error" : ""}`}>
                    {party?.fullName || party?.email || "Unknown"}
                  </p>
                  <p className="text-xs text-base-content/50 flex items-center gap-1">
                    {log.direction === "outgoing" ? (
                      <PhoneOutgoing size={12} className="text-success" />
                    ) : log.status === "missed" ? (
                      <PhoneMissed size={12} className="text-error" />
                    ) : (
                      <PhoneIncoming size={12} className="text-primary" />
                    )}
                    {log.status === "missed"
                      ? "Missed"
                      : log.status === "declined"
                        ? "Declined"
                        : log.direction === "outgoing"
                          ? "Outgoing"
                          : "Incoming"}
                    {log.durationSec > 0 && ` · ${Math.floor(log.durationSec / 60)}:${String(log.durationSec % 60).padStart(2, "0")}`}
                    <Clock size={11} className="ml-1" />
                    {formatListTime(log.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    onInitiate(
                      { _id: party?._id, fullName: party?.fullName, email: party?.email, chatType: "dm" },
                      log.type === "video",
                    )
                  }
                  className="btn btn-ghost btn-circle btn-sm text-primary"
                  aria-label="Call back"
                >
                  {log.type === "video" ? <Video size={18} /> : <Phone size={18} />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CallsTab;
