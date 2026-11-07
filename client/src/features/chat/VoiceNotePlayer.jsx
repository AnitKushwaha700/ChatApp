import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Mic } from "lucide-react";

const VoiceNotePlayer = ({ src, isMe }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const cycleSpeed = () => {
    if (!audioRef.current) return;
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    audioRef.current.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    audioRef.current.currentTime = pct * duration;
    setCurrentTime(pct * duration);
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Waveform bars simulation
  const barCount = 28;
  const barHeights = [
    25, 45, 75, 30, 60, 90, 40, 20, 65, 85, 40, 70, 95, 50, 30, 80, 60, 40,
    90, 70, 35, 60, 85, 40, 20, 50, 75, 30,
  ];

  return (
    <div className="flex items-center gap-3 py-1 px-1 min-w-[240px] sm:min-w-[270px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Mic Avatar */}
      <div className="relative shrink-0">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs ${
            isMe
              ? "bg-[#00a884] text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          <Mic size={18} />
        </div>
      </div>

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer border-none shadow-xs ${
          isMe
            ? "bg-[#00a884] hover:bg-[#008f6f] text-white"
            : "bg-[#00a884] hover:bg-[#008f6f] text-white"
        }`}
      >
        {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" className="ml-0.5" />}
      </button>

      {/* Waveform Scrubber & Duration */}
      <div className="flex-1 flex flex-col justify-center gap-1">
        <div
          onClick={handleSeek}
          className="h-7 flex items-center gap-[2.5px] cursor-pointer relative"
          title="Click to seek"
        >
          {barHeights.slice(0, barCount).map((h, i) => {
            const barPct = (i / barCount) * 100;
            const isFilled = barPct <= progressPct;
            return (
              <span
                key={i}
                style={{ height: `${h}%` }}
                className={`w-[2.5px] rounded-full transition-colors duration-150 ${
                  isFilled
                    ? "bg-[#00a884]"
                    : isMe
                      ? "bg-black/25 dark:bg-white/30"
                      : "bg-black/20 dark:bg-white/20"
                }`}
              />
            );
          })}
        </div>

        <div className="flex items-center justify-between text-[11px] opacity-75 font-mono select-none">
          <span>{formatTime(isPlaying ? currentTime : duration || 0)}</span>
          <button
            type="button"
            onClick={cycleSpeed}
            className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:hover:bg-white/20 transition-colors border-none cursor-pointer"
          >
            {playbackRate}x
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceNotePlayer;
