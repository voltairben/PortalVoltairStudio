"use client";

import {
  ChevronLeft,
  ChevronRight,
  Gauge,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { timecode } from "@/lib/format";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 1, 1.5, 2] as const;

export function VideoPlayer({
  src,
  poster,
  fps = 24,
}: {
  src: string;
  poster?: string;
  fps?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const frame = 1 / fps;

  const seekBy = useCallback((delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(Math.max(0, v.currentTime + delta), v.duration || 0);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const nudgeControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 2600);
  }, []);

  // keyboard: space/k = play, ←/→ = step frame, shift+←/→ = ±10 frames, ↑/↓ = volume, f = fullscreen, m = mute
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-(e.shiftKey ? frame * 10 : frame));
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(e.shiftKey ? frame * 10 : frame);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeSafe(volume + 0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeSafe(volume - 0.1);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "m":
          setMuted((m) => !m);
          break;
      }
      nudgeControls();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [frame, volume, togglePlay, seekBy, nudgeControls]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.playbackRate = speed;
      v.volume = volume;
      v.muted = muted;
    }
  }, [speed, volume, muted]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function setVolumeSafe(next: number) {
    const clamped = Math.min(1, Math.max(0, Number(next.toFixed(2))));
    setVolume(clamped);
    setMuted(clamped === 0);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void wrapRef.current?.requestFullscreen();
  }

  function onScrub(e: React.PointerEvent<HTMLDivElement>) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const v = videoRef.current;
    if (v && duration) v.currentTime = ratio * duration;
  }

  const progress = duration ? (current / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onMouseMove={nudgeControls}
      onPointerLeave={() => playing && setControlsVisible(false)}
      className={cn(
        "group relative aspect-video w-full select-none overflow-hidden rounded-xl border border-zinc-800 bg-black outline-none",
        !controlsVisible && playing && "cursor-none",
      )}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        playsInline
        className="size-full object-contain"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          nudgeControls();
        }}
        onPause={() => {
          setPlaying(false);
          setControlsVisible(true);
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onProgress={(e) => {
          const v = e.currentTarget;
          if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
        }}
      />

      {/* Center play overlay */}
      {!playing && (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="absolute inset-0 grid place-items-center bg-gradient-to-t from-black/40 to-transparent"
        >
          <span className="grid size-16 place-items-center rounded-full bg-brand-persimmon text-brand-persimmon-fg shadow-[0_0_40px_-4px_rgba(255,79,0,0.6)]">
            <Play className="ml-0.5 size-7" fill="currentColor" />
          </span>
        </button>
      )}

      {/* Control bar */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-3 pb-2.5 pt-8 transition-opacity duration-200",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        {/* Scrub bar */}
        <div
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          tabIndex={0}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            onScrub(e);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && onScrub(e)}
          className="group/scrub relative flex h-4 cursor-pointer items-center"
        >
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
            <div className="absolute left-0 h-1 rounded-full bg-white/20" style={{ width: `${bufferedPct}%` }} />
            <div className="absolute left-0 h-1 rounded-full bg-brand-persimmon" style={{ width: `${progress}%` }} />
          </div>
          <span
            className="absolute size-3 -translate-x-1/2 rounded-full bg-brand-persimmon opacity-0 shadow transition-opacity group-hover/scrub:opacity-100"
            style={{ left: `${progress}%` }}
          />
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-ink">
          <IconButton label={playing ? "Pause" : "Play"} onClick={togglePlay}>
            {playing ? <Pause className="size-[18px]" fill="currentColor" /> : <Play className="size-[18px]" fill="currentColor" />}
          </IconButton>
          <IconButton label="Previous frame" onClick={() => seekBy(-frame)}>
            <ChevronLeft className="size-[18px]" />
          </IconButton>
          <IconButton label="Next frame" onClick={() => seekBy(frame)}>
            <ChevronRight className="size-[18px]" />
          </IconButton>

          <span className="tnum mx-1.5 font-mono text-[11px] text-ink-muted">
            {timecode(current)} <span className="text-ink-subtle">/ {timecode(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* volume */}
            <div className="group/vol flex items-center">
              <IconButton
                label={muted || volume === 0 ? "Unmute" : "Mute"}
                onClick={() => setMuted((m) => !m)}
              >
                {muted || volume === 0 ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
              </IconButton>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                aria-label="Volume"
                onChange={(e) => setVolumeSafe(Number(e.target.value))}
                className="h-1 w-0 cursor-pointer appearance-none rounded-full bg-white/20 opacity-0 transition-all duration-200 group-hover/vol:w-16 group-hover/vol:opacity-100 [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-persimmon"
              />
            </div>

            {/* speed */}
            <div className="relative">
              <IconButton label="Playback speed" onClick={() => setSpeedOpen((o) => !o)}>
                <span className="flex items-center gap-1">
                  <Gauge className="size-[18px]" />
                  <span className="tnum font-mono text-[11px]">{speed}x</span>
                </span>
              </IconButton>
              {speedOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-20 overflow-hidden rounded-lg border border-zinc-700 bg-surface-1 py-1 shadow-xl">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSpeed(s);
                        setSpeedOpen(false);
                      }}
                      className={cn(
                        "tnum block w-full px-3 py-1 text-left font-mono text-[12px]",
                        s === speed ? "text-brand-persimmon" : "text-ink-muted hover:text-ink",
                      )}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            <IconButton label="Fullscreen" onClick={toggleFullscreen}>
              {fullscreen ? <Minimize className="size-[18px]" /> : <Maximize className="size-[18px]" />}
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-md text-ink transition-colors hover:bg-white/10 hover:text-brand-persimmon"
    >
      {children}
    </button>
  );
}
