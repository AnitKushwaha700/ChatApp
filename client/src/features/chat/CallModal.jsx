import React, { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Maximize2, Minimize2 } from "lucide-react";
import socketAPI from "../../lib/webSocket";
import api from "../../lib/api";
import { useAuth } from "../auth/AuthContext";
import { callSounds } from "../../utils/callSounds";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const CallModal = ({
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
  const [callStatus, setCallStatus] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const candidatesQueueRef = useRef([]);
  const initiatedCallIdRef = useRef(null);
  const durationTimerRef = useRef(null);
  const callDurationRef = useRef(0);
  const callStatusRef = useRef("");

  const callDataRef = useRef(callData);
  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  useEffect(() => {
    callDurationRef.current = callDuration;
  }, [callDuration]);

  useEffect(() => {
    callStatusRef.current = callStatus;
  }, [callStatus]);

  // Record call log to backend
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

  // Sync incoming / calling state and sounds
  useEffect(() => {
    if (incomingCall) {
      setCallStatus("incoming");
      callSounds.playIncomingRingtone();
    } else if (isCalling) {
      setCallStatus("calling");
      callSounds.playOutgoingRingback();
    } else {
      setCallStatus("");
      callSounds.stop();
    }

    return () => {
      callSounds.stop();
    };
  }, [incomingCall, isCalling]);

  // Duration timer when active
  useEffect(() => {
    if (callStatus === "active") {
      callSounds.stop();
      setCallDuration(0);
      durationTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    }

    return () => {
      if (durationTimerRef.current) {
        clearInterval(durationTimerRef.current);
        durationTimerRef.current = null;
      }
    };
  }, [callStatus]);

  const processIceQueue = async (pc) => {
    while (candidatesQueueRef.current.length > 0) {
      const candidate = candidatesQueueRef.current.shift();
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("Error adding queued ice candidate", e);
      }
    }
  };

  const getMedia = async (isVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideo,
        audio: true,
      });
      return stream;
    } catch (err) {
      if (err.name === "NotReadableError" && isVideo) {
        console.warn("Camera in use, falling back to audio only");
        setIsVideoOff(true);
        return await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      } else {
        throw err;
      }
    }
  };

  const createPeerConnection = () => {
    if (pcRef.current) pcRef.current.close();
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const currentData = callDataRef.current;
        if (currentData) {
          socketAPI.emit("iceCandidate", {
            to: currentData.to || currentData.from,
            candidate: event.candidate,
          });
        }
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    pcRef.current = pc;
    return pc;
  };

  const cleanupCall = useCallback(() => {
    callSounds.stop();
    setLocalStream((prevStream) => {
      if (prevStream) {
        prevStream.getTracks().forEach((track) => track.stop());
      }
      return null;
    });
    setRemoteStream(null);
    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    candidatesQueueRef.current = [];
    initiatedCallIdRef.current = null;
    setCallStatus("");
    setIsMuted(false);
    setIsVideoOff(false);
  }, []);

  const handleHangup = useCallback(() => {
    const prevStatus = callStatusRef.current;
    const currentDur = callDurationRef.current;

    callSounds.playEndCallTone();
    socketAPI.emit("endCall", { to: callData?.to || callData?.from });

    // Save call log
    if (prevStatus === "active") {
      saveCallLog("completed", currentDur);
    } else if (prevStatus === "calling") {
      saveCallLog("missed", 0);
    }

    cleanupCall();
    if (onEndCall) onEndCall();
  }, [callData, cleanupCall, onEndCall, saveCallLog]);

  useEffect(() => {
    const handleCallAccepted = async () => {
      setCallStatus("active");
      const currentCallData = callDataRef.current;
      if (!currentCallData) return;

      try {
        const stream = await getMedia(currentCallData.isVideo);
        setLocalStream(stream);

        const pc = createPeerConnection();
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socketAPI.emit("webrtcOffer", {
          to: currentCallData.to,
          offer,
        });
      } catch (error) {
        console.error("Error starting camera on caller side", error);
        handleHangup();
      }
    };

    const handleWebrtcOffer = async ({ offer }) => {
      const currentCallData = callDataRef.current;
      if (!currentCallData) return;

      const pc = pcRef.current;
      if (!pc) {
        console.error("Peer connection not initialized on receiver");
        return;
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await processIceQueue(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socketAPI.emit("webrtcAnswer", {
          to: currentCallData.from,
          answer,
        });
      } catch (e) {
        console.error("Error handling WebRTC offer:", e);
      }
    };

    const handleWebrtcAnswer = async ({ answer }) => {
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          await processIceQueue(pc);
        } catch (e) {
          console.error("Error handling WebRTC answer:", e);
        }
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ICE candidate:", e);
        }
      } else {
        candidatesQueueRef.current.push(candidate);
      }
    };

    const handleCallRejected = () => {
      callSounds.playEndCallTone();
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    const handleCallEnded = () => {
      callSounds.playEndCallTone();
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    socketAPI.on("callAccepted", handleCallAccepted);
    socketAPI.on("webrtcOffer", handleWebrtcOffer);
    socketAPI.on("webrtcAnswer", handleWebrtcAnswer);
    socketAPI.on("iceCandidate", handleIceCandidate);
    socketAPI.on("callRejected", handleCallRejected);
    socketAPI.on("callEnded", handleCallEnded);

    return () => {
      socketAPI.off("callAccepted", handleCallAccepted);
      socketAPI.off("webrtcOffer", handleWebrtcOffer);
      socketAPI.off("webrtcAnswer", handleWebrtcAnswer);
      socketAPI.off("iceCandidate", handleIceCandidate);
      socketAPI.off("callRejected", handleCallRejected);
      socketAPI.off("callEnded", handleCallEnded);
    };
  }, [cleanupCall, handleHangup, onEndCall]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  // Handle Outgoing Call - Send Request
  useEffect(() => {
    if (isCalling && callData && !incomingCall) {
      const currentCallId = callData.to + (callData.isVideo ? "V" : "A");
      if (initiatedCallIdRef.current === currentCallId) return;
      initiatedCallIdRef.current = currentCallId;

      socketAPI.emit("requestCall", {
        userToCall: callData.to,
        from: user._id,
        name: user.fullName || user.email,
        isVideo: callData.isVideo,
        avatar: user.profilePic || "",
      });
    }
  }, [isCalling, callData, incomingCall, user._id, user.fullName, user.email, user.profilePic]);

  const handleAccept = async () => {
    try {
      callSounds.stop();
      setCallStatus("active");
      if (onAcceptCall) onAcceptCall();

      const stream = await getMedia(callData.isVideo);
      setLocalStream(stream);

      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      socketAPI.emit("acceptCall", { to: callData.from });
    } catch (error) {
      console.error("Error accepting call", error);
      handleReject();
    }
  };

  const handleReject = () => {
    callSounds.playEndCallTone();
    socketAPI.emit("rejectCall", { to: callData.from });
    saveCallLog("rejected", 0);
    cleanupCall();
    if (onRejectCall) onRejectCall();
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream && callData.isVideo) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  if (!isCalling && !incomingCall && callStatus !== "active") return null;

  const targetName = callData?.name || "WhatsApp Contact";
  const avatarUrl = callData?.avatar?.startsWith("http")
    ? callData.avatar
    : callData?.avatar
    ? `${api.defaults.baseURL || ""}${callData.avatar}`
    : null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Remote Video / Status Card */}
      <div
        className={`relative w-full ${
          isFullscreen ? "max-w-none h-full" : "max-w-4xl h-[65vh] sm:h-[80vh]"
        } bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-[#2a3942] transition-all`}
      >
        {/* Top Floating Header with Call Timer & Type */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center gap-2 bg-[#202c33]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2a3942]/60 text-white text-xs font-medium shadow-md">
            <span
              className={`w-2 h-2 rounded-full ${
                callStatus === "active" ? "bg-[#00a884] animate-pulse" : "bg-amber-400"
              }`}
            />
            <span>{callData?.isVideo ? "Video Call" : "Voice Call"}</span>
            {callStatus === "active" && (
              <>
                <span className="text-[#8696a0]">•</span>
                <span className="font-mono text-emerald-400">{formatDuration(callDuration)}</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-full bg-[#202c33]/80 backdrop-blur-md hover:bg-[#2a3942] text-[#8696a0] hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>

        {/* Incoming Call Screen */}
        {callStatus === "incoming" && (
          <div className="flex flex-col items-center gap-5 text-white z-10 px-4 text-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#00a884]/20 flex items-center justify-center animate-ping absolute inset-0" />
              <div className="w-28 h-28 rounded-full bg-[#202c33] border-2 border-[#00a884] flex items-center justify-center text-4xl font-bold overflow-hidden shadow-xl relative z-10">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={targetName} className="w-full h-full object-cover" />
                ) : (
                  <span>{targetName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{targetName}</h2>
              <p className="text-sm text-[#00a884] font-medium mt-1">
                Incoming {callData?.isVideo ? "video" : "voice"} call...
              </p>
            </div>
          </div>
        )}

        {/* Outgoing Ringing Screen */}
        {callStatus === "calling" && (
          <div className="flex flex-col items-center gap-5 text-white z-10 px-4 text-center">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-[#2a3942]/60 flex items-center justify-center animate-pulse" />
              <div className="w-28 h-28 rounded-full bg-[#202c33] border border-[#2a3942] flex items-center justify-center text-4xl font-bold overflow-hidden shadow-xl absolute inset-0 m-auto">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={targetName} className="w-full h-full object-cover" />
                ) : (
                  <span>{targetName.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{targetName}</h2>
              <p className="text-sm text-[#8696a0] animate-pulse mt-1">Ringing...</p>
            </div>
          </div>
        )}

        {/* Remote Video Stream (For Video Calls) */}
        {(callStatus === "active" || callData?.isVideo) && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${callStatus !== "active" ? "hidden" : ""}`}
          />
        )}

        {/* Voice Call Active Avatar Centerpiece */}
        {callStatus === "active" && !callData?.isVideo && (
          <div className="flex flex-col items-center justify-center gap-4 text-white z-10">
            <div className="w-32 h-32 rounded-full bg-[#202c33] border-4 border-[#00a884]/40 flex items-center justify-center text-5xl font-bold shadow-2xl overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={targetName} className="w-full h-full object-cover" />
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

        {/* Local Video Picture-in-Picture */}
        {(callStatus === "active" || callStatus === "calling") && callData?.isVideo && (
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
        {callStatus === "incoming" ? (
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
                isMuted ? "bg-red-600/80 hover:bg-red-600" : "bg-[#202c33] hover:bg-[#2a3942]"
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
                  isVideoOff ? "bg-red-600/80 hover:bg-red-600" : "bg-[#202c33] hover:bg-[#2a3942]"
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
