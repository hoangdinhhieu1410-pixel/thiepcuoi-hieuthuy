import React, { useState, useEffect } from 'react';
import { Camera, ChevronLeft, ChevronRight, X, Maximize2, Sparkles } from 'lucide-react';

export function GallerySection({ gallery = [], effect = 'kenburns' }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  // Auto transition for hero gallery showcase
  useEffect(() => {
    if (!isAutoPlay || gallery.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % gallery.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutoPlay, gallery.length]);

  const nextPhoto = () => {
    setActiveIndex((prev) => (prev + 1) % gallery.length);
  };

  const prevPhoto = () => {
    setActiveIndex((prev) => (prev - 1 + gallery.length) % gallery.length);
  };

  if (!gallery || gallery.length === 0) return null;

  const currentPhoto = gallery[activeIndex] || gallery[0];

  return (
    <section className="py-12 sm:py-16 px-4 max-w-5xl mx-auto">
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2 flex items-center justify-center gap-2">
          <Camera className="w-3.5 h-3.5 text-amber-600" />
          <span>ALBUM ẢNH CƯỚI</span>
        </p>
        <h2 className="text-2xl sm:text-4xl font-serif-elegant font-bold text-stone-900 mb-2">
          Khoảnh Khắc Ngọt Ngào
        </h2>
        <p className="text-sm font-sans-clean text-stone-500">
          Những dấu ấn lưu giữ tình yêu và nụ cười rạng rỡ của chúng mình
        </p>
      </div>

      {/* FEATURED SHOWCASE SLIDER WITH KEN BURNS EFFECT */}
      <div 
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] max-h-[520px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-950 mb-6 group"
        onMouseEnter={() => setIsAutoPlay(false)}
        onMouseLeave={() => setIsAutoPlay(true)}
      >
        {/* Active Image with transition */}
        <div className="relative w-full h-full overflow-hidden">
          <img
            key={currentPhoto.id || activeIndex}
            src={currentPhoto.url}
            alt={currentPhoto.caption || 'Wedding photo'}
            className={`w-full h-full object-cover object-center transition-all duration-1000 ${
              effect === 'kenburns' ? 'animate-kenburns' : 'scale-100'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none"></div>
        </div>

        {/* Caption & Counter */}
        <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between pointer-events-none">
          <p className="text-white text-sm sm:text-base font-serif-elegant italic drop-shadow-md">
            {currentPhoto.caption || 'Khoảnh khắc hạnh phúc'}
          </p>
          <span className="text-xs font-sans-clean font-semibold px-3 py-1 rounded-full bg-black/50 text-amber-300 backdrop-blur-sm border border-white/20">
            {activeIndex + 1} / {gallery.length}
          </span>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevPhoto}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-rose-700/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          title="Ảnh trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextPhoto}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 hover:bg-rose-700/80 text-white flex items-center justify-center backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
          title="Ảnh tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Fullscreen Zoom Trigger */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm transition-all"
          title="Xem ảnh toàn màn hình"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* THUMBNAIL STRIP */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
        {gallery.map((photo, index) => (
          <button
            key={photo.id || index}
            onClick={() => setActiveIndex(index)}
            className={`relative flex-shrink-0 w-20 h-16 sm:w-24 sm:h-18 rounded-xl overflow-hidden border-2 transition-all ${
              activeIndex === index
                ? 'border-rose-600 scale-105 shadow-md ring-2 ring-rose-300'
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
          >
            <img
              src={photo.url}
              alt=""
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxOpen && (
        <div 
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-lg flex flex-col items-center justify-center p-4 select-none"
        >
          {/* Top Bar with Big Close Button */}
          <div className="absolute top-0 inset-x-0 z-[210] flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-black/90 to-transparent">
            <span className="text-white text-xs font-semibold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
              Ảnh {currentPhotoIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xl transition-all border border-white/30 cursor-pointer"
              title="Đóng xem ảnh (Phím Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span>ĐÓNG / THOÁT</span>
            </button>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prevPhoto();
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 transition-all z-[210] border border-white/20 shadow-2xl backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              nextPhoto();
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white p-3 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 transition-all z-[210] border border-white/20 shadow-2xl backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          <div 
            onClick={(e) => e.stopPropagation()}
            className="max-w-4xl max-h-[76vh] flex flex-col items-center my-auto z-[205]"
          >
            <img
              src={currentPhoto.url}
              alt=""
              className="max-w-full max-h-[74vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
            {currentPhoto.caption && (
              <p className="text-stone-300 text-sm font-serif-elegant mt-3 text-center italic bg-black/50 px-4 py-1.5 rounded-full">
                {currentPhoto.caption}
              </p>
            )}
          </div>

          <div className="absolute bottom-4 sm:bottom-6 inset-x-0 z-[210] flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="pointer-events-auto px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/30 shadow-2xl cursor-pointer"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>✕ Bấm vào đây hoặc ra ngoài để quay lại thiệp</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
