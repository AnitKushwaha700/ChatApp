import { useState, useRef, useEffect } from "react";
import {
  X,
  Image as ImageIcon,
  Send,
  Plus,
  Mic,
  FileText,
  Music,
  StopCircle,
  Smile,
  Reply,
  Pencil,
  Ban,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import socketAPI from "../../lib/webSocket";

const MessageInput = ({
  chat,
  replyTo,
  clearReply,
  editTarget,
  clearEdit,
  onSendText,
  onSendFile,
  onEditText,
  disabled,
  disabledReason,
}) => {
  const [message, setMessage] = useState("");
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const attachmentRef = useRef(null);
  const inputRef = useRef(null);

  const isGroup = chat?.chatType === "group";
  const target = isGroup ? { groupId: chat._id } : { to: chat._id };

  // Load edit target text into the input
  useEffect(() => {
    if (editTarget) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(editTarget.message || "");
      inputRef.current?.focus();
    }
  }, [editTarget]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessage("");
  }, [chat?._id]);

  useEffect(() => {
    const close = (e) => {
      if (attachmentRef.current && !attachmentRef.current.contains(e.target)) {
        setIsAttachmentOpen(false);
      }
      if (
        showEmojiPicker &&
        !e.target.closest(".emoji-picker-react") &&
        !e.target.closest("button")
      ) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showEmojiPicker]);

  const emitTyping = (isTyping) => {
    if (!chat) return;
    socketAPI.emit(isTyping ? "typing:start" : "typing:stop", {
      ...target,
      name: chat.name,
    });
  };

  const handleChange = (e) => {
    setMessage(e.target.value);
    if (e.target.value && !isTypingRef.current) {
      isTypingRef.current = true;
      emitTyping(true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, 2000);
  };

  const resetInput = () => {
    setMessage("");
    isTypingRef.current = false;
    clearTimeout(typingTimeoutRef.current);
    emitTyping(false);
    clearReply?.();
    clearEdit?.();
    setShowEmojiPicker(false);
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (disabled || !message.trim()) return;
    if (editTarget) {
      await onEditText(editTarget._id, message.trim());
    } else {
      await onSendText(message.trim(), { replyTo: replyTo?._id });
    }
    resetInput();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    let type = "document";
    if (file.type.startsWith("image/")) type = "image";
    else if (file.type.startsWith("video/")) type = "video";
    else if (file.type.startsWith("audio/")) type = "audio";
    onSendFile(file, type);
    setIsAttachmentOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioFile = new File([audioBlob], "voice-message.webm", {
          type: "audio/webm",
        });
        onSendFile(audioFile, "audio");
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      alert("Microphone access denied or not available.");
    }
  };

  const stopRecording = (cancel = false) => {
    if (mediaRecorderRef.current && isRecording) {
      if (cancel) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stream?.getTracks?.().forEach((t) => t.stop());
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  if (disabled) {
    return (
      <div className="p-4 bg-base-100 border-t border-base-content/10 text-center text-sm text-base-content/60 flex items-center justify-center gap-2">
        <Ban size={16} className="text-error" />
        {disabledReason || "You can't send messages in this chat"}
      </div>
    );
  }

  return (
    <div className="bg-base-100 border-t border-base-content/10 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      {/* Reply / Edit banners */}
      {(replyTo || editTarget) && (
        <div className="mx-3 mt-2 flex items-center gap-2 bg-base-200 border-l-4 border-primary rounded-lg px-3 py-2">
          {editTarget ? <Pencil size={16} className="text-primary shrink-0" /> : <Reply size={16} className="text-primary shrink-0" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              {editTarget ? "Edit message" : `Replying to ${isGroup ? "a message" : chat?.name}`}
            </p>
            <p className="text-xs truncate opacity-70">
              {editTarget?.message || replyTo?.message || "Media message"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearReply?.();
              clearEdit?.();
              if (editTarget) setMessage("");
            }}
            className="btn btn-ghost btn-circle btn-xs"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="p-3">
        <form onSubmit={submit} className="flex items-center gap-1 sm:gap-2 bg-base-200 rounded-full p-1 sm:p-1.5 border border-base-content/10 shadow-sm relative">
          <div className="relative" ref={attachmentRef}>
            <button
              type="button"
              onClick={() => setIsAttachmentOpen(!isAttachmentOpen)}
              className="p-2.5 bg-base-content/10 rounded-full text-base-content/70 hover:text-base-content transition-colors cursor-pointer border-none outline-none"
            >
              <Plus size={20} className={`transition-transform duration-300 ${isAttachmentOpen ? "rotate-45" : ""}`} />
            </button>
            {isAttachmentOpen && (
              <div className="absolute bottom-14 left-0 bg-base-100 border border-base-content/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-1.5 w-56 z-50">
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.accept = "*/*";
                    fileInputRef.current.click();
                  }}
                  className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium"
                >
                  <div className="bg-[#7F66FF] text-white p-2.5 rounded-full shadow-sm">
                    <FileText size={18} />
                  </div>
                  Document
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.accept = "image/*,video/*";
                    fileInputRef.current.click();
                  }}
                  className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium"
                >
                  <div className="bg-[#007BFF] text-white p-2.5 rounded-full shadow-sm">
                    <ImageIcon size={18} />
                  </div>
                  Photo & Video
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current.accept = "audio/*";
                    fileInputRef.current.click();
                  }}
                  className="flex items-center gap-4 hover:bg-base-200 p-2.5 rounded-xl transition-all text-left text-sm font-medium"
                >
                  <div className="bg-[#FF9500] text-white p-2.5 rounded-full shadow-sm">
                    <Music size={18} />
                  </div>
                  Audio
                </button>
              </div>
            )}
            <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-base-content/70 hover:text-base-content transition-colors"
            >
              <Smile size={20} />
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-50 shadow-2xl">
                <EmojiPicker
                  onEmojiClick={(emojiData) => setMessage((prev) => prev + emojiData.emoji)}
                  theme={
                    ["dark", "black"].includes(localStorage.getItem("theme")) ? "dark" : "light"
                  }
                />
              </div>
            )}
          </div>

          {isRecording ? (
            <div className="flex-1 flex items-center gap-3 px-3 text-error animate-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-error" />
              <span className="text-sm font-medium">
                Recording... {Math.floor(recordingTime / 60)}:
                {(recordingTime % 60).toString().padStart(2, "0")}
              </span>
            </div>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleChange}
              placeholder={editTarget ? "Edit your message..." : "Type your message..."}
              className="flex-1 bg-transparent text-base-content outline-none px-3 text-sm placeholder:text-base-content/50"
            />
          )}

          {isRecording ? (
            <div className="flex items-center gap-1 mr-1">
              <button
                type="button"
                onClick={() => stopRecording(true)}
                className="p-2.5 bg-base-300 rounded-full hover:brightness-110 transition-colors"
                aria-label="Cancel recording"
              >
                <X size={18} />
              </button>
              <button
                type="button"
                onClick={() => stopRecording(false)}
                className="p-2.5 bg-error text-error-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center shadow-md shadow-error/20"
              >
                <StopCircle size={18} />
              </button>
            </div>
          ) : message.trim() ? (
            <button
              type="submit"
              className="p-2.5 bg-primary text-primary-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-primary/20"
            >
              <Send size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="p-2.5 bg-success text-success-content rounded-full hover:brightness-110 transition-colors flex items-center justify-center mr-1 shadow-md shadow-success/20"
            >
              <Mic size={18} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
