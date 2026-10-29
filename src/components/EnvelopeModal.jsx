import React, { useState, useEffect } from 'react';
import { Mail, Heart, Sparkles, ChevronRight } from 'lucide-react';

export function EnvelopeModal({
  data = {},
  guestName,
  salutation,
  onOpen,
  currentStyle,
  onStyleChange,
  isAbsolute = false,
  isInline = false,
  testAnimationTrigger = 0
}) {
  const safeData = data || {};
  const isBrideCover = safeData.profileType === 'bride' || safeData.profileName?.toLowerCase().includes('gái');
  const groomName = safeData.groom?.nickname || safeData.groom?.name || 'Đình Hiếu';
  const brideName = safeData.bride?.nickname || safeData.bride?.name || 'Thanh Thúy';
  const defaultCoupleNames = isBrideCover ? `${brideName} ♥ ${groomName}` : `${groomName} ♥ ${brideName}`;
  const displayGuest = guestName || 'Quý Khách và Người Thương';
  const weddingDay = (safeData.saveTheDateDay && safeData.saveTheDateDay !== '26.12.2026') ? safeData.saveTheDateDay : (safeData.eventDateText || '29.11.2026');
  const getCleanDate = (dateVal) => {
    if (!dateVal || dateVal === '26.12.2026') return weddingDay;
    return dateVal;
  };

  // Active cover style & animation effect (Declared first to avoid TDZ / ReferenceError)
  const activeStyle = safeData.templateStyle || safeData.coverConfig?.activeStyle || currentStyle || 'style1';
  const animEffect = safeData.coverConfig?.coverAnimationEffect || (activeStyle === 'style4' ? 'vip' : 'waxFlap');

  const [isOpening, setIsOpening] = useState(false);

  // Trigger test replay when requested from Studio Editor
  useEffect(() => {
    if (testAnimationTrigger) {
      setIsOpening(true);
      const timer = setTimeout(() => {
        setIsOpening(false);
      }, animEffect === 'vip' ? 2800 : 2400); // 2.8s for VIP to view full opening
      return () => clearTimeout(timer);
    }
  }, [testAnimationTrigger, animEffect]);

  const handleOpenClick = () => {
    setIsOpening(true);
    const duration = animEffect === 'vip' ? 2000 : 1600; // 2.0s slow, majestic opening for VIP
    setTimeout(() => {
      if (onOpen) onOpen();
    }, duration);
  };

  const c1 = safeData.coverConfig?.style1 || {};
  const c2 = safeData.coverConfig?.style2 || {};
  const c3 = safeData.coverConfig?.style3 || {};
  const c4 = safeData.coverConfig?.style4 || {};
  const cCustom = safeData.coverConfig?.[activeStyle] || {};

  // Style-specific background colors (Each of the 4 styles has its own independent color)
  const style1Bg = c1.bgColor || '#fbe8ea';
  const style2Bg = c2.bgColor || '#faf8f4';
  // Mẫu 2: Phong bì nhung đỏ nguyên bản (#8c111e), không dùng bgColor làm màu phong bì
  const style2Envelope = (c2.envelopeColor && c2.envelopeColor !== '#faf7f2' && c2.envelopeColor !== '#faf8f4' && c2.envelopeColor !== '#ffffff')
    ? c2.envelopeColor
    : '#8c111e';
  const style3Bg = c3.bgColor || '#183120';
  const style4Bg = c4.bgColor || '#fbf5ed';
  const customBg = cCustom.bgColor || '#faf7f2';

  // Active cover background color for active style
  const coverBg = activeStyle === 'style1' ? style1Bg :
    activeStyle === 'style2' ? style2Bg :
    activeStyle === 'style3' ? style3Bg :
    activeStyle === 'style4' ? style4Bg : customBg;

  // Helper to detect if a background color is dark
  const isColorDark = (hex) => {
    if (!hex || typeof hex !== 'string') return false;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    if (c.length !== 6) return false;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) < 140;
  };
  const isDark = isColorDark(coverBg);

  // Helper to detect hardcoded sample demo names from templates
  const isSampleDemoName = (val) => {
    if (!val || typeof val !== 'string') return true;
    const lower = val.toLowerCase().trim();
    return (
      lower.includes('quốc toàn') ||
      lower.includes('bích phương') ||
      lower.includes('thanh sơn') ||
      lower.includes('diệu nhi')
    );
  };

  // Helper to extract couple names cleanly so they never awkwardly wrap mid-word
  const getCoupleNamesArray = (namesStr) => {
    if (namesStr && typeof namesStr === 'string' && namesStr.trim()) {
      const parts = namesStr.split(/\s*(?:[♥&\-–—]|và)\s*/i).filter(Boolean);
      if (parts.length >= 2) {
        return [parts[0].trim(), parts[1].trim()];
      }
    }
    return isBrideCover ? [brideName, groomName] : [groomName, brideName];
  };

  const [style1Person1, style1Person2] = getCoupleNamesArray(c1.names);
  const [style2Person1, style2Person2] = getCoupleNamesArray(c2.names);
  const [style3Person1, style3Person2] = getCoupleNamesArray(c3.names);
  const [style4Person1, style4Person2] = getCoupleNamesArray(
    c4.names || (c4.groomName && c4.brideName ? `${c4.groomName} & ${c4.brideName}` : null)
  );

  // Reusable component to render couple names with luxury calligraphy & guarantee no awkward word wrapping
  const renderCoupleNames = (namesStr, fontClass = 'font-motherland', colorClass = 'text-[#78350f]', dividerColor = 'text-amber-700') => {
    const [person1, person2] = getCoupleNamesArray(namesStr);
    return (
      <div className="flex flex-col items-center justify-center mt-1 mb-2 select-none w-full px-2">
        <span className={`${fontClass} text-3xl sm:text-4xl ${colorClass} leading-normal pt-1 whitespace-nowrap tracking-wide drop-shadow-xs`}>
          {person1}
        </span>
        <div className="flex items-center justify-center gap-2.5 my-1.5">
          <span className="w-8 sm:w-10 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-amber-500"></span>
          <span className={`font-serif-elegant italic text-sm sm:text-base ${dividerColor} font-bold`}>&</span>
          <span className="w-8 sm:w-10 h-[1px] bg-gradient-to-l from-transparent via-amber-400 to-amber-500"></span>
        </div>
        <span className={`${fontClass} text-3xl sm:text-4xl ${colorClass} leading-normal pb-1 whitespace-nowrap tracking-wide drop-shadow-xs`}>
          {person2}
        </span>
      </div>
    );
  };

  const coverPhoto = (c1.photo && !c1.photo.includes('/templates/007/images/hero_banner.jpg'))
    ? c1.photo
    : (c4.photo || safeData.heroBannerPhoto || safeData.gallery?.[0]?.url || '/templates/007/images/hero_banner.jpg');

  // 9 Distinct Opening Animation Classes based on animEffect (Slow & Emphasized ~1600ms - 2000ms)
  let openingEffectClasses = '';
  if (isOpening) {
    if (animEffect === 'vip') {
      // VIP: Bìa Sáp Tách Cánh Mở Sang 2 Bên (Chuẩn Video Mẫu)
      // Giữ khung bìa cố định để 2 cánh trượt mở sang 2 bên hé lộ ruột thiệp mượt mà
      openingEffectClasses = 'pointer-events-none transition-all duration-[2000ms]';
    } else if (animEffect === 'zoomFade') {
      // 1. Phóng To Điện Ảnh Hollywood: Deep scale up, soft blur & cinematic fade
      openingEffectClasses = 'opacity-0 scale-160 blur-md pointer-events-none transition-all duration-[1600ms] ease-out';
    } else if (animEffect === 'splitDoor') {
      // 2. Cổng Đôi Cung Đình Mở Sang 2 Bên (27BigGroup A9): 3D perspective double door swing
      openingEffectClasses = 'opacity-0 [transform:perspective(1400px)_rotateY(-85deg)_translateX(-120px)_scale(0.95)] origin-left pointer-events-none transition-all duration-[1600ms] ease-in-out';
    } else if (animEffect === 'flowerBloom') {
      // 3. Cánh Hoa Rơi & Nở Bung Rực Rỡ (LoveCard 26): Soft floral blossom expand & floating tilt
      openingEffectClasses = 'opacity-0 scale-135 [transform:rotate(3deg)_translateY(-20px)] blur-xs pointer-events-none transition-all duration-[1700ms] ease-out';
    } else if (animEffect === 'ribbonUntie') {
      // 4. Tháo Dải Ruy Băng Lụa Vàng Kim: Silk ribbon unbinding and floating downward
      openingEffectClasses = 'opacity-0 [transform:scale(0.96)_translateY(40px)] blur-xs pointer-events-none transition-all duration-[1600ms] ease-out';
    } else if (animEffect === 'curtainReveal') {
      // 5. Kéo Rèm Nhung Đỏ Cung Đình: Theatrical velvet curtains parting
      openingEffectClasses = 'opacity-0 [transform:scale(1.04)_translateX(50px)] pointer-events-none transition-all duration-[1600ms] ease-in-out';
    } else if (animEffect === 'scrollUnroll') {
      // 6. Trải Cuộn Chiếu Chỉ Hoàng Gia: Vertical imperial decree scroll unrolling
      openingEffectClasses = 'opacity-0 [transform:scaleY(0.06)_scaleX(1.1)] origin-center pointer-events-none transition-all duration-[1600ms] ease-in-out';
    } else if (animEffect === 'envelopeSlide') {
      // 7. Rút Cánh Thiệp Ra Khỏi Phong Bì: Card lifts upward and slides out of pocket
      openingEffectClasses = 'opacity-0 [transform:translateY(-140px)_scale(0.92)] pointer-events-none transition-all duration-[1600ms] ease-in-out';
    } else if (animEffect === 'none') {
      // 8. Mở Tức Thì: Instant transition
      openingEffectClasses = 'opacity-0 pointer-events-none transition-none';
    } else {
      // Mặc định: waxFlap - Mở Nắp Sáp 3D Hoàng Gia (Cocohappii)
      openingEffectClasses = 'opacity-0 [transform:perspective(1200px)_rotateX(-125deg)_translateY(-80px)] origin-top pointer-events-none transition-all duration-[1600ms] ease-in-out';
    }
  } else {
    openingEffectClasses = 'opacity-100 scale-100 [transform:none] transition-all duration-500';
  }

  const containerClasses = isInline
    ? `w-full flex items-center justify-center p-1 sm:p-2 transition-all relative ${openingEffectClasses}`
    : `${isAbsolute ? 'absolute' : 'fixed'} inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-stone-900/85 backdrop-blur-md transition-all ${openingEffectClasses}`;

  const effectNames = {
    vip: 'VIP: Bìa Sáp Tách Cánh Mở Sang 2 Bên (Như Video)',
    waxFlap: '1. Mở Nắp Sáp Hoàng Gia 3D (Cocohappii)',
    splitDoor: '2. Cổng Đôi Cung Đình Mở 2 Bên (27BigGroup A9)',
    flowerBloom: '3. Cánh Hoa Rơi & Nở Bung Rực Rỡ (LoveCard 26)',
    ribbonUntie: '4. Tháo Dải Ruy Băng Vàng Kim',
    curtainReveal: '5. Kéo Rèm Nhung Đỏ Cung Đình',
    scrollUnroll: '6. Trải Cuộn Chiếu Chỉ Hoàng Gia',
    envelopeSlide: '7. Rút Cánh Thiệp Ra Khỏi Phong Bì',
    zoomFade: '8. Phóng To Điện Ảnh Hollywood',
    none: 'Mở Tức Thì (Không Hiệu Ứng)'
  };

  return (
    <div className={containerClasses}>
      {/* Live Replay Indicator Pill when tested from editor */}
      {testAnimationTrigger > 0 && isOpening && (
        <div className="absolute top-3 inset-x-3 z-50 flex justify-center pointer-events-none animate-pulse">
          <div className="bg-stone-950/95 text-amber-300 text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-2xl border border-amber-400/90 backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
            <span>Đang mở thử: {effectNames[animEffect] || 'Hiệu Ứng Mở Bìa'} (Chậm & Rõ Nét)</span>
          </div>
        </div>
      )}

      {/* OVERLAY VIP: CỔNG ĐÔI HOÀNG GIA (Áp dụng cho Style 1, 2, 3 khi chọn hiệu ứng VIP) */}
      {animEffect === 'vip' && activeStyle !== 'style4' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 flex overflow-hidden rounded-[32px]">
          <div
            style={{
              backgroundColor: coverBg,
              transition: 'transform 2000ms cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            className="w-1/2 h-full border-r-2 border-amber-300 shadow-2xl flex items-center justify-end pr-3 -translate-x-[105%]"
          >
            <div className="w-1.5 h-20 rounded-full bg-amber-400/90 shadow"></div>
          </div>
          <div
            style={{
              backgroundColor: coverBg,
              transition: 'transform 2000ms cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            className="w-1/2 h-full border-l-2 border-amber-300 shadow-2xl flex items-center justify-start pl-3 translate-x-[105%]"
          >
            <div className="w-1.5 h-20 rounded-full bg-amber-400/90 shadow"></div>
          </div>
        </div>
      )}

      {/* OVERLAY 1: FLOWER BLOOM (LoveCard 26) */}
      {animEffect === 'flowerBloom' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(14)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-flower-burst"
              style={{
                top: `${(i * 14 + 10) % 80}%`,
                left: `${(i * 19 + 5) % 85}%`,
                animationDelay: `${i * 80}ms`
              }}
            >
              <img
                src={i % 2 === 0 ? '/templates/007/images/decor-flower1.png' : '/templates/007/images/decor-flower3.png'}
                alt=""
                className="w-10 h-10 opacity-95 drop-shadow-xl"
              />
            </div>
          ))}
        </div>
      )}

      {/* OVERLAY 2: SPLIT DOOR (27BigGroup A9) */}
      {animEffect === 'splitDoor' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 flex overflow-hidden rounded-[32px]">
          <div className="w-1/2 h-full bg-[#183120] border-r-2 border-amber-300 shadow-2xl animate-split-door-left flex items-center justify-end pr-2">
            <div className="w-2 h-24 rounded-full bg-amber-300/80 shadow"></div>
          </div>
          <div className="w-1/2 h-full bg-[#183120] border-l-2 border-amber-300 shadow-2xl animate-split-door-right flex items-center justify-start pl-2">
            <div className="w-2 h-24 rounded-full bg-amber-300/80 shadow"></div>
          </div>
        </div>
      )}

      {/* OVERLAY 3: CURTAIN REVEAL */}
      {animEffect === 'curtainReveal' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 flex overflow-hidden rounded-[32px]">
          <div className="w-1/2 h-full bg-gradient-to-r from-red-950 via-red-900 to-[#800f2f] border-r-2 border-amber-400 shadow-2xl animate-curtain-left flex flex-col justify-between py-6 pl-3">
            <div className="w-6 h-6 rounded-full bg-amber-400/40"></div>
          </div>
          <div className="w-1/2 h-full bg-gradient-to-l from-red-950 via-red-900 to-[#800f2f] border-l-2 border-amber-400 shadow-2xl animate-curtain-right flex flex-col justify-between py-6 pr-3 items-end">
            <div className="w-6 h-6 rounded-full bg-amber-400/40"></div>
          </div>
        </div>
      )}

      {/* OVERLAY 4: RIBBON UNTIE */}
      {animEffect === 'ribbonUntie' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
          <div className="w-full h-14 bg-gradient-to-r from-amber-600 via-amber-200 to-amber-600 shadow-2xl animate-ribbon-untie flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* OVERLAY 5: SCROLL UNROLL */}
      {animEffect === 'scrollUnroll' && isOpening && (
        <div className="absolute inset-0 pointer-events-none z-50 flex flex-col justify-between overflow-hidden rounded-[32px]">
          <div className="w-full h-1/2 bg-gradient-to-b from-[#dfc179] via-[#f7e6a7] to-[#d4af67] border-b-2 border-amber-600 shadow-2xl animate-scroll-top flex items-end justify-center pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#70561f]">CHIẾU CHỈ HỶ SỰ</span>
          </div>
          <div className="w-full h-1/2 bg-gradient-to-t from-[#dfc179] via-[#f7e6a7] to-[#d4af67] border-t-2 border-amber-600 shadow-2xl animate-scroll-bottom"></div>
        </div>
      )}
      
      {/* STYLE 1: ELEGANT CREAM WAX SEAL ENVELOPE (Chuẩn theo Ảnh 4 tham khảo) */}
      {activeStyle === 'style1' && (
        <div
          style={{ backgroundColor: style1Bg }}
          className="relative w-full max-w-sm sm:max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-stone-800 text-center animate-fade-in transition-colors duration-500 flex flex-col justify-between"
        >
          {/* Top Photo Section: Generous height with object-[center_12%] so couple's heads, faces, smiles and background scenery are 100% CLEAR */}
          <div className="relative h-[380px] sm:h-[440px] w-full overflow-hidden bg-stone-900">
            <img
              src={c1.photo || coverPhoto}
              alt="Couple background"
              className="w-full h-full object-cover object-[center_12%] filter brightness-[0.97] contrast-[1.02] transition-transform duration-700"
            />
            {/* Subtle soft gradient at very bottom edge only */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent pointer-events-none"></div>
          </div>

          {/* Arched-top White Card (Chuẩn theo Ảnh 4) */}
          <div className="relative -mt-8 mx-3 sm:mx-4 mb-3 bg-white rounded-t-[36px] rounded-b-[24px] px-5 py-4 shadow-2xl border-[1.5px] border-[#c4a97d] flex flex-col items-center">
            {/* Gold Wax Seal Medallion with Heart at Apex */}
            <div
              className={`relative -mt-10 mb-1 w-13 h-13 sm:w-15 sm:h-15 rounded-full bg-gradient-to-br from-[#ffd875] via-[#d4af67] to-[#784f18] p-1 shadow-[0_8px_20px_rgba(0,0,0,0.35)] flex items-center justify-center cursor-pointer hover:scale-105 transition-transform ${
                isOpening && animEffect === 'waxFlap' ? 'scale-125 -translate-y-4 rotate-12 transition-all duration-500' : ''
              }`}
              onClick={handleOpenClick}
              title="Nhấn để mở thiệp"
            >
              <div className="w-full h-full rounded-full border border-amber-100/80 bg-gradient-to-b from-[#e5bc64] via-[#c4983f] to-[#966b1a] flex items-center justify-center shadow-inner relative overflow-hidden">
                <Heart className="w-5 h-5 sm:w-6 sm:h-6 text-amber-50 fill-amber-50/70 drop-shadow" />
              </div>
            </div>

            {/* Subtitle with Sparkles (Ảnh 4 - Khoảng cách thoáng đãng, sang trọng) */}
            <p className="font-avo text-[10px] sm:text-[11px] uppercase tracking-[0.25em] text-[#8a7251] font-semibold mt-2 sm:mt-2.5 mb-3.5 sm:mb-4.5">
              ✦ {c1.subTitle || 'THE WEDDING OF'} ✦
            </p>

            {/* Couple Names: Motherland Signature Calligraphy (Chuẩn 100% Ảnh 4 & 5 - Không dính chữ) */}
            <div className="flex flex-col items-center justify-center mt-1 mb-2.5 sm:mb-3 select-none w-full px-2">
              <span className="font-motherland text-3xl sm:text-[38px] text-[#78350f] leading-normal pt-1.5 sm:pt-2 whitespace-nowrap tracking-wide drop-shadow-xs">
                {style1Person1}
              </span>
              <div className="flex items-center justify-center gap-3 my-2 sm:my-2.5">
                <span className="w-10 sm:w-14 h-[1px] bg-gradient-to-r from-transparent via-[#c4983f] to-[#e5bc64]"></span>
                <span className="font-serif-elegant italic text-sm text-amber-700 font-bold">&</span>
                <span className="w-10 sm:w-14 h-[1px] bg-gradient-to-l from-transparent via-[#c4983f] to-[#e5bc64]"></span>
              </div>
              <span className="font-motherland text-3xl sm:text-[38px] text-[#78350f] leading-normal pb-1 sm:pb-1.5 whitespace-nowrap tracking-wide drop-shadow-xs">
                {style1Person2}
              </span>
            </div>

            {/* Date with Rings Icon (Ảnh 4) */}
            <div className="flex items-center justify-center gap-2.5 my-2 sm:my-2.5 text-stone-600">
              <span className="text-stone-400 text-xs">— ⚭ —</span>
              <span className="font-avo font-semibold text-stone-800 tracking-widest text-xs sm:text-sm whitespace-nowrap">
                {getCleanDate(c1.date)}
              </span>
              <span className="text-stone-400 text-xs">— ⚭ —</span>
            </div>

            {/* Salutation & Guest Name in Champagne Pill Box (Ảnh 4 - Viết liền 1 dòng, chuẩn chính tả) */}
            <div className="w-full text-center mt-2 mb-2 px-1">
              <p className="font-avo text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-[#8a7251] font-semibold mb-1">
                {salutation || c1.greetingLabel || 'TRÂN TRỌNG KÍNH MỜI'}
              </p>
              <div className="inline-block px-5 py-1.5 rounded-full bg-[#fef9ec] border border-[#f3dfa8] shadow-xs max-w-full">
                <span className="text-xs sm:text-sm font-avo font-semibold text-[#6d3514] block whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayGuest}
                </span>
              </div>
            </div>

            {/* Dotted divider line */}
            <div className="w-full my-2 border-t border-dotted border-stone-200"></div>

            {/* Button: Xem thiệp ngay */}
            <button
              onClick={handleOpenClick}
              className="py-2 px-8 rounded-lg bg-white border border-[#d6cfc7] shadow-[0_4px_0_#8b7355] hover:shadow-[0_2px_0_#8b7355] hover:translate-y-[2px] transition-all text-[#333] font-avo text-xs sm:text-sm font-medium inline-flex items-center justify-center cursor-pointer my-1"
            >
              <span>{c1.buttonText || 'Xem thiệp ngay'}</span>
            </button>
          </div>
        </div>
      )}

      {/* STYLE 2: RED VELVET ENVELOPE (Ảnh 4 - LoveCard 26) */}
      {activeStyle === 'style2' && (
        <div
          style={{ backgroundColor: style2Bg || '#faf8f4' }}
          className={`relative w-full max-w-sm sm:max-w-md rounded-[32px] p-6 sm:p-7 shadow-2xl border border-stone-200/80 text-center animate-fade-in flex flex-col items-center overflow-hidden transition-colors duration-500 ${isColorDark(style2Bg) ? 'text-white' : 'text-stone-800'}`}
        >
          {/* Botanical gingko leaves at bottom corners */}
          <img
            src="/templates/007/images/decor-flower2.png"
            alt=""
            className="absolute -bottom-7 -left-7 w-28 h-28 opacity-25 pointer-events-none filter sepia"
          />
          <img
            src="/templates/007/images/decor-flower2.png"
            alt=""
            className="absolute -bottom-7 -right-7 w-28 h-28 opacity-25 pointer-events-none filter sepia scale-x-[-1]"
          />

          {/* Tiny pink heart at top right corner */}
          <span className="absolute top-4 right-5 text-rose-500 text-sm select-none pointer-events-none">♥</span>

          {/* Top Greeting */}
          <p className="font-avo uppercase tracking-[0.2em] text-[#555] text-[11px] sm:text-xs font-semibold mb-1">
            {salutation || c2.greetingLabel || 'TRÂN TRỌNG KÍNH MỜI'}
          </p>

          {/* Guest Name in Motherland Signature Script with Dotted Underline (Viết liền 1 dòng, không tràn viền) */}
          <div className="relative inline-block mx-auto mb-2 px-3 max-w-full">
            <span className="font-motherland text-lg sm:text-xl text-[#851924] block select-none whitespace-nowrap">
              {displayGuest}
            </span>
            <div className="w-full border-b border-dotted border-stone-300 mt-0.5"></div>
          </div>

          {/* 3D Envelope with attached Floral Bouquets at corners */}
          <div
            className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[1.38] my-3 cursor-pointer group"
            onClick={handleOpenClick}
          >
            {/* Top-Left Floral Bouquet */}
            <img
              src="/templates/007/images/decor-flower-bouquet1.png"
              alt=""
              className="absolute -top-10 -left-9 w-28 sm:w-32 pointer-events-none drop-shadow-xl z-20 group-hover:scale-105 transition-transform"
            />

            {/* Bottom-Right Floral Bouquet */}
            <img
              src="/templates/007/images/decor-flower-bouquet2.png"
              alt=""
              className="absolute -bottom-10 -right-9 w-28 sm:w-32 pointer-events-none drop-shadow-xl z-20 group-hover:scale-105 transition-transform"
            />

            {/* Envelope Body (Velvet Red or user color) */}
            <div
              style={{ backgroundColor: style2Envelope }}
              className="w-full h-full rounded-2xl shadow-2xl relative overflow-hidden border border-black/20 group-hover:brightness-105 transition-all"
            >
              {/* Seam folds */}
              <div className="absolute inset-0 [clip-path:polygon(0_100%,100%_100%,50%_52%)] bg-black/15 pointer-events-none"></div>
              <div className="absolute inset-0 [clip-path:polygon(0_0,0_100%,48%_55%)] bg-black/10 pointer-events-none"></div>
              <div className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,52%_55%)] bg-black/10 pointer-events-none"></div>

              {/* Top Flap */}
              <div className="absolute top-0 inset-x-0 h-[64%] [clip-path:polygon(0_0,100%_0,50%_88%)] bg-gradient-to-b from-white/10 via-black/5 to-black/30 shadow-md pointer-events-none"></div>
            </div>
          </div>

          {/* Under Envelope Text */}
          <div className="mt-3 text-center w-full cursor-pointer select-none" onClick={handleOpenClick}>
            <p className="font-avo uppercase tracking-[0.22em] text-[#705942] text-[10px] sm:text-[11px] font-semibold mb-3 sm:mb-4">
              {c2.hintText || 'NHẤN VÀO THIỆP ĐỂ MỞ'}
            </p>

            {/* Names in Motherland Calligraphy Script with Luxury Stacked Divider (Chuẩn Ảnh 4 & 5 - Khoảng cách thoáng đãng, không đè chữ) */}
            <div className="flex flex-col items-center justify-center my-1 select-none w-full px-2">
              <span className="font-motherland text-2xl sm:text-[28px] text-[#785437] leading-normal whitespace-nowrap pt-1">
                {style2Person1}
              </span>
              <div className="flex items-center justify-center gap-2.5 my-1.5">
                <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-r from-transparent via-[#c4983f] to-amber-500"></span>
                <span className="font-serif-elegant italic text-xs text-amber-700 font-bold">&</span>
                <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-l from-transparent via-[#c4983f] to-amber-500"></span>
              </div>
              <span className="font-motherland text-2xl sm:text-[28px] text-[#785437] leading-normal whitespace-nowrap pb-1">
                {style2Person2}
              </span>
            </div>

            <p className="font-avo uppercase tracking-[0.25em] text-[#6d5b4b] text-[10px] sm:text-[11px] font-semibold mt-3 mb-1">
              {c2.subTitle || 'SAVE THE DATE'}
            </p>

            <p className="font-avo text-base sm:text-lg text-[#785437] font-semibold tracking-wider">
              {getCleanDate(c2.date)}
            </p>
          </div>
        </div>
      )}

      {/* STYLE 3: ORIENTAL JADE GATE & ROYAL ARCH PORTAL (Ảnh 2 - 27BigGroup A9 - Rõ nét 100% người & khung cảnh) */}
      {activeStyle === 'style3' && (
        <div
          style={{ backgroundColor: style3Bg }}
          className="relative w-full max-w-sm sm:max-w-md rounded-[32px] p-5 sm:p-6 shadow-2xl border border-amber-400/40 text-center animate-fade-in flex flex-col items-center overflow-hidden transition-colors duration-500"
        >
          {/* Subtle vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none"></div>

          {/* Double door split lines */}
          <div className="absolute inset-0 pointer-events-none flex">
            <div className="w-1/2 h-full border-r border-[#eddab0]/30"></div>
            <div className="w-1/2 h-full border-l border-[#eddab0]/30"></div>
          </div>
          <div className="absolute top-0 bottom-0 left-5 sm:left-7 border-l border-[#eddab0]/20 pointer-events-none"></div>
          <div className="absolute top-0 bottom-0 right-5 sm:right-7 border-r border-[#eddab0]/20 pointer-events-none"></div>

          {/* Hanging Bamboo Leaves from top-left */}
          <div className="absolute top-0 left-0 w-36 sm:w-44 h-40 pointer-events-none opacity-85 z-20">
            <svg viewBox="0 0 200 200" fill="none" className="w-full h-full text-emerald-400/80">
              <path d="M-10,0 Q60,30 90,80" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
              <path d="M90,80 Q110,120 120,170" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
              <path d="M40,25 C50,22 80,45 85,60 C75,50 55,35 40,25 Z" fill="#84cc16" opacity="0.8" />
              <path d="M60,35 C75,32 105,50 110,70 C100,58 75,45 60,35 Z" fill="#65a30d" opacity="0.85" />
              <path d="M85,60 C100,60 125,90 128,110 C118,95 95,75 85,60 Z" fill="#84cc16" opacity="0.8" />
              <path d="M95,85 C108,88 135,120 138,140 C128,122 105,100 95,85 Z" fill="#4d7c0f" opacity="0.85" />
              <path d="M70,55 C65,70 70,105 75,120 C72,100 68,80 70,55 Z" fill="#65a30d" opacity="0.75" />
              <path d="M110,125 C118,135 130,165 132,185 C125,168 115,148 110,125 Z" fill="#84cc16" opacity="0.8" />
            </svg>
          </div>

          {/* Top Header (Khoảng cách thoáng đãng, sang trọng) */}
          <p className="relative z-10 font-avo uppercase tracking-[0.3em] text-[#eddab0] text-[10px] sm:text-[11px] font-semibold mt-1.5 sm:mt-2 mb-3.5 sm:mb-4.5">
            ✦ {c3.headerTitle || 'THIỆP MỜI CƯỚI'} ✦
          </p>

          {/* Couple Names in Luminous Motherland Calligraphy Script with Stacked Divider (Chuẩn Ảnh 4 & 5 - Không dính chữ) */}
          <div className="relative z-10 flex flex-col items-center justify-center mt-1 mb-2.5 sm:mb-3 select-none w-full px-2">
            <span className="font-motherland text-2xl sm:text-3xl text-[#fef9ec] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-normal pt-1.5 sm:pt-2 whitespace-nowrap">
              {style3Person1}
            </span>
            <div className="flex items-center justify-center gap-2.5 my-2 sm:my-2.5">
              <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-r from-transparent via-[#eddab0] to-amber-300"></span>
              <span className="font-serif-elegant italic text-xs text-amber-300 font-bold">&</span>
              <span className="w-8 sm:w-12 h-[1px] bg-gradient-to-l from-transparent via-[#eddab0] to-amber-300"></span>
            </div>
            <span className="font-motherland text-2xl sm:text-3xl text-[#fef9ec] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] leading-normal pb-1 sm:pb-1.5 whitespace-nowrap">
              {style3Person2}
            </span>
          </div>

          {/* GRAND ROYAL ARCH PORTAL WINDOW (Khung Vòm Cung Đình Rộng Mở - Nhìn Rõ 100% Mặt & Khung Cảnh Đằng Sau) */}
          <div
            className="relative z-10 w-full max-w-[280px] sm:max-w-[310px] h-[340px] sm:h-[390px] rounded-t-full rounded-b-2xl border-[3px] border-[#eddab0] shadow-[0_20px_50px_rgba(0,0,0,0.65)] overflow-hidden mx-auto my-2.5 group"
          >
            {/* Couple Full Background Photo with object-[center_12%] so heads, faces, smiles and landscape are completely clear */}
            <img
              src={c3.photo || coverPhoto}
              alt="Couple Portal"
              className="w-full h-full object-cover object-[center_12%] filter brightness-[0.98] group-hover:scale-105 transition-transform duration-700"
            />
            
            {/* Concentric Gold Hairline Arch Frame */}
            <div className="absolute inset-2 rounded-t-full rounded-b-xl border border-[#eddab0]/40 pointer-events-none"></div>

            {/* Horizontal Crimson Royal Ribbon at base of window */}
            <div className="absolute inset-x-0 bottom-4 h-10 bg-gradient-to-r from-[#6e101c] via-[#8c1727] to-[#6e101c] border-y border-[#eddab0]/80 shadow-lg flex items-center justify-center pointer-events-none">
              <div className="w-full border-t border-dashed border-[#eddab0]/50 h-0"></div>
            </div>

            {/* Interactive 3D Crimson Gold Lacquer Seal Button */}
            <div
              className="absolute bottom-1 left-1/2 -translate-x-1/2 z-20 w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-gradient-to-br from-[#f3da90] via-[#c99f4c] to-[#7a541c] shadow-[0_8px_20px_rgba(0,0,0,0.6)] cursor-pointer hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
              onClick={handleOpenClick}
              title="Chạm vào ấn đỏ để mở thiệp"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-b from-[#881827] via-[#5c0d18] to-[#3a060d] border border-[#d8b878] flex items-center justify-center shadow-inner">
                <span className="text-amber-200 text-lg sm:text-xl font-serif drop-shadow select-none">囍</span>
              </div>
            </div>
          </div>

          {/* Hint Text below portal (Chuẩn font-avo, 100% chuẩn chính tả chữ "ấn") */}
          <p
            className="relative z-10 font-avo text-xs text-[#eddab0]/90 tracking-wide mt-2 mb-1 cursor-pointer select-none hover:text-amber-200 transition-colors"
            onClick={handleOpenClick}
          >
            {c3.hintText || 'Chạm vào ấn đỏ để mở cánh cửa'}
          </p>

          {/* Salutation & Guest Name (Viết liền 1 dòng, chuẩn chính tả "Quý Khách và Người Thương") */}
          <div className="relative z-10 mt-1 mb-3 text-center w-full px-2">
            <p className="font-avo uppercase tracking-[0.2em] text-[#c8d8cb] text-[10px] sm:text-[11px] font-semibold mb-1">
              {salutation || c3.greetingLabel || 'TRÂN TRỌNG KÍNH MỜI'}
            </p>
            <div className="inline-block px-5 py-1.5 rounded-full bg-emerald-950/70 border border-[#eddab0]/40 shadow-md backdrop-blur-sm max-w-full">
              <span className="text-xs sm:text-sm font-avo font-semibold text-[#fef9ec] block whitespace-nowrap overflow-hidden text-ellipsis">
                {displayGuest}
              </span>
            </div>
          </div>

          {/* Gold Plaque Button */}
          <button
            onClick={handleOpenClick}
            className="relative z-10 py-2.5 px-8 rounded-full bg-gradient-to-r from-[#eddab0] via-[#faeed1] to-[#eddab0] hover:brightness-105 text-[#543d14] font-avo font-bold uppercase tracking-[0.25em] text-xs shadow-xl transition-all border border-[#c29c55] cursor-pointer"
          >
            <span>{c3.buttonText || 'MỞ THIỆP'}</span>
          </button>
        </div>
      )}

      {/* STYLE 4: MINIMALIST BOTANICAL WAX SEAL (Ảnh 1 & 5 - Save our date / Đình Hiếu & Thanh Thúy) */}
      {activeStyle === 'style4' && (
        <div
          className="relative w-full max-w-sm sm:max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-[#e8dcd0] min-h-[500px] sm:min-h-[550px] select-none flex flex-col justify-between"
        >
          {/* UNDERNEATH SNEAK PEEK (Photo of Bride & Groom revealed as flaps part) */}
          <div className="absolute inset-0 z-0 bg-stone-900 overflow-hidden">
            <img
              src={coverPhoto}
              alt="Wedding Preview"
              className={`w-full h-full object-cover transition-transform duration-[2000ms] ease-out ${
                isOpening ? 'scale-100 brightness-100' : 'scale-105 brightness-95'
              }`}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/20 pointer-events-none"></div>
          </div>

          {/* LEFT FLAP: 84% width, slides LEFT when opening (VIP Opening Effect) */}
          <div
            style={{
              backgroundColor: style4Bg,
              transform: (isOpening && animEffect === 'vip') ? 'translateX(-106%)' : 'translateX(0)',
              boxShadow: (isOpening && animEffect === 'vip') ? '8px 0 28px rgba(0,0,0,0.3)' : 'none',
              transition: 'transform 2000ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 1000ms ease-out'
            }}
            className="absolute top-0 bottom-0 left-0 w-[84%] z-20 flex flex-col justify-between p-6 sm:p-7 pr-4 border-r-2 border-[#dbe5ee] origin-left"
          >
            {/* Top-Left: "Save our date" */}
            <div className="w-full text-left select-none pt-2 pl-1">
              <span className="font-motherland text-2xl sm:text-[30px] text-[#6f563d] block whitespace-nowrap leading-none">
                Save our date
              </span>
            </div>

            {/* Middle Section: Names stacked on left + MỞ THIỆP Button */}
            <div className="relative w-full my-auto text-left select-none py-3 pl-1">
              <span className="font-motherland text-2xl sm:text-[28px] text-[#483827] leading-tight block whitespace-nowrap">
                {style4Person1}
              </span>
              <div className="font-serif-elegant italic text-base text-amber-700 my-1 pl-1">
                &
              </div>
              <span className="font-motherland text-2xl sm:text-[28px] text-[#483827] leading-tight block whitespace-nowrap">
                {style4Person2}
              </span>

              {/* MỞ THIỆP Button right under names */}
              <div className="mt-4">
                <button
                  onClick={handleOpenClick}
                  className="py-2 px-5 rounded-full bg-gradient-to-r from-[#eddab0] via-[#faeed1] to-[#eddab0] hover:brightness-105 shadow-md border border-[#c29c55] text-[#543d14] font-avo tracking-[0.18em] text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                >
                  <span>{c4.buttonText || 'MỞ THIỆP'}</span>
                  <span className="text-xs">›</span>
                </button>
              </div>
            </div>

            {/* Bottom-Left: Salutation & Guest Name */}
            <div className="w-full text-left pb-2 pt-2 select-none relative z-10">
              <p className="font-avo text-[11px] text-stone-600 mb-1">
                {salutation || c4.greetingLabel || 'Trân trọng kính mời'}
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-[#f4ebe1] border border-[#e2d2c2] max-w-full">
                <span className="font-avo font-semibold text-[#483827] text-xs sm:text-[13px] block whitespace-nowrap overflow-hidden text-ellipsis">
                  {displayGuest || c4.guestText || 'Quý khách'}
                </span>
              </div>
            </div>

            {/* Antique Bronze Circular Wax Seal centered directly ON the vertical line */}
            <div
              className="absolute -right-8 sm:-right-9 top-1/2 -translate-y-1/2 z-30 w-16 h-16 sm:w-18 sm:h-18 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
              onClick={handleOpenClick}
              title="Nhấn để mở thiệp"
            >
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
                <defs>
                  <radialGradient id="waxSealBronze" cx="38%" cy="38%" r="62%">
                    <stop offset="0%" stopColor="#d9b876" />
                    <stop offset="40%" stopColor="#ab8343" />
                    <stop offset="80%" stopColor="#7a541c" />
                    <stop offset="100%" stopColor="#4e340d" />
                  </radialGradient>
                  <radialGradient id="waxSealInner" cx="42%" cy="42%" r="58%">
                    <stop offset="0%" stopColor="#c5a25d" />
                    <stop offset="60%" stopColor="#8d6624" />
                    <stop offset="100%" stopColor="#5d3f10" />
                  </radialGradient>
                </defs>
                <circle cx="50" cy="50" r="46" fill="url(#waxSealBronze)" />
                <circle cx="50" cy="50" r="40" fill="url(#waxSealInner)" stroke="#deb977" strokeWidth="1.2" />
                <g fill="#4e340d" stroke="#e6c888" strokeWidth="0.8">
                  <path d="M50,80 C50,60 50,40 50,22" stroke="#e6c888" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                  <path d="M50,70 C42,66 38,58 44,56 C48,58 50,64 50,70 Z" fill="#6f4f1a" />
                  <path d="M50,70 C58,66 62,58 56,56 C52,58 50,64 50,70 Z" fill="#6f4f1a" />
                  <path d="M50,54 C40,50 36,42 42,40 C46,42 50,48 50,54 Z" fill="#6f4f1a" />
                  <path d="M50,54 C60,50 64,42 58,40 C54,42 50,48 50,54 Z" fill="#6f4f1a" />
                  <path d="M50,38 C42,34 38,26 44,24 C48,26 50,32 50,38 Z" fill="#6f4f1a" />
                  <path d="M50,38 C58,34 62,26 56,24 C52,26 50,32 50,38 Z" fill="#6f4f1a" />
                  <path d="M50,23 C47,16 53,16 50,23 Z" fill="#6f4f1a" />
                </g>
              </svg>
            </div>
          </div>

          {/* RIGHT FLAP: 16% width, slides RIGHT when opening (VIP Opening Effect) */}
          <div
            style={{
              backgroundColor: style4Bg,
              transform: (isOpening && animEffect === 'vip') ? 'translateX(106%)' : 'translateX(0)',
              boxShadow: (isOpening && animEffect === 'vip') ? '-8px 0 28px rgba(0,0,0,0.3)' : 'none',
              transition: 'transform 2000ms cubic-bezier(0.25, 1, 0.5, 1), box-shadow 1000ms ease-out'
            }}
            className="absolute top-0 bottom-0 right-0 w-[16%] z-10 origin-right"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-stone-900/5 to-transparent pointer-events-none"></div>
          </div>
        </div>
      )}

      {/* CUSTOM CLONED / IMPORTED COVER STYLE (Từ link hoặc file ảnh mẫu) */}
      {!['style1', 'style2', 'style3', 'style4'].includes(activeStyle) && (
        <div
          style={{ backgroundColor: coverBg }}
          className="relative w-full max-w-sm sm:max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-amber-400/50 text-center animate-fade-in flex flex-col justify-between min-h-[500px] sm:min-h-[560px] p-6 sm:p-7 relative transition-colors duration-500"
        >
          {/* Custom Background Photo (if provided from uploaded image / link) */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={cCustom.photo || safeData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
              alt="Custom cover background"
              className="w-full h-full object-cover filter brightness-[0.95] scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10"></div>
          </div>

          {/* Top Custom Badge & Title */}
          <div className="relative z-10 pt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 backdrop-blur border border-amber-400/40 text-[10px] uppercase tracking-widest text-amber-200 font-bold mb-2">
              {cCustom.headerTitle || 'MẪU BÌA TỰ DO'}
            </span>
            <p className="text-xs italic text-stone-300 font-serif-elegant">
              {cCustom.subTitle || 'The Wedding Of'}
            </p>
            <div className="mt-1">
              {renderCoupleNames(cCustom.names, 'font-motherland', 'text-amber-100 drop-shadow', 'text-amber-300')}
            </div>
            <p className="text-xs text-stone-300 font-sans-clean font-semibold tracking-wider mt-1">
              {getCleanDate(cCustom.date)}
            </p>
          </div>

          {/* Medallion / Center Button */}
          <div className="relative z-10 my-auto py-6 flex flex-col items-center">
            <div
              onClick={handleOpenClick}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-2xl cursor-pointer hover:scale-108 transition-transform flex items-center justify-center group"
              title="Nhấn để mở thiệp"
            >
              <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-900 to-amber-950 flex items-center justify-center border-2 border-amber-300/80 shadow-inner">
                <Sparkles className="w-8 h-8 text-amber-200 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <p className="text-[11px] text-amber-200/90 italic mt-3 font-serif-elegant">
              {cCustom.hintText || 'Chạm vào con dấu sáp để mở thiệp'}
            </p>
          </div>

          {/* Bottom Guest Greeting & Open Button */}
          <div className="relative z-10 pt-4 border-t border-amber-500/20 flex flex-col items-center">
            <p className="text-xs italic text-stone-300 font-serif-elegant mb-0.5">
              {salutation || cCustom.greetingLabel || 'Trân trọng kính mời'}
            </p>
            <p className="text-lg sm:text-xl font-serif-elegant font-bold text-amber-200 mb-3">
              {displayGuest}
            </p>
            <button
              onClick={handleOpenClick}
              className="w-full max-w-[220px] py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 hover:brightness-105 text-stone-900 font-sans-clean font-bold text-xs uppercase tracking-widest shadow-xl transition-all"
            >
              <span>{cCustom.buttonText || 'MỞ THIỆP'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
