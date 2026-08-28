import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, X, Film } from 'lucide-react';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinished?: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, onFinished }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    if (onFinished) {
      onFinished();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-4xl rounded-2xl sm:rounded-3xl bg-zinc-950 border border-amber-500/40 shadow-2xl shadow-amber-500/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 sm:px-6 border-b border-amber-500/20 bg-black/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border border-amber-500/40 p-0.5 bg-black shrink-0">
              <img
                src="/blog-logo.webp"
                alt="Written in the Genome Logo"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div>
              <h3 className="text-xs sm:text-base font-bold text-white font-sans flex items-center gap-1.5 sm:gap-2">
                <span>Ethereal Genomic Merge</span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  WRITTEN IN THE GENOME
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-amber-400/80 truncate">Ethereal_concept_art_style_Tw.mp4</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="min-h-[40px] px-3 sm:px-4 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all flex items-center gap-1.5 touch-manipulation active:scale-95"
            >
              <span>View Results</span>
              <X className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            src="/Ethereal_concept_art_style_Tw.mp4"
            className="w-full h-full object-contain"
            playsInline
            onEnded={handleEnded}
            onClick={togglePlay}
          />

          {/* Controls Bar Overlay */}
          <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 p-2.5 sm:p-3 rounded-2xl bg-black/80 backdrop-blur-md border border-amber-500/30 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors touch-manipulation active:scale-95"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={toggleMute}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 transition-colors touch-manipulation active:scale-95"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-amber-300">
              <Film className="w-4 h-4 text-amber-400" />
              <span>Playing Ethereal Visualizer</span>
            </div>

            <button
              onClick={onClose}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/30 hover:brightness-110 transition-all touch-manipulation active:scale-95"
            >
              Skip to SuperKit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
