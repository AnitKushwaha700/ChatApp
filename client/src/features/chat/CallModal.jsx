import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import toast from "react-hot-toast";
import socketAPI from "../../lib/webSocket";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { callSounds } from "../../utils/callSounds";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const CallModal = ({
  callState: propCallState,
  isCalling,
  incomingCall,
  callData,
  onEndCall,
  onAcceptCall,
  onRejectCall,
}) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [currentCallState, setCurrentCallState] = useState("idle");
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pendingOfferRef = useRef(null);
  const candidatesQueueRef = useRef([]);
  const durationTimerRef = useRef(null);
  const callTimeoutTimerRef = useRef(null);

  const callDurationRef = useRef(0);
  const callStateRef = useRef("idle");
  const callDataRef = useRef(callData);

  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  // Synchronize internal state with parent prop (supporting both new callState and legacy booleans)
  useEffect(() => {
    let target = "idle";
    if (propCallState) {
      target = propCallState;
    } else if (incomingCall) {
      target = "incoming";
    } else if (isCalling) {
      target = "calling";
    }

    setCurrentCallState(target);
    callStateRef.current = target;
  }, [propCallState, incomingCall, isCalling]);

  // Record call log to MongoDB backend
  const saveCallLog = useCallback(async (status, duration = 0) => {
    try {
      const currentCallData = callDataRef.current;
      if (!currentCallData) return;
      const targetUserId = currentCallData.to || currentCallData.from;
      if (!targetUserId) return;

      await api.post("/call", {
        receiverId: targetUserId,
        callType: currentCallData.isVideo ? "video" : "audio",
        status,
        duration: Math.max(0, Math.round(duration)),
      });
    } catch (e) {
      console.warn("Could not record call log:", e?.message);
    }
  }, []);

  // Media acquisition helper with noise suppression and fallback
  const getMedia = useCallback(async (isVideo) => {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: isVideo
          ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            }
          : false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.warn("Could not get media:", err);
      if (isVideo) {
        toast("Camera unavailable, continuing with audio only", { icon: "🎙️" });
        setIsVideoOff(true);
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
        localStreamRef.current = audioStream;
        setLocalStream(audioStream);
        return audioStream;
      }
      throw err;
    }
  }, []);

  // Drain queued ICE candidates
  const drainIceQueue = async (pc) => {
    while (candidatesQueueRef.current.length > 0) {
      const candidate = candidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.warn("Error applying buffered ICE candidate:", e);
      }
    }
  };

  // Full cleanup of media streams, peer connections, and timers
  const cleanupCall = useCallback(() => {
    callSounds.stop();

    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = null;
    }
    if (callTimeoutTimerRef.current) {
      clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    pendingOfferRef.current = null;
    candidatesQueueRef.current = [];
    setCurrentCallState("idle");
    callStateRef.current = "idle";
    setIsMuted(false);
    setIsVideoOff(false);
    setCallDuration(0);
  }, []);

  // End call initiated locally
  const handleHangup = useCallback(() => {
    const prevState = callStateRef.current;
    const dur = callDurationRef.current;

    callSounds.playEndCallTone();
    const currentData = callDataRef.current;
    if (currentData) {
      const targetId = currentData.to || currentData.from;
      socketAPI.emit("endCall", { to: targetId });
    }

    if (prevState === "active") {
      saveCallLog("completed", dur);
    } else if (prevState === "calling") {
      saveCallLog("missed", 0);
    }

    cleanupCall();
    if (onEndCall) onEndCall();
  }, [cleanupCall, onEndCall, saveCallLog]);

  // Reject call initiated locally
  const handleReject = useCallback(() => {
    callSounds.playEndCallTone();
    const currentData = callDataRef.current;
    if (currentData) {
      socketAPI.emit("rejectCall", { to: currentData.from });
    }

    saveCallLog("rejected", 0);
    cleanupCall();
    if (onRejectCall) onRejectCall();
  }, [cleanupCall, onRejectCall, saveCallLog]);

  // Create RTCPeerConnection instance and attach event handlers
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const currentData = callDataRef.current;
        if (currentData) {
          const targetId = currentData.to || currentData.from;
          socketAPI.emit("iceCandidate", {
            to: targetId,
            candidate: event.candidate,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        setRemoteStream((prev) => {
          const newStream = prev || new MediaStream();
          newStream.addTrack(event.track);
          return newStream;
        });
      }
    };

    pcRef.current = pc;
    return pc;
  }, []);

  // Handle Accept from Receiver
  const handleAccept = useCallback(async () => {
    try {
      callSounds.stop();
      setCurrentCallState("active");
      callStateRef.current = "active";
      if (onAcceptCall) onAcceptCall();

      const currentData = callDataRef.current;
      const stream = await getMedia(currentData?.isVideo);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Notify caller that receiver accepted
      socketAPI.emit("acceptCall", {
        to: currentData?.from,
        from: user?._id,
      });

      // If an offer was already buffered while acquiring media, process immediately!
      if (pendingOfferRef.current) {
        const offer = pendingOfferRef.current;
        pendingOfferRef.current = null;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketAPI.emit("webrtcAnswer", {
          to: currentData?.from,
          answer,
        });
      }
    } catch (err) {
      console.error("Error accepting call:", err);
      toast.error("Could not access microphone/camera.");
      handleReject();
    }
  }, [createPeerConnection, getMedia, handleReject, onAcceptCall, user?._id]);

  // Outgoing Call flow: start preview & emit requestCall
  useEffect(() => {
    if (currentCallState === "calling" && callData?.isCaller) {
      callSounds.playOutgoingRingback();

      // Start local preview immediately so caller sees camera while ringing
      getMedia(callData.isVideo).catch((e) =>
        console.warn("Could not start caller preview:", e)
      );

      socketAPI.emit("requestCall", {
        userToCall: callData.to,
        from: user?._id,
        name: user?.fullName || user?.email || "Contact",
        isVideo: callData.isVideo,
        avatar: user?.profilePic || "",
      });

      // 35-second unanswered call timeout
      if (callTimeoutTimerRef.current) clearTimeout(callTimeoutTimerRef.current);
      callTimeoutTimerRef.current = setTimeout(() => {
        toast("No answer from contact", { icon: "📞" });
        handleHangup();
      }, 35000);
    } else if (currentCallState === "incoming") {
      callSounds.playIncomingRingtone();
    }

    return () => {
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }
    };
  }, [currentCallState, callData, getMedia, handleHangup, user]);

  // Active call duration timer
  useEffect(() => {
    if (currentCallState === "active") {
      callSounds.stop();
      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }

      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [currentCallState]);

  // WebRTC Signaling Socket Listeners
  useEffect(() => {
    // 1. Caller receives acceptance from Receiver
    const handleCallAccepted = async () => {
      setCurrentCallState("active");
      callStateRef.current = "active";
      callSounds.stop();

      if (callTimeoutTimerRef.current) {
        clearTimeout(callTimeoutTimerRef.current);
        callTimeoutTimerRef.current = null;
      }

      const currentData = callDataRef.current;
      if (!currentData) return;

      try {
        let stream = localStreamRef.current;
        if (!stream) {
          stream = await getMedia(currentData.isVideo);
        }

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketAPI.emit("webrtcOffer", {
          to: currentData.to,
          offer,
        });
      } catch (err) {
        console.error("Error creating WebRTC offer on caller side:", err);
        handleHangup();
      }
    };

    // 2. Receiver receives WebRTC Offer
    const handleWebrtcOffer = async ({ offer }) => {
      const pc = pcRef.current;
      const currentData = callDataRef.current;

      if (!pc) {
        // Receiver is still acquiring getUserMedia; buffer the offer
        pendingOfferRef.current = offer;
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceQueue(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketAPI.emit("webrtcAnswer", {
          to: currentData?.from,
          answer,
        });
      } catch (e) {
        console.error("Error handling WebRTC offer on receiver side:", e);
      }
    };

    // 3. Caller receives WebRTC Answer
    const handleWebrtcAnswer = async ({ answer }) => {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await drainIceQueue(pc);
        } catch (e) {
          console.error("Error handling WebRTC answer on caller side:", e);
        }
      }
    };

    // 4. ICE Candidates
    const handleIceCandidate = async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn("Error adding incoming ICE candidate:", e);
        }
      } else {
        candidatesQueueRef.current.push(candidate);
      }
    };

    // 5. Call Unavailable / Busy / Rejected / Ended
    const handleCallUnavailable = ({ message }) => {
      toast.error(message || "Contact is currently offline.");
      callSounds.playEndCallTone();
      saveCallLog("missed", 0);
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    const handleCallBusy = ({ message }) => {
      toast.error(message || "Contact is on another call.");
      callSounds.playEndCallTone();
      saveCallLog("missed", 0);
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    const handleCallRejected = () => {
      toast("Call declined", { icon: "❌" });
      callSounds.playEndCallTone();
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    const handleCallEnded = () => {
      toast("Call ended", { icon: "📞" });
      callSounds.playEndCallTone();
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    socketAPI.on("callAccepted", handleCallAccepted);
    socketAPI.on("webrtcOffer", handleWebrtcOffer);
    socketAPI.on("webrtcAnswer", handleWebrtcAnswer);
    socketAPI.on("iceCandidate", handleIceCandidate);
    socketAPI.on("callUnavailable", handleCallUnavailable);
    socketAPI.on("callBusy", handleCallBusy);
    socketAPI.on("callRejected", handleCallRejected);
    socketAPI.on("callEnded", handleCallEnded);

    return () => {
      socketAPI.off("callAccepted", handleCallAccepted);
      socketAPI.off("webrtcOffer", handleWebrtcOffer);
      socketAPI.off("webrtcAnswer", handleWebrtcAnswer);
      socketAPI.off("iceCandidate", handleIceCandidate);
      socketAPI.off("callUnavailable", handleCallUnavailable);
      socketAPI.off("callBusy", handleCallBusy);
      socketAPI.off("callRejected", handleCallRejected);
      socketAPI.off("callEnded", handleCallEnded);
    };
  }, [
    cleanupCall,
    createPeerConnection,
    getMedia,
    handleHangup,
    onEndCall,
    saveCallLog,
  ]);

  // Video and Audio element track bindings
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current
        .play()
        .catch((e) => {
          if (e.name !== "AbortError") {
            console.warn("Local preview playback error:", e);
          }
        });
    }
  }, [localStream, currentCallState]);

  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        remoteVideoRef.current
          .play()
          .catch((e) => {
            if (e.name !== "AbortError") {
              console.warn("Remote video playback error:", e);
            }
          });
      }
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject !== remoteStream) {
          remoteAudioRef.current.srcObject = remoteStream;
        }
        remoteAudioRef.current
          .play()
          .catch((e) => {
            if (e.name !== "AbortError") {
              console.warn("Remote audio playback error:", e);
            }
          });
      }
    }
  }, [remoteStream, currentCallState]);

  // Mute / Video Toggle handlers
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (stream && callData?.isVideo) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (currentCallState === "idle") return null;

  const targetName = callData?.name || "WhatsApp Contact";
  const avatarUrl = callData?.avatar?.startsWith("http")
    ? callData.avatar
    : callData?.avatar
    ? `${api.defaults.baseURL || ""}${callData.avatar}`
    : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Hidden high-fidelity audio element for voice calls to prevent browser video throttling */}
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      {/* Main Video / Status Card */}
      <div
        className={`relative w-full ${
          isFullscreen ? "max-w-none h-full" : "max-w-4xl h-[65vh] sm:h-[80vh]"
        } bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-[#2a3942] transition-all`}
      >
        {/* Top Floating Header with Call Timer & Type */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#202c33]/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2a3942]/60 text-white text-xs font-medium shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                currentCallState === "active"
                  ? "bg-[#00a884] animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span>{callData?.isVideo ? "Video Call" : "Voice Call"}</span>
            {currentCallState === "active" && (
              <>
                <span className="text-[#8696a0]">•</span>
                <span className="font-mono text-emerald-400">
                  {formatDuration(callDuration)}
                </span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-full bg-[#202c33]/85 backdrop-blur-md hover:bg-[#2a3942] text-[#8696a0] hover:text-white transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Incoming Call Screen */}
        {currentCallState === "incoming" && (
          <div className="flex flex-col items-center gap-5 text-white z-10 px-4 text-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#00a884]/20 flex items-center justify-center animate-ping absolute inset-0" />
              <div className="w-28 h-28 rounded-full bg-[#202c33] border-2 border-[#00a884] flex items-center justify-center text-4xl font-bold overflow-hidden shadow-xl relative z-10">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={targetName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{targetName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {targetName}
              </h2>
              <p className="text-sm text-[#00a884] font-medium mt-1">
                Incoming {callData?.isVideo ? "video" : "voice"} call...
              </p>
            </div>
          </div>
        )}

        {/* Outgoing Ringing Screen */}
        {currentCallState === "calling" && (
          <div className="flex flex-col items-center gap-5 text-white z-10 px-4 text-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#2a3942]/60 flex items-center justify-center animate-pulse" />
              <div className="w-28 h-28 rounded-full bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-4xl font-bold overflow-hidden shadow-xl absolute inset-0 m-auto">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={targetName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{targetName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {targetName}
              </h2>
              <p className="text-sm text-[#8696a0] animate-pulse mt-1">
                Ringing...
              </p>
            </div>
          </div>
        )}

        {/* Remote Video Stream (For Active Video Calls) */}
        {currentCallState === "active" && callData?.isVideo && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        )}

        {/* Voice Call Active Avatar Centerpiece */}
        {currentCallState === "active" && !callData?.isVideo && (
          <div className="flex flex-col items-center justify-center gap-4 text-white z-10">
            <div className="w-32 h-32 rounded-full bg-[#202c33] border-4 border-[#00a884]/40 flex items-center justify-center text-5xl font-bold shadow-2xl overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={targetName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{targetName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <h3 className="text-2xl font-medium tracking-tight">{targetName}</h3>
            <p className="text-[#00a884] font-mono text-sm tracking-widest font-semibold">
              {formatDuration(callDuration)}
            </p>
          </div>
        )}

        {/* Local Video Picture-in-Picture (For Video Calls) */}
        {(currentCallState === "active" || currentCallState === "calling") &&
          callData?.isVideo && (
            <div className="absolute bottom-5 right-5 w-28 h-40 sm:w-36 sm:h-52 bg-black rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 z-20">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-[#202c33] flex items-center justify-center text-xs text-[#8696a0]">
                  Camera off
                </div>
              )}
            </div>
          )}
      </div>

      {/* Floating Bottom Control Actions */}
      <div className="mt-6 flex items-center justify-center gap-5 z-20">
        {currentCallState === "incoming" ? (
          <>
            <button
              type="button"
              onClick={handleReject}
              className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer"
              title="Decline"
            >
              <PhoneOff size={28} />
            </button>
            <button
              type="button"
              onClick={handleAccept}
              className="w-16 h-16 rounded-full bg-[#00a884] hover:bg-[#008f72] text-white flex items-center justify-center shadow-lg shadow-[#00a884]/30 transition-transform active:scale-95 cursor-pointer animate-bounce"
              title="Accept"
            >
              {callData?.isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer ${
                isMuted
                  ? "bg-red-600/80 hover:bg-red-600"
                  : "bg-[#202c33] hover:bg-[#2a3942]"
              } border border-white/10`}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>

            {callData?.isVideo && (
              <button
                type="button"
                onClick={toggleVideo}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer ${
                  isVideoOff
                    ? "bg-red-600/80 hover:bg-red-600"
                    : "bg-[#202c33] hover:bg-[#2a3942]"
                } border border-white/10`}
                title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
              >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            )}

            <button
              type="button"
              onClick={handleHangup}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-transform active:scale-95 cursor-pointer"
              title="End Call"
            >
              <PhoneOff size={26} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallModal;
