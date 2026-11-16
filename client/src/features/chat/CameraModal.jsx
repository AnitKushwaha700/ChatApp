import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  X,
  RotateCcw,
  Send,
  SwitchCamera,
  AlertCircle,
  Upload,
  RefreshCw,
  Sparkles,
} from "lucide-react";

const CameraModal = ({ isOpen, onClose, onCapture }) => {
  const [capturedImage, setCapturedImage] = useState(null); // { url, blob }
  const [caption, setCaption] = useState("");
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [facingMode, setFacingMode] = useState("user"); // "user" or "environment"
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fallbackInputRef = useRef(null);

  // Stop camera tracks cleanly
  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (err) {
        console.warn("Error stopping camera tracks:", err);
      }
      streamRef.current = null;
    }
  }, []);

  // Attach stream to video element safely
  const attachStreamToVideo = useCallback((videoEl, stream) => {
    if (!videoEl || !stream) return;
    try {
      videoEl.srcObject = stream;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute("playsinline", "true");
      videoEl.setAttribute("autoplay", "true");
      videoEl.setAttribute("muted", "true");

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsLoading(false);
          })
          .catch((e) => {
            console.warn("Video play error (retry on metadata):", e);
            videoEl.onloadedmetadata = () => {
              videoEl.play().catch(() => {});
              setIsLoading(false);
            };
          });
      }
    } catch (err) {
      console.warn("attachStream error:", err);
      setIsLoading(false);
    }
  }, []);

  // Check if multiple camera devices exist
  const checkDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      setHasMultipleCameras(videoDevices.length > 1);
    } catch {
      // Ignore device enumeration issues
    }
  }, []);

  // Start webcam feed with fallback constraint
  const startCamera = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    stopTracks();

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      let mediaStream = null;

      // Attempt 1: with ideal facingMode and resolution
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        console.warn(
          "Ideal camera constraints failed, attempting fallback { video: true }",
          firstErr
        );
        // Attempt 2: fallback to basic video constraint
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;

      if (videoRef.current) {
        attachStreamToVideo(videoRef.current, mediaStream);
      }

      checkDevices();
    } catch (err) {
      console.warn("Camera access failed:", err);
      setIsLoading(false);
      let msg = "Could not access your camera.";
      if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        msg =
          "Camera permission was denied. Please allow camera access in your browser address bar.";
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        msg = "No camera was detected on this device.";
      } else if (err.name === "NotReadableError") {
        msg = "Camera is currently in use by another app or browser tab.";
      } else if (err.message) {
        msg = err.message;
      }
      setError(msg);
    }
  }, [facingMode, stopTracks, checkDevices, attachStreamToVideo]);

  // Main lifecycle: start camera when modal opens, stop when closes
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
      setCapturedImage(null);
      setCaption("");
      setError(null);
      setIsLoading(true);
    }

    return () => {
      stopTracks();
    };
  }, [isOpen, startCamera, stopTracks]);

  // Callback ref for video element ensures immediate stream binding upon DOM insertion
  const setVideoElement = useCallback(
    (node) => {
      videoRef.current = node;
      if (node && streamRef.current) {
        attachStreamToVideo(node, streamRef.current);
      }
    },
    [attachStreamToVideo]
  );

  // Keyboard shortcut listener (ESC to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    stopTracks();
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setCaption("");
    setError(null);
    setIsLoading(true);
    onClose();
  };

  // Flip between front and rear cameras
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Snap photo from video feed
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsCapturing(true);

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (facingMode === "user") {
      // Mirror horizontally for natural front camera selfie
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        setIsCapturing(false);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedImage({ url, blob });
          stopTracks();
        }
      },
      "image/jpeg",
      0.92
    );
  };

  // Retake photo: discard captured snapshot and restart camera
  const handleRetake = () => {
    if (capturedImage?.url) {
      URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
    setCaption("");
    startCamera();
  };

  // Send photo
  const handleSend = () => {
    if (!capturedImage?.blob) return;
    const file = new File(
      [capturedImage.blob],
      `camera_${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    if (onCapture) {
      onCapture(file, caption.trim());
    }

    handleClose();
  };

  // Fallback file input change
  const handleFallbackFile = (e) => {
    const file = e.target.files?.[0];
    if (file && onCapture) {
      onCapture(file, "");
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Hidden off-screen canvas for capturing photo frames */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden fallback file input */}
      <input
        type="file"
        ref={fallbackInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFallbackFile}
      />

      <div className="relative w-full max-w-xl bg-base-100 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-base-content/15 flex flex-col">
        {/* Header bar */}
        <div className="h-14 px-4 bg-base-200/80 backdrop-blur-md flex items-center justify-between border-b border-base-content/10 shrink-0 text-base-content">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
              <Camera size={18} />
            </div>
            <h3 className="font-bold text-sm sm:text-base">
              {capturedImage ? "Photo Preview" : "Take Photo"}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Upload Button */}
            {!capturedImage && (
              <button
                type="button"
                onClick={() => fallbackInputRef.current?.click()}
                className="px-2.5 py-1.5 rounded-xl bg-base-300 hover:bg-base-content/10 text-base-content font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Upload image from files"
              >
                <Upload size={14} />
                <span className="hidden xs:inline">Choose File</span>
              </button>
            )}

            {/* Switch Camera Button */}
            {!capturedImage && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="p-2 rounded-xl hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors cursor-pointer"
                title="Switch Camera (Front/Back)"
              >
                <SwitchCamera size={18} />
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Viewfinder / Preview Body */}
        <div className="relative bg-black w-full h-[380px] sm:h-[460px] flex items-center justify-center overflow-hidden select-none">
          {error ? (
            <div className="p-6 text-center max-w-md flex flex-col items-center gap-4 text-white">
              <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
                <AlertCircle size={32} />
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{error}</p>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-xl transition-colors cursor-pointer text-white flex items-center gap-2"
                >
                  <RefreshCw size={15} />
                  <span>Retry Camera</span>
                </button>
                <button
                  type="button"
                  onClick={() => fallbackInputRef.current?.click()}
                  className="px-4 py-2 bg-[#04BC66] hover:bg-[#03A85B] text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-md"
                >
                  <Upload size={15} />
                  <span>Choose File</span>
                </button>
              </div>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <img
                src={capturedImage.url}
                alt="Captured Snapshot"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* Spinner while video is connecting */}
              {isLoading && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/90 text-white">
                  <span className="loading loading-spinner loading-lg text-[#04BC66]"></span>
                  <span className="text-xs sm:text-sm text-gray-300 animate-pulse">
                    Connecting to camera...
                  </span>
                </div>
              )}

              {/* Live Video Feed */}
              <video
                ref={setVideoElement}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />

              {/* Status Hint overlay */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live Camera</span>
              </div>

              {/* Shutter Button Overlay anchored at bottom */}
              <div className="absolute bottom-5 inset-x-0 flex items-center justify-center z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  disabled={isCapturing || isLoading}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-4 border-white p-1 hover:scale-105 active:scale-95 transition-all shadow-2xl cursor-pointer focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed bg-white/20 backdrop-blur-xs flex items-center justify-center"
                  title="Take Photo"
                >
                  <div className="w-full h-full rounded-full bg-white hover:bg-gray-100 active:bg-gray-300 transition-colors shadow-inner" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer: Caption and Send (when photo is captured) */}
        {capturedImage && (
          <div className="p-3 bg-base-200/90 border-t border-base-content/10 flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleRetake}
              className="p-2.5 rounded-xl hover:bg-base-300 text-base-content/70 hover:text-base-content transition-colors cursor-pointer shrink-0"
              title="Retake Photo"
            >
              <RotateCcw size={18} />
            </button>

            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Add a caption..."
              className="flex-1 bg-base-100 text-base-content placeholder-base-content/50 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-base-content/10 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />

            <button
              type="button"
              onClick={handleSend}
              className="w-10 h-10 rounded-xl bg-[#04BC66] hover:bg-[#03A85B] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform cursor-pointer shrink-0"
              title="Send Photo"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraModal;
