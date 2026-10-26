import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Music, Disc } from 'lucide-react';

export function FloatingMusicPlayer({ musicData, autoPlayTrigger }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  // Find active track url
  const activeUrl = musicData?.customTrackUrl || 
    musicData?.presetTracks?.find(t => t.id === musicData.activeTrackId)?.url || 
    'https://cdn.pixabay.com/download/audio/2022/05/16/audio_c976ccb635.mp3?filename=romantic-piano-112199.mp3';

  const activeTitle = musicData?.customTrackName || 
    musicData?.presetTracks?.find(t => t.id === musicData.activeTrackId)?.title || 
    'Giai điệu tình yêu';

  // Autoplay triggered when user opens envelope
  useEffect(() => {
    if (autoPlayTrigger && audioRef.current && musicData?.enabled) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => {
          console.log('Autoplay was prevented by browser policy until interaction:', err);
        });
    }
  }, [autoPlayTrigger, musicData?.enabled]);

  // Update track if URL changes
  useEffect(() => {
    if (audioRef.current) {
      const wasPlaying = isPlaying;
      audioRef.current.src = activeUrl;
      audioRef.current.load();
      if (wasPlaying && musicData?.enabled) {
        audioRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    }
  }, [activeUrl, musicData?.enabled]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log('Audio playback error:', e));
    }
  };

  if (!musicData?.enabled) return null;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2">
      <audio ref={audioRef} src={activeUrl} loop preload="auto" />

      {/* Floating Vinyl Player Pill */}
      <button
        onClick={togglePlay}
        className={`relative flex items-center gap-2 p-2 sm:px-3 sm:py-2 rounded-full shadow-2xl backdrop-blur-md border transition-all duration-300 ${
          isPlaying
            ? 'bg-rose-900/90 border-rose-500/50 text-white shadow-rose-900/40'
            : 'bg-stone-900/80 border-stone-700/60 text-stone-300'
        }`}
        title={isPlaying ? `Đang phát: ${activeTitle} (Click để tắt)` : 'Click để bật nhạc cưới'}
      >
        {/* Spinning Vinyl Record Icon */}
        <div className={`w-8 h-8 rounded-full bg-stone-950 border border-amber-400/60 flex items-center justify-center shadow-inner ${isPlaying ? 'animate-spin-slow' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
        </div>

        {/* Text Title (Desktop view) */}
        <div className="hidden sm:flex flex-col text-left pr-1 max-w-[140px]">
          <span className="text-[10px] font-sans-clean uppercase tracking-wider text-amber-300 font-semibold truncate">
            {isPlaying ? 'Đang phát' : 'Nhạc nền'}
          </span>
          <span className="text-xs font-serif-elegant font-medium text-stone-100 truncate">
            {activeTitle}
          </span>
        </div>

        {/* Volume Icon */}
        <div className="p-1 rounded-full bg-white/10">
          {isPlaying ? (
            <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
          ) : (
            <VolumeX className="w-4 h-4 text-stone-400" />
          )}
        </div>
      </button>
    </div>
  );
}
