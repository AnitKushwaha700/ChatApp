import React, { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff } from "lucide-react";
import socketAPI from "../../lib/webSocket";
import { useAuth } from "../auth/AuthContext";

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
  const [callStatus, setCallStatus] = useState(incomingCall ? "incoming" : "calling"); // incoming, calling, active
  const [peerConnection, setPeerConnection] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const candidatesQueueRef = useRef([]);
  const initiatedCallIdRef = useRef(null);
  
  const callDataRef = useRef(callData);
  useEffect(() => {
    callDataRef.current = callData;
  }, [callData]);

  useEffect(() => {
    // Initialize WebRTC Peer Connection
    const configuration = {
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    };
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;
    setPeerConnection(pc);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketAPI.emit("iceCandidate", {
          to: callData?.to || callData?.from,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };

    // Socket Event Listeners for WebRTC
    const handleIceCandidate = async ({ candidate }) => {
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        candidatesQueueRef.current.push(candidate);
      }
    };

    const processQueue = async () => {
      while (candidatesQueueRef.current.length > 0) {
        const candidate = candidatesQueueRef.current.shift();
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleCallAccepted = async () => {
      setCallStatus("active");
      const currentCallData = callDataRef.current;
      if (!currentCallData) return;

      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: currentCallData.isVideo,
            audio: true,
          });
        } catch (err) {
          if (err.name === 'NotReadableError' && currentCallData.isVideo) {
            console.warn("Camera in use, falling back to audio only");
            stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            setIsVideoOff(true);
          } else throw err;
        }

        setLocalStream(stream);
        stream.getTracks().forEach((track) => {
          if (pcRef.current && pcRef.current.signalingState !== "closed") {
            pcRef.current.addTrack(track, stream);
          }
        });

        if (pcRef.current && pcRef.current.signalingState !== "closed") {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          
          socketAPI.emit("webrtcOffer", {
            to: currentCallData.to,
            offer,
          });
        }
      } catch (error) {
        console.error("Error starting camera on caller side", error);
        cleanupCall();
        if (onEndCall) onEndCall();
      }
    };

    const handleWebrtcOffer = async ({ offer }) => {
      if (pcRef.current && pcRef.current.signalingState !== "closed") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        processQueue();
        
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);

        const currentCallData = callDataRef.current;
        socketAPI.emit("webrtcAnswer", {
          to: currentCallData.from,
          answer,
        });
      }
    };

    const handleWebrtcAnswer = async ({ answer }) => {
      if (pcRef.current && pcRef.current.signalingState !== "closed") {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        processQueue();
      }
    };

    const handleCallRejected = () => {
      cleanupCall();
      if (onEndCall) onEndCall();
    };

    const handleCallEnded = () => {
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
      cleanupCall();
    };
  }, []);

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    setLocalStream(null);
    setRemoteStream(null);
  };

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

  // Handle Outgoing Call - Send Request Only
  useEffect(() => {
    let isMounted = true;
    if (isCalling && callData && !incomingCall && peerConnection) {
      const currentCallId = callData.to + (callData.isVideo ? "V" : "A");
      if (initiatedCallIdRef.current === currentCallId) return;
      initiatedCallIdRef.current = currentCallId;

      socketAPI.emit("requestCall", {
        userToCall: callData.to,
        from: user._id,
        name: user.fullName || user.email,
        isVideo: callData.isVideo,
      });
    }
    return () => {
      isMounted = false;
    };
  }, [isCalling, callData, incomingCall, peerConnection, user._id]);

  const handleAccept = async () => {
    try {
      setCallStatus("active");
      if (onAcceptCall) onAcceptCall();

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: callData.isVideo,
          audio: true,
        });
      } catch (err) {
        if (err.name === 'NotReadableError' && callData.isVideo) {
          console.warn("Camera in use, falling back to audio only");
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          setIsVideoOff(true);
        } else {
          throw err;
        }
      }

      setLocalStream(stream);
      stream.getTracks().forEach((track) => {
        if (pcRef.current && pcRef.current.signalingState !== "closed") {
          pcRef.current.addTrack(track, stream);
        }
      });

      socketAPI.emit("acceptCall", { to: callData.from });
      
    } catch (error) {
      console.error("Error accepting call", error);
      handleReject();
    }
  };

  const handleReject = () => {
    socketAPI.emit("rejectCall", { to: callData.from });
    cleanupCall();
    if (onRejectCall) onRejectCall();
  };

  const handleHangup = () => {
    socketAPI.emit("endCall", { to: callData?.to || callData?.from });
    cleanupCall();
    onEndCall();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callData.isVideo) {
      localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled;
      setIsVideoOff(!isVideoOff);
    }
  };

  if (!isCalling && !incomingCall && callStatus !== "active") return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-4">
      {/* Remote Video / Status */}
      <div className="relative w-full max-w-4xl h-[60vh] sm:h-[80vh] bg-base-300 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center border border-white/10">
        {callStatus === "incoming" && (
          <div className="flex flex-col items-center gap-4 text-white z-10">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-3xl font-bold">
                {callData?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
            <h2 className="text-2xl font-semibold">{callData?.name} is calling...</h2>
            <p className="text-white/70">{callData?.isVideo ? "Video Call" : "Audio Call"}</p>
          </div>
        )}
        
        {callStatus === "calling" && (
          <div className="flex flex-col items-center gap-4 text-white z-10">
            <div className="w-24 h-24 rounded-full bg-base-100/20 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-base-100/50 flex items-center justify-center text-3xl font-bold">
                {callData?.name?.charAt(0).toUpperCase() || "?"}
              </div>
            </div>
            <h2 className="text-2xl font-semibold">Calling {callData?.name || "..."}</h2>
            <p className="text-white/70 animate-pulse">Ringing...</p>
          </div>
        )}

        {(callStatus === "active" || callData?.isVideo) && (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${callStatus !== "active" ? "hidden" : ""}`}
          />
        )}
        
        {callStatus === "active" && !remoteStream?.getVideoTracks()[0]?.enabled && !callData?.isVideo && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-base-300">
             <div className="w-24 h-24 rounded-full bg-base-100/50 flex items-center justify-center text-3xl font-bold mb-4">
                {callData?.name?.charAt(0).toUpperCase() || "?"}
             </div>
             <p>Voice Call in Progress</p>
           </div>
        )}

        {/* Local Video Mini-viewer */}
        {(callStatus === "active" || callStatus === "calling") && callData?.isVideo && (
          <div className="absolute bottom-6 right-6 w-24 h-36 sm:w-32 sm:h-48 bg-black rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-6">
        {callStatus === "incoming" ? (
          <>
            <button onClick={handleReject} className="btn btn-error btn-circle btn-lg text-white shadow-lg shadow-error/30 animate-in slide-in-from-bottom">
              <PhoneOff size={28} />
            </button>
            <button onClick={handleAccept} className="btn btn-success btn-circle btn-lg text-white shadow-lg shadow-success/30 animate-in slide-in-from-bottom" style={{ animationDelay: "100ms" }}>
              {callData?.isVideo ? <Video size={28} /> : <Phone size={28} />}
            </button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} className={`btn btn-circle btn-lg text-white shadow-lg ${isMuted ? "bg-white/20" : "bg-white/10 hover:bg-white/20"} border-none`}>
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
            </button>
            {callData?.isVideo && (
              <button onClick={toggleVideo} className={`btn btn-circle btn-lg text-white shadow-lg ${isVideoOff ? "bg-white/20" : "bg-white/10 hover:bg-white/20"} border-none`}>
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            )}
            <button onClick={handleHangup} className="btn btn-error btn-circle btn-lg text-white shadow-lg shadow-error/30">
              <PhoneOff size={28} />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallModal;
