import React, { useState, useEffect, useRef } from 'react';
import { EnvelopeModal } from './EnvelopeModal';
import { MiniCalendar } from './MiniCalendar';
import { WeddingGiftModal } from './WeddingGiftModal';
import { FallingPetals } from './FallingPetals';
import { EditableText } from './EditableText';
import {
  Volume2, VolumeX, Gift, MapPin, Send, Heart, ChevronLeft, ChevronRight,
  X, Maximize2, Sparkles, Edit3, CalendarCheck, MessageSquareHeart, CheckCircle2,
  Save, Eye, RotateCcw, Sliders, Check, Plus, Trash2, Mail
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getAudioTrackUrl } from '../utils/storage';

/**
 * Tính toán mốc thời gian đích cho Countdown:
 * Luôn đếm ngược đến ngày và giờ diễn ra Lễ Thành Hôn / Lễ Vu Quy
 */
export function getCeremonyTargetDate(cardData) {
  const eventsList = Array.isArray(cardData?.events) && cardData.events.length > 0 ? cardData.events : [];
  
  // 1. Tìm sự kiện Lễ Thành Hôn hoặc Lễ Vu Quy (hoặc Hôn Lễ)
  const ceremonyEvent = eventsList.find(e => {
    const t = (e.title || '').toLowerCase();
    const id = (e.id || '').toLowerCase();
    return t.includes('thành hôn') || t.includes('vu quy') || t.includes('hôn lễ') || id.includes('thanh-hon') || id.includes('vu-quy');
  }) || (eventsList.length > 1 ? eventsList[1] : eventsList[0]);

  // Nếu không tìm thấy sự kiện nào trong events, dùng weddingDate (nếu hợp lệ) hoặc mặc định 29.11.2026 11:00
  if (!ceremonyEvent) {
    if (cardData?.weddingDate && !cardData.weddingDate.includes('2026-12-26')) {
      const d = new Date(cardData.weddingDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(2026, 10, 29, 11, 0, 0); // 29/11/2026 11:00
  }

  // 2. Trích xuất Năm (mặc định 2026)
  let year = 2026;
  if (ceremonyEvent.year) {
    const yMatch = String(ceremonyEvent.year).match(/\d{4}/);
    if (yMatch) year = parseInt(yMatch[0], 10);
  } else if (cardData?.calendarYear) {
    const yMatch = String(cardData.calendarYear).match(/\d{4}/);
    if (yMatch) year = parseInt(yMatch[0], 10);
  }

  // 3. Trích xuất Tháng (0-indexed, mặc định tháng 11 là index 10)
  let monthIndex = 10;
  if (ceremonyEvent.month) {
    const mMatch = String(ceremonyEvent.month).match(/\d+/);
    if (mMatch) {
      monthIndex = parseInt(mMatch[0], 10) - 1;
    } else {
      const monthNames = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december'
      ];
      const foundIdx = monthNames.findIndex(mn => ceremonyEvent.month.toLowerCase().includes(mn));
      if (foundIdx !== -1) monthIndex = foundIdx;
    }
  }

  // 4. Trích xuất Ngày (mặc định 29)
  let day = 29;
  if (ceremonyEvent.date) {
    const dMatch = String(ceremonyEvent.date).match(/\d+/);
    if (dMatch) day = parseInt(dMatch[0], 10);
  }

  // 5. Trích xuất Giờ & Phút (ví dụ: "11 GIỜ", "09 GIỜ", "11:00", "09:30", "16:00", v.v.)
  let hours = 11;
  let minutes = 0;
  if (ceremonyEvent.time) {
    const timeStr = String(ceremonyEvent.time).trim();
    const colonMatch = timeStr.match(/(\d{1,2})\s*[:h]\s*(\d{2})/i);
    if (colonMatch) {
      hours = parseInt(colonMatch[1], 10);
      minutes = parseInt(colonMatch[2], 10);
    } else {
      const hourMatch = timeStr.match(/(\d{1,2})/);
      if (hourMatch) {
        hours = parseInt(hourMatch[1], 10);
      }
    }
  }

  const result = new Date(year, monthIndex, day, hours, minutes, 0);
  return isNaN(result.getTime()) ? new Date(2026, 10, 29, 11, 0, 0) : result;
}

export function GuestView({
  data,
  guestName,
  guestSalutation,
  activeProfileKey = 'groom',
  onSwitchProfile,
  onAddWish,
  onOpenStudio,
  onStyleChange,
  onUpdateData,
  onReorderGallery,
  onResetData,
  initialEnvelopeOpen = false,
  onEnvelopeToggle,
  isPreview = false,
  isAdmin = false,
  testAnimationTrigger = 0,
  testPhotoAnimTrigger = 0,
  testTextAnimTrigger = 0
}) {
  const [envelopeOpen, setEnvelopeOpen] = useState(initialEnvelopeOpen);
  const [photoAnimKey, setPhotoAnimKey] = useState(0);
  const [textAnimKey, setTextAnimKey] = useState(0);
  const [activePhotoTestNotice, setActivePhotoTestNotice] = useState('');
  const [activeTextTestNotice, setActiveTextTestNotice] = useState('');

  // Reorder gallery photos directly on card
  const handleMoveGalleryPhoto = (fromIndex, toIndex) => {
    const list = [...(cardData.gallery || [])];
    if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    const updated = { ...cardData, gallery: list };
    setCardData(updated);
    if (onUpdateData) {
      onUpdateData(updated);
    }
    if (onReorderGallery) {
      onReorderGallery(list);
    }
    setSaveToast(`Đã chuyển ảnh sang vị trí #${toIndex + 1}!`);
    setTimeout(() => setSaveToast(''), 2500);
  };

  // Drag and drop photo state & handlers for card view
  const [cardDragIdx, setCardDragIdx] = useState(null);
  const [cardDragOverIdx, setCardDragOverIdx] = useState(null);
  const [hasDragged, setHasDragged] = useState(false);
  const touchStartPos = useRef(null);
  const touchDragItemIdx = useRef(null);

  // Desktop mouse drag handlers
  const handleCardDragStart = (e, index) => {
    if (!isPreview && !isAdmin) return;
    setCardDragIdx(index);
    setHasDragged(false);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleCardDragOver = (e, index) => {
    if (!isPreview && !isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (cardDragOverIdx !== index) {
      setCardDragOverIdx(index);
    }
  };

  const handleCardDrop = (e, targetIndex) => {
    if (!isPreview && !isAdmin) return;
    e.preventDefault();
    setCardDragOverIdx(null);
    if (cardDragIdx === null || cardDragIdx === targetIndex) {
      setCardDragIdx(null);
      return;
    }
    setHasDragged(true);
    handleMoveGalleryPhoto(cardDragIdx, targetIndex);
    setCardDragIdx(null);
    setTimeout(() => setHasDragged(false), 200);
  };

  const handleCardDragEnd = () => {
    setCardDragIdx(null);
    setCardDragOverIdx(null);
    setTimeout(() => setHasDragged(false), 200);
  };

  // Mobile / touch screen handlers
  const handleCardTouchStart = (e, index) => {
    if (!isPreview && !isAdmin) return;
    touchDragItemIdx.current = index;
    setCardDragIdx(index);
    setHasDragged(false);
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleCardTouchMove = (e) => {
    if ((!isPreview && !isAdmin) || touchDragItemIdx.current === null) return;
    const touch = e.touches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoContainer = elem?.closest('[data-gallery-idx]');
    if (photoContainer) {
      const overIdx = parseInt(photoContainer.getAttribute('data-gallery-idx'), 10);
      if (!isNaN(overIdx) && overIdx !== cardDragOverIdx) {
        setCardDragOverIdx(overIdx);
      }
    }
  };

  const handleCardTouchEnd = (e) => {
    if ((!isPreview && !isAdmin) || touchDragItemIdx.current === null) return;
    const touch = e.changedTouches[0];
    const elem = document.elementFromPoint(touch.clientX, touch.clientY);
    const photoContainer = elem?.closest('[data-gallery-idx]');
    if (photoContainer) {
      const targetIdx = parseInt(photoContainer.getAttribute('data-gallery-idx'), 10);
      if (!isNaN(targetIdx) && targetIdx !== touchDragItemIdx.current) {
        setHasDragged(true);
        handleMoveGalleryPhoto(touchDragItemIdx.current, targetIdx);
        setTimeout(() => setHasDragged(false), 200);
      }
    }
    touchDragItemIdx.current = null;
    setCardDragOverIdx(null);
    setCardDragIdx(null);
  };

  useEffect(() => {
    setEnvelopeOpen(initialEnvelopeOpen);
    if (initialEnvelopeOpen) {
      setPhotoAnimKey(k => k + 1);
      setTextAnimKey(k => k + 1);
    }
  }, [initialEnvelopeOpen]);

  // Re-trigger photo animation on test or effect change
  useEffect(() => {
    if (testPhotoAnimTrigger > 0) {
      setEnvelopeOpen(true);
      if (onEnvelopeToggle) onEnvelopeToggle(true);
      setPhotoAnimKey(k => k + 1);
      setActivePhotoTestNotice(data?.photoAnimationEffect || 'kenburns');
      const t = setTimeout(() => setActivePhotoTestNotice(''), 4000);
      return () => clearTimeout(t);
    }
  }, [testPhotoAnimTrigger, data?.photoAnimationEffect]);

  // Re-trigger text animation on test or effect change
  useEffect(() => {
    if (testTextAnimTrigger > 0) {
      setEnvelopeOpen(true);
      if (onEnvelopeToggle) onEnvelopeToggle(true);
      setTextAnimKey(k => k + 1);
      setActiveTextTestNotice(data?.textAnimationEffect || 'slideUp');
      const t = setTimeout(() => setActiveTextTestNotice(''), 4000);
      return () => clearTimeout(t);
    }
  }, [testTextAnimTrigger, data?.textAnimationEffect]);

  const handleEnvelopeOpen = () => {
    setEnvelopeOpen(true);
    setPhotoAnimKey(k => k + 1);
    setTextAnimKey(k => k + 1);
    setActivePhotoTestNotice(data?.photoAnimationEffect || 'kenburns');
    setActiveTextTestNotice(data?.textAnimationEffect || 'slideUp');
    setTimeout(() => {
      setActivePhotoTestNotice('');
      setActiveTextTestNotice('');
    }, 4000);
    if (onEnvelopeToggle) {
      onEnvelopeToggle(true);
    }
  };

  const handleEnvelopeClose = () => {
    setEnvelopeOpen(false);
    if (onEnvelopeToggle) {
      onEnvelopeToggle(false);
    }
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [giftModalOpen, setGiftModalOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [isLiveEditingRaw, setIsLiveEditingRaw] = useState(false);
  const isLiveEditing = isAdmin && isLiveEditingRaw;
  const setIsLiveEditing = (val) => {
    if (isAdmin) setIsLiveEditingRaw(val);
  };
  const [adminToolbarVisible, setAdminToolbarVisible] = useState(true);
  const [saveToast, setSaveToast] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Local copy of data for real-time live editing
  const [cardData, setCardData] = useState(data || {});
  const audioRef = useRef(null);

  useEffect(() => {
    setCardData(data || {});
  }, [data]);

  // Keyboard navigation & ESC to close lightbox
  useEffect(() => {
    if (lightboxIndex === null || !cardData?.gallery?.length) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev - 1 + cardData.gallery.length) % cardData.gallery.length);
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev + 1) % cardData.gallery.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, cardData?.gallery]);

  // Form wish state: tự động điền theo tên khách mời (guestName)
  const [wishForm, setWishForm] = useState({
    name: guestName || '',
    message: ''
  });
  const [wishSubmitted, setWishSubmitted] = useState(false);

  // Tự động đồng bộ tên khách mời vào ô họ tên sổ lưu bút
  useEffect(() => {
    if (guestName) {
      setWishForm(prev => ({
        ...prev,
        name: guestName
      }));
    }
  }, [guestName]);

  // Countdown calculation: Luôn đếm ngược so với ngày giờ Lễ Thành Hôn / Lễ Vu Quy
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const targetDate = getCeremonyTargetDate(cardData);
      const target = targetDate.getTime();
      const now = Date.now();
      const diff = target - now;
      if (diff > 0) {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      } else {
        setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    calc();
    const timer = setInterval(calc, 1000);
    return () => clearInterval(timer);
  }, [cardData.weddingDate, cardData.events, cardData.calendarYear]);

  // Audio track URL with support for custom IndexedDB Blobs (MP3 & MP4)
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState('');

  useEffect(() => {
    let isMounted = true;
    const resolveAudio = async () => {
      const activeId = cardData.music?.activeTrackId;
      const activeTrack = cardData.music?.presetTracks?.find(t => t.id === activeId);

      // 1. Try to load live blob from IndexedDB if running on device that has it
      if (activeTrack?.isCustom || (activeId && activeId.startsWith('track-'))) {
        try {
          const blobUrl = await getAudioTrackUrl(activeId);
          if (blobUrl && isMounted) {
            setResolvedAudioUrl(blobUrl);
            return;
          }
        } catch (e) {
          console.warn('Audio blob load error:', e);
        }
      }

      // 2. If track has a static valid URL (NOT a dead blob: url from another session/device)
      const customUrl = cardData.music?.customTrackUrl;
      if (customUrl && !customUrl.startsWith('blob:') && isMounted) {
        setResolvedAudioUrl(customUrl);
        return;
      }

      const presetUrl = activeTrack?.url;
      if (presetUrl && !presetUrl.startsWith('blob:') && isMounted) {
        setResolvedAudioUrl(presetUrl);
        return;
      }

      // 3. Always fallback to the active remix audio track bundled on server
      if (isMounted) {
        setResolvedAudioUrl('/templates/007/music.m4a');
      }
    };
    resolveAudio();
    return () => { isMounted = false; };
  }, [cardData.music?.activeTrackId, cardData.music?.customTrackUrl, cardData.music?.presetTracks]);

  // Ensure activeMusicUrl is NEVER a dead blob URL
  const activeMusicUrl = (resolvedAudioUrl && !resolvedAudioUrl.startsWith('blob:') ? resolvedAudioUrl : null) ||
    (resolvedAudioUrl && resolvedAudioUrl.startsWith('blob:') ? resolvedAudioUrl : null) ||
    (cardData.music?.customTrackUrl && !cardData.music.customTrackUrl.startsWith('blob:') ? cardData.music.customTrackUrl : null) ||
    (cardData.music?.presetTracks?.find(t => t.id === cardData.music.activeTrackId)?.url && !cardData.music.presetTracks.find(t => t.id === cardData.music.activeTrackId).url.startsWith('blob:') ? cardData.music.presetTracks.find(t => t.id === cardData.music.activeTrackId).url : null) ||
    '/templates/007/music.m4a';

  // Autoplay on envelope open
  useEffect(() => {
    if (envelopeOpen && audioRef.current && cardData.music?.enabled) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.log('Autoplay prevented:', err));
    }
  }, [envelopeOpen, cardData.music?.enabled]);

  // Load cloud wishes from server
  useEffect(() => {
    fetch('/api/wishes')
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d?.wishes) && d.wishes.length > 0) {
          setCardData(prev => {
            const curWishes = prev.wishes || [];
            const existingIds = new Set(curWishes.map(w => w.id));
            const newFromServer = d.wishes.filter(w => !existingIds.has(w.id));
            if (newFromServer.length === 0) return prev;
            return {
              ...prev,
              wishes: [...newFromServer, ...curWishes]
            };
          });
        }
      })
      .catch(() => {});
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(e => console.log('Audio error:', e));
    }
  };

  // Helper to update specific card text property
  const updateField = (path, value) => {
    setHasChanges(true);
    setCardData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let curr = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        curr = curr[parts[i]];
      }
      curr[parts[parts.length - 1]] = value;
      if (onUpdateData) {
        onUpdateData(updated);
      }
      return updated;
    });
  };

  // Update specific event item
  const updateEventField = (index, field, value) => {
    setHasChanges(true);
    setCardData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated.events && updated.events[index]) {
        updated.events[index][field] = value;
      }
      if (onUpdateData) {
        onUpdateData(updated);
      }
      return updated;
    });
  };

  // Update specific timeline item
  const updateTimelineField = (index, field, value) => {
    setHasChanges(true);
    setCardData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (updated.timeline && updated.timeline[index]) {
        updated.timeline[index][field] = value;
      }
      if (onUpdateData) {
        onUpdateData(updated);
      }
      return updated;
    });
  };

  // Save changes explicitly
  const handleSave = () => {
    if (onUpdateData) {
      onUpdateData(cardData);
    }
    setHasChanges(false);
    setSaveToast('Đã lưu nội dung thành công vào máy của bạn!');
    setTimeout(() => setSaveToast(''), 3000);
  };

  const handleWishSubmit = (e) => {
    e.preventDefault();
    const cleanName = wishForm.name?.trim();
    const cleanMessage = wishForm.message?.trim();
    if (!cleanName || !cleanMessage) {
      alert('Vui lòng nhập tên và lời chúc của bạn nhé!');
      return;
    }

    const side = activeProfileKey || cardData.profileType || 'groom';
    const newWish = {
      id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      name: cleanName,
      message: cleanMessage,
      side,
      sideLabel: side === 'bride' ? 'Nhà Gái' : 'Nhà Trai',
      createdAt: 'Vừa xong',
      timestamp: Date.now()
    };

    // Always submit wish to cloud server
    fetch('/api/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWish)
    }).catch(e => console.warn('Guest wish send error:', e));

    if (onAddWish) {
      onAddWish(newWish);
    } else {
      setCardData(prev => ({
        ...prev,
        wishes: [newWish, ...(prev.wishes || [])]
      }));
    }

    setWishSubmitted(true);

    try {
      confetti({
        particleCount: 50,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#70561f', '#e6b685', '#be123c', '#d97706']
      });
    } catch (err) {}

    setWishForm(prev => ({ ...prev, message: '' }));
    setTimeout(() => setWishSubmitted(false), 4500);
  };

  const groomName = cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu';
  const brideName = cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy';
  const isBrideCard = activeProfileKey === 'bride' || cardData.profileType === 'bride' || cardData.profileName?.toLowerCase().includes('gái');

  // 8 Distinct Photo Animations Mapping + ⭐ Cocohappii Original
  const isCocohappiiPhoto = cardData.photoAnimationEffect === 'cocohappii';
  const isCocohappiiText = cardData.textAnimationEffect === 'cocohappii';

  const photoAnimClass =
    cardData.photoAnimationEffect === 'none' ? '' :
    cardData.photoAnimationEffect === 'cocohappii' ? 'animate-cocohappii-left' :
    cardData.photoAnimationEffect === 'blurFade' ? 'animate-blur-fade' :
    (cardData.photoAnimationEffect === 'float3d' || cardData.photoAnimationEffect === 'float3D') ? 'animate-float-3d' :
    cardData.photoAnimationEffect === 'zoomPulse' ? 'animate-zoom-pulse' :
    cardData.photoAnimationEffect === 'curtainSlide' ? 'animate-curtain-slide' :
    cardData.photoAnimationEffect === 'flipCard3d' ? 'animate-flip-card-3d' :
    cardData.photoAnimationEffect === 'vignetteFocus' ? 'animate-vignette-focus' :
    cardData.photoAnimationEffect === 'colorAwaken' ? 'animate-color-awaken' :
    'animate-kenburns';

  // Specific animations for Groom and Bride portrait cards
  const groomCardAnim = isCocohappiiPhoto ? 'animate-cocohappii-groom' : photoAnimClass;
  const brideCardAnim = isCocohappiiPhoto ? 'animate-cocohappii-bride' : photoAnimClass;

  // 8 Distinct Text Animations Mapping + ⭐ Cocohappii Original
  const textAnimClass =
    cardData.textAnimationEffect === 'none' ? '' :
    cardData.textAnimationEffect === 'cocohappii' ? 'animate-cocohappii-up' :
    cardData.textAnimationEffect === 'blurFade' ? 'animate-text-blur' :
    cardData.textAnimationEffect === 'shimmer' ? 'animate-shimmer' :
    cardData.textAnimationEffect === 'popScale' ? 'animate-pop-scale' :
    cardData.textAnimationEffect === 'typewriter' ? 'animate-typewriter' :
    cardData.textAnimationEffect === 'waveBounce' ? 'animate-wave-bounce' :
    cardData.textAnimationEffect === 'glowPulse' ? 'animate-glow-pulse' :
    cardData.textAnimationEffect === 'spreadSpacing' ? 'animate-spread-spacing' :
    'animate-slide-up';

  const photoEffectNameMap = {
    cocohappii: '⭐ Cocohappii Bản Gốc (Đặc Quyền VIP)',
    kenburns: '1. Ken Burns Điện Ảnh Hollywood (Chậm 8s)',
    blurFade: '2. Mờ Ảo Sương Khói Lướt Hiện',
    float3d: '3. Nổi 3D Bồng Bềnh & Phối Cảnh',
    zoomPulse: '4. Thu Phóng Nhịp Tim & Hào Quang',
    curtainSlide: '5. Rèm Kính Lướt Mở Phơi Sáng',
    flipCard3d: '6. Lật Cánh Thiệp 3D Hoàng Gia',
    vignetteFocus: '7. Tiêu Điểm Tỏa Sáng & Khung Viền',
    colorAwaken: '8. Thức Tỉnh Màu Sắc Nghệ Thuật',
    none: 'Giữ Nguyên (Tĩnh)'
  };

  const textEffectNameMap = {
    cocohappii: '⭐ Cocohappii Bản Gốc (Đặc Quyền VIP)',
    slideUp: '1. Lướt Lên Mềm Mại & Nâng Đỡ (Chậm)',
    blurFade: '2. Mờ Ảo Tách Sương Đọng Nét',
    shimmer: '3. Dập Chữ Ánh Kim Vàng 24K',
    popScale: '4. Nảy Nhẹ Hoàng Gia Sang Trọng',
    typewriter: '5. Nét Bút Thư Pháp Từng Nét Chữ',
    waveBounce: '6. Sóng Chữ Nhấp Nhô Dịu Dàng',
    glowPulse: '7. Nhịp Đèn Cung Đình Tỏa Sáng',
    spreadSpacing: '8. Giãn Khoảng Cách Tinh Tế',
    none: 'Giữ Nguyên (Tĩnh)'
  };

  return (
    <div className={`${isPreview ? (envelopeOpen ? 'min-h-screen bg-[#18181b] pt-1 pb-8' : 'w-full h-full min-h-[580px] bg-[#18181b] flex items-center justify-center p-2') : 'min-h-screen bg-[#252525] pt-14 pb-8'} flex flex-col items-center text-stone-800 font-avo selection:bg-[#70561f]/20 w-full relative`}>
      
      {/* Live Indicator Pill for Photo Animation testing */}
      {activePhotoTestNotice && (
        <div className="sticky top-2 z-[90] flex justify-center pointer-events-none px-4 animate-bounce">
          <div className="bg-amber-950/95 text-amber-200 text-xs font-bold px-4 py-2 rounded-full shadow-2xl border border-amber-400 backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>
              Đang xem thử ảnh: {photoEffectNameMap[cardData.photoAnimationEffect] || photoEffectNameMap.kenburns}
            </span>
          </div>
        </div>
      )}

      {/* Live Indicator Pill for Text Animation testing */}
      {activeTextTestNotice && (
        <div className="sticky top-2 z-[90] flex justify-center pointer-events-none px-4 animate-bounce">
          <div className="bg-[#70561f]/95 text-amber-100 text-xs font-bold px-4 py-2 rounded-full shadow-2xl border border-amber-300 backdrop-blur-md flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            <span>
              Đang xem thử chữ: {textEffectNameMap[cardData.textAnimationEffect] || textEffectNameMap.slideUp}
            </span>
          </div>
        </div>
      )}
      
      {/* 1. TOP LIVE-EDITING TOOLBAR (STICKY ON VERY TOP - Z-INDEX 100, ONLY VISIBLE TO ADMIN) */}
      {!isPreview && isAdmin && adminToolbarVisible && (
        <div className="fixed top-0 inset-x-0 z-[100] bg-stone-950/95 backdrop-blur-md shadow-2xl border-b border-amber-400/50 py-2 px-3">
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
            <button
              onClick={() => {
                setIsLiveEditing(false);
                setAdminToolbarVisible(false);
              }}
              className="px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 text-stone-300 hover:text-white hover:bg-stone-800"
              title="Ẩn thanh menu để trải nghiệm đúng 100% như khách mời nhận thiệp"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Xem Thử Khách Thật (Ẩn Menu)</span>
            </button>

            <button
              onClick={() => {
                setIsLiveEditing(true);
                setEnvelopeOpen(true); // Automatically dismiss envelope so user directly sees editable cards!
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                isLiveEditing
                  ? 'bg-amber-600 text-white shadow font-semibold ring-2 ring-amber-300 animate-pulse'
                  : 'text-amber-400 hover:text-white hover:bg-stone-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Bật Sửa Chữ Trực Tiếp</span>
            </button>

            {/* Quick Envelope Toggle */}
            <button
              onClick={() => {
                const next = !envelopeOpen;
                setEnvelopeOpen(next);
                if (onEnvelopeToggle) onEnvelopeToggle(next);
              }}
              className="px-2.5 py-1.5 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800 transition-all flex items-center gap-1 text-xs"
              title={envelopeOpen ? "Đóng lại để xem bìa phong thư bên ngoài" : "Mở ra để xem toàn bộ nội dung thiệp bên trong"}
            >
              {envelopeOpen ? (
                <>
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Xem Bìa</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Mở Ruột Thiệp</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Profile Switcher (Mẫu 1: Nhà Trai / Mẫu 2: Nhà Gái) */}
          {onSwitchProfile && (
            <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => onSwitchProfile('groom')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeProfileKey === 'groom'
                    ? 'bg-[#70561f] text-white shadow ring-1 ring-amber-400'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
                title="Chuyển sang xem Thiệp Cưới Nhà Trai"
              >
                <span>🎩 Nhà Trai</span>
              </button>
              <button
                onClick={() => onSwitchProfile('bride')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeProfileKey === 'bride'
                    ? 'bg-rose-800 text-white shadow ring-1 ring-rose-400'
                    : 'text-stone-300 hover:text-white hover:bg-stone-800'
                }`}
                title="Chuyển sang xem Thiệp Cưới Nhà Gái"
              >
                <span>👰 Nhà Gái</span>
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              className={`px-3.5 py-1.5 rounded-xl text-white text-xs font-semibold shadow flex items-center gap-1.5 transition-all ${
                hasChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-[#70561f] hover:bg-[#5a4417]'
              }`}
              title="Lưu lại các nội dung vừa chỉnh sửa vào máy"
            >
              <Save className="w-3.5 h-3.5 text-amber-300" />
              <span>Lưu Lại</span>
            </button>

            {onResetData && (
              <button
                onClick={onResetData}
                className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 transition-colors"
                title="Khôi phục lại nội dung mẫu gốc Cocohappii"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onOpenStudio}
              className="px-3 py-1.5 rounded-xl bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-400/50 transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-sm"
              title="Mở toàn bộ giao diện Studio để chỉnh sửa nội dung, ảnh cưới, nhạc, hiệu ứng"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-300" />
              <span>Vào Studio Sửa</span>
            </button>
          </div>
        </div>

        {/* Live editing notification toast */}
        {isLiveEditing && (
          <div className="max-w-2xl mx-auto mt-1.5 bg-amber-400 text-stone-950 px-3 py-1 rounded-xl text-[11px] font-bold text-center shadow-lg border border-amber-300 flex items-center justify-center gap-1.5 animate-fade-in">
            <Edit3 className="w-3.5 h-3.5 shrink-0" />
            <span>Chế độ sửa chữ đang BẬT: Bấm chuột vào bất kỳ chữ nào bên dưới (như TIỆC CƯỚI, LỄ THÀNH HÔN, TIMELINE...) để gõ sửa lại theo ý bạn!</span>
          </div>
        )}

        {saveToast && (
          <div className="max-w-2xl mx-auto mt-1.5 bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-bold text-center shadow-lg border border-emerald-400 flex items-center justify-center gap-1.5 animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>
      )}

      {/* Floating button for admin to restore toolbar or go to Studio (NEVER shown to guests) */}
      {!isPreview && isAdmin && !adminToolbarVisible && (
        <div className="fixed bottom-4 right-4 z-[99] flex items-center gap-2">
          <button
            onClick={onOpenStudio}
            className="px-3.5 py-2 rounded-full bg-[#70561f] text-amber-100 border border-amber-400/60 text-xs font-semibold shadow-2xl hover:bg-[#5a4417] transition-all flex items-center gap-1.5 backdrop-blur-md hover:scale-105 active:scale-95 cursor-pointer"
            title="Mở toàn bộ giao diện chỉnh sửa Studio Form"
          >
            <Sliders className="w-4 h-4 text-amber-300" />
            <span>Vào Studio Sửa</span>
          </button>
          <button
            onClick={() => setAdminToolbarVisible(true)}
            className="px-3 py-2 rounded-full bg-stone-900/95 text-stone-300 border border-stone-700 text-xs font-semibold shadow-2xl hover:bg-stone-800 transition-all flex items-center gap-1.5 backdrop-blur-md hover:scale-105 active:scale-95 cursor-pointer"
            title="Bấm để mở lại thanh công cụ quản trị thiệp"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Hiện Menu</span>
          </button>
        </div>
      )}

      {/* 2. ENVELOPE COVER OPENING MODAL */}
      {!envelopeOpen ? (
        <div className={`w-full ${isPreview ? 'h-full min-h-[580px] flex items-center justify-center p-2' : ''}`}>
          <EnvelopeModal
            data={cardData}
            guestName={guestName}
            salutation={guestSalutation}
            currentStyle={cardData.templateStyle || 'style1'}
            onStyleChange={onStyleChange}
            isAbsolute={false}
            isInline={isPreview}
            onOpen={handleEnvelopeOpen}
            onOpenEdit={() => {
              setIsLiveEditing(true);
              handleEnvelopeOpen();
            }}
            testAnimationTrigger={testAnimationTrigger}
          />
        </div>
      ) : (
        <>
          {/* 3. AUDIO ELEMENT & FLOATING CONTROLS */}
          <audio ref={audioRef} src={activeMusicUrl} loop preload={isPreview ? "none" : "auto"} />

          {/* Floating Audio Button */}
      <button
        onClick={toggleMusic}
        className={`${isPreview ? 'absolute' : 'fixed'} bottom-5 right-5 z-40 w-11 h-11 rounded-full shadow-2xl flex items-center justify-center border transition-all ${
          isPlaying
            ? 'bg-[#70561f] text-white border-[#e6b685] animate-spin-slow shadow-[#70561f]/50'
            : 'bg-stone-900/80 text-stone-300 border-stone-700'
        }`}
        title={isPlaying ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
      >
        {isPlaying ? <Volume2 className="w-5 h-5 text-[#e6b685]" /> : <VolumeX className="w-5 h-5" />}
      </button>

      {/* Floating Gift Button */}
      <button
        onClick={() => setGiftModalOpen(true)}
        className={`${isPreview ? 'absolute' : 'fixed'} bottom-18 right-5 z-40 w-11 h-11 rounded-full bg-[#70561f] text-white border border-[#e6b685] shadow-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-[#70561f]/50 animate-bounce`}
        title="Hộp mừng cưới cho cô dâu chú rể"
      >
        <Gift className="w-5 h-5 text-[#e6b685]" />
      </button>

      {/* 4. FALLING PETALS EFFECT */}
      <FallingPetals active={true} isAbsolute={isPreview} />

      {/* 5. MAIN INVITATION CARD (EXACT COCOHAPPII 007 FORM - 480PX MAX WIDTH) */}
      <div 
        key={`card-wrapper-${photoAnimKey}-${textAnimKey}`}
        id="card-wrapper" 
        style={{ backgroundColor: cardData.bgColor || '#fbf8f2' }}
        className="w-full max-w-[480px] shadow-2xl overflow-hidden relative border-x border-stone-800/40 my-3 transition-colors duration-500 animate-card-entrance paper-bg"
      >
        {/* Top Header Bar with Cover Toggle */}
        <div className="w-full flex items-center justify-between px-4 py-2 bg-stone-900/60 backdrop-blur-xs text-[11px] text-amber-100/90 border-b border-amber-900/30">
          <span className="font-serif-elegant italic tracking-wide text-stone-200">💌 Thiệp Cưới Trân Trọng</span>
          <button
            onClick={handleEnvelopeClose}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 hover:bg-amber-400/30 text-amber-200 text-[11px] font-semibold transition-all border border-amber-400/40 shadow-sm cursor-pointer hover:scale-102 active:scale-98"
            title="Bấm để xem lại bìa phong bì thiệp bên ngoài"
          >
            <Mail className="w-3.5 h-3.5 text-amber-300" />
            <span>Xem Bìa Phong Bì</span>
          </button>
        </div>
        
        {/* ================= SECTION 1: CARD-BANNER (COCOHAPPII 007 ORIGINAL 3-TIER STAGGERED LAYOUT) ================= */}
        <div id="card-banner" className="relative w-full px-3.5 sm:px-5 pt-0 bg-transparent">
          <div className="relative w-full aspect-[3/4] max-h-[640px] rounded-b-[10px] overflow-hidden bg-stone-900 shadow-md">
            <img
              key={`hero-img-${photoAnimKey}-${photoAnimClass}`}
              src={cardData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
              alt="Hero Banner"
              className={`w-full h-full object-cover object-center filter brightness-95 ${isCocohappiiPhoto ? 'animate-kenburns' : photoAnimClass}`}
            />
            {/* Rich bottom gradient to #928362 (rgba(146, 131, 98)) matching Cocohappii original */}
            <div 
              style={{ background: 'linear-gradient(to top, rgba(146, 131, 98, 0.96) 0%, rgba(146, 131, 98, 0.65) 32%, rgba(0, 0, 0, 0.3) 55%, transparent 100%)' }}
              className="absolute inset-0 pointer-events-none"
            ></div>

            {/* Couple Names over Banner (Cocohappii Original Staggered 3-Tier Layout) */}
            <div 
              key={`hero-text-${textAnimKey}-${textAnimClass}`} 
              className="wedding-name absolute bottom-0 inset-x-0 p-3 sm:p-4 text-center select-none"
            >
              {isBrideCard ? (
                <>
                  {/* Row 1: Left - Bride */}
                  <div className="text-left -mb-1 sm:-mb-2 pl-1 sm:pl-2">
                    <h2 className={`font-brownsugar font-bold text-white text-[30px] min-[360px]:text-[36px] sm:text-[42px] uppercase tracking-normal drop-shadow-lg leading-tight ${isCocohappiiText ? 'animate-cocohappii-left' : textAnimClass}`}>
                      <EditableText
                        value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                        onChange={(v) => updateField('bride.nickname', v)}
                        isEditing={isLiveEditing}
                        placeholder="Tên cô dâu"
                        className="text-white uppercase"
                      />
                    </h2>
                  </div>

                  {/* Row 2: Center - Double-Heart Swirl Flourish */}
                  <div className="text-center my-0 sm:my-0.5">
                    <span className={`inline-block ${isCocohappiiText ? 'animate-cocohappii-up' : ''}`}>
                      <img 
                        src="/templates/007/images/and-sign.png" 
                        alt="♥" 
                        className="w-[48px] h-[48px] min-[360px]:w-[54px] min-[360px]:h-[54px] sm:w-[60px] sm:h-[60px] inline-block object-contain drop-shadow select-none" 
                      />
                    </span>
                  </div>

                  {/* Row 3: Right - Groom */}
                  <div className="text-right pr-1 sm:pr-2">
                    <h2 className={`font-brownsugar font-bold text-white text-[30px] min-[360px]:text-[36px] sm:text-[42px] uppercase tracking-normal drop-shadow-lg leading-tight ${isCocohappiiText ? 'animate-cocohappii-right' : textAnimClass}`}>
                      <EditableText
                        value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                        onChange={(v) => updateField('groom.nickname', v)}
                        isEditing={isLiveEditing}
                        placeholder="Tên chú rể"
                        className="text-white uppercase"
                      />
                    </h2>
                  </div>
                </>
              ) : (
                <>
                  {/* Row 1: Left - Groom */}
                  <div className="text-left -mb-1 sm:-mb-2 pl-1 sm:pl-2">
                    <h2 className={`font-brownsugar font-bold text-white text-[30px] min-[360px]:text-[36px] sm:text-[42px] uppercase tracking-normal drop-shadow-lg leading-tight ${isCocohappiiText ? 'animate-cocohappii-left' : textAnimClass}`}>
                      <EditableText
                        value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                        onChange={(v) => updateField('groom.nickname', v)}
                        isEditing={isLiveEditing}
                        placeholder="Tên chú rể"
                        className="text-white uppercase"
                      />
                    </h2>
                  </div>

                  {/* Row 2: Center - Double-Heart Swirl Flourish */}
                  <div className="text-center my-0 sm:my-0.5">
                    <span className={`inline-block ${isCocohappiiText ? 'animate-cocohappii-up' : ''}`}>
                      <img 
                        src="/templates/007/images/and-sign.png" 
                        alt="♥" 
                        className="w-[48px] h-[48px] min-[360px]:w-[54px] min-[360px]:h-[54px] sm:w-[60px] sm:h-[60px] inline-block object-contain drop-shadow select-none" 
                      />
                    </span>
                  </div>

                  {/* Row 3: Right - Bride */}
                  <div className="text-right pr-1 sm:pr-2">
                    <h2 className={`font-brownsugar font-bold text-white text-[30px] min-[360px]:text-[36px] sm:text-[42px] uppercase tracking-normal drop-shadow-lg leading-tight ${isCocohappiiText ? 'animate-cocohappii-right' : textAnimClass}`}>
                      <EditableText
                        value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                        onChange={(v) => updateField('bride.nickname', v)}
                        isEditing={isLiveEditing}
                        placeholder="Tên cô dâu"
                        className="text-white uppercase"
                      />
                    </h2>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: SAVE-THE-DATE (COCOHAPPII ORIGINAL LAYOUT) ================= */}
        <div key={`save-the-date-${textAnimKey}-${textAnimClass}`} id="save-the-date" className="relative px-6 py-12 text-center border-b border-[#e5dec9] overflow-hidden">
          {/* Top left decorative sketch flower (257px rotate 22deg) */}
          <img
            src="/templates/007/images/decor-flower1.png"
            alt=""
            className="absolute -top-12 -left-14 w-60 pointer-events-none opacity-85 rotate-[22deg] z-0 select-none"
          />
          {/* Bottom right decorative sketch flower for enhanced splendour */}
          <img
            src="/templates/007/images/decor-flower4.png"
            alt=""
            className="absolute -bottom-10 -right-12 w-48 pointer-events-none opacity-80 rotate-[15deg] z-0 select-none"
          />

          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-motherland text-[#928362] mb-1 leading-relaxed whitespace-nowrap">
              <EditableText
                value={cardData.saveTheDateText || 'Save the date'}
                onChange={(v) => updateField('saveTheDateText', v)}
                isEditing={isLiveEditing}
                placeholder="Save the date"
                className="text-[#928362] whitespace-nowrap"
              />
            </h2>
            <div className="text-3xl sm:text-4xl font-avo text-[#928362] tracking-widest my-2 font-normal whitespace-nowrap">
              <EditableText
                value={cardData.saveTheDateDay || '26.12.2026'}
                onChange={(v) => updateField('saveTheDateDay', v)}
                isEditing={isLiveEditing}
                placeholder="26.12.2026"
                className="text-[#928362] whitespace-nowrap"
              />
            </div>

            {/* Divider Flower */}
            <div className="my-5 flex items-center justify-center">
              <img
                src="/templates/007/images/save-the-date-flower.png"
                alt="Flower Divider"
                style={{
                  width: cardData.saveTheDateFlowerSize ? `${cardData.saveTheDateFlowerSize}px` : undefined,
                  maxWidth: '100%'
                }}
                className={`mx-auto ${!cardData.saveTheDateFlowerSize ? 'w-24 sm:w-28 md:w-32' : ''} h-auto object-contain transition-all drop-shadow-xs`}
              />
            </div>

            {/* Parents Columns (Ảnh 2: font-avo, không tô đậm, đồng bộ màu vàng #928362, không rớt dòng) */}
            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm my-8 pt-2">
              {/* Left Column */}
              <div className="text-center pr-2 border-r border-[#e5dec9]">
                {isBrideCard ? (
                  // Mẫu 2 Nhà Gái: NHÀ GÁI BÊN TRÁI
                  <>
                    <p className="text-[#928362] uppercase tracking-wider mb-2.5 text-xs sm:text-sm font-avo font-normal whitespace-nowrap">
                      <span className="pb-1 border-b border-[#928362] inline-block font-medium">
                        <EditableText
                          value={cardData.parentBrideLabel || 'Nhà gái'}
                          onChange={(v) => updateField('parentBrideLabel', v)}
                          isEditing={isLiveEditing}
                          placeholder="Nhà gái"
                          className="text-[#928362]"
                        />
                      </span>
                    </p>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.bride?.fatherTitle || 'Ông. '}
                        onChange={(v) => updateField('bride.fatherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.bride?.father || 'Lê Ngọc Thanh'}
                        onChange={(v) => updateField('bride.father', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên bố cô dâu"
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.bride?.motherTitle || 'Bà. '}
                        onChange={(v) => updateField('bride.motherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.bride?.mother || 'Nguyễn Minh Nhật'}
                        onChange={(v) => updateField('bride.mother', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên mẹ cô dâu"
                      />
                    </div>
                  </>
                ) : (
                  // Mẫu 1 Nhà Trai: NHÀ TRAI BÊN TRÁI
                  <>
                    <p className="text-[#928362] uppercase tracking-wider mb-2.5 text-xs sm:text-sm font-avo font-normal whitespace-nowrap">
                      <span className="pb-1 border-b border-[#928362] inline-block font-medium">
                        <EditableText
                          value={cardData.parentGroomLabel || 'Nhà trai'}
                          onChange={(v) => updateField('parentGroomLabel', v)}
                          isEditing={isLiveEditing}
                          placeholder="Nhà trai"
                          className="text-[#928362]"
                        />
                      </span>
                    </p>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.groom?.fatherTitle || 'Ông. '}
                        onChange={(v) => updateField('groom.fatherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.groom?.father || 'Hoàng Đình Thanh'}
                        onChange={(v) => updateField('groom.father', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên bố chú rể"
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.groom?.motherTitle || 'Bà. '}
                        onChange={(v) => updateField('groom.motherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.groom?.mother || 'Trần Thị Hằng Nga'}
                        onChange={(v) => updateField('groom.mother', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên mẹ chú rể"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Right Column */}
              <div className="text-center pl-2">
                {isBrideCard ? (
                  // Mẫu 2 Nhà Gái: NHÀ TRAI BÊN PHẢI
                  <>
                    <p className="text-[#928362] uppercase tracking-wider mb-2.5 text-xs sm:text-sm font-avo font-normal whitespace-nowrap">
                      <span className="pb-1 border-b border-[#928362] inline-block font-medium">
                        <EditableText
                          value={cardData.parentGroomLabel || 'Nhà trai'}
                          onChange={(v) => updateField('parentGroomLabel', v)}
                          isEditing={isLiveEditing}
                          placeholder="Nhà trai"
                          className="text-[#928362]"
                        />
                      </span>
                    </p>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.groom?.fatherTitle || 'Ông. '}
                        onChange={(v) => updateField('groom.fatherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.groom?.father || 'Hoàng Đình Thanh'}
                        onChange={(v) => updateField('groom.father', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên bố chú rể"
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.groom?.motherTitle || 'Bà. '}
                        onChange={(v) => updateField('groom.motherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.groom?.mother || 'Trần Thị Hằng Nga'}
                        onChange={(v) => updateField('groom.mother', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên mẹ chú rể"
                      />
                    </div>
                  </>
                ) : (
                  // Mẫu 1 Nhà Trai: NHÀ GÁI BÊN PHẢI
                  <>
                    <p className="text-[#928362] uppercase tracking-wider mb-2.5 text-xs sm:text-sm font-avo font-normal whitespace-nowrap">
                      <span className="pb-1 border-b border-[#928362] inline-block font-medium">
                        <EditableText
                          value={cardData.parentBrideLabel || 'Nhà gái'}
                          onChange={(v) => updateField('parentBrideLabel', v)}
                          isEditing={isLiveEditing}
                          placeholder="Nhà gái"
                          className="text-[#928362]"
                        />
                      </span>
                    </p>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.bride?.fatherTitle || 'Ông. '}
                        onChange={(v) => updateField('bride.fatherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.bride?.father || 'Lê Ngọc Thanh'}
                        onChange={(v) => updateField('bride.father', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên bố cô dâu"
                      />
                    </div>
                    <div className="text-xs sm:text-sm text-[#928362] font-normal leading-relaxed font-avo whitespace-nowrap">
                      <EditableText
                        value={cardData.bride?.motherTitle || 'Bà. '}
                        onChange={(v) => updateField('bride.motherTitle', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                      />
                      <EditableText
                        value={cardData.bride?.mother || 'Nguyễn Minh Nhật'}
                        onChange={(v) => updateField('bride.mother', v)}
                        isEditing={isLiveEditing}
                        className="text-[#928362] font-normal"
                        placeholder="Tên mẹ cô dâu"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Groom & Bride Full-Width Cards (Cocohappii Original Layout: aspect-[336/398], stacked, gradient & fonts) */}
            <div className="space-y-7 mt-8 max-w-[340px] mx-auto text-center">
              {isBrideCard ? (
                // Mẫu 2 Nhà Gái: CÔ DÂU Ở TRÊN, CHÚ RỂ Ở DƯỚI
                <>
                  {/* Bride Card (Trên) */}
                  <div className={`relative aspect-[336/398] w-full rounded-xl overflow-hidden shadow-xl border border-[#e5dec9] group ${brideCardAnim}`}>
                    <img
                      key={`bride-img-${photoAnimKey}-${photoAnimClass}`}
                      src={cardData.bride?.avatar || '/templates/007/images/bride.jpg'}
                      alt={brideName}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#928362] via-[#928362]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3.5 inset-x-0 text-center px-4 z-10">
                      <span className="font-motherland text-2xl text-white block -rotate-6 text-left pl-3 drop-shadow">
                        <EditableText
                          value={cardData.brideTagLabel || 'Cô dâu'}
                          onChange={(v) => updateField('brideTagLabel', v)}
                          isEditing={isLiveEditing}
                          className="text-white"
                        />
                      </span>
                      <span className="font-brownsugar font-bold text-3xl sm:text-4xl text-white uppercase block mt-1 tracking-wider drop-shadow-md">
                        <EditableText
                          value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                          onChange={(v) => updateField('bride.nickname', v)}
                          isEditing={isLiveEditing}
                          className="text-white uppercase"
                        />
                      </span>
                    </div>
                  </div>

                  {/* Groom Card (Dưới) */}
                  <div className={`relative aspect-[336/398] w-full rounded-xl overflow-hidden shadow-xl border border-[#e5dec9] group ${groomCardAnim}`}>
                    <img
                      key={`groom-img-${photoAnimKey}-${photoAnimClass}`}
                      src={cardData.groom?.avatar || '/templates/007/images/groom.jpg'}
                      alt={groomName}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#928362] via-[#928362]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3.5 inset-x-0 text-center px-4 z-10">
                      <span className="font-motherland text-2xl text-white block -rotate-6 text-left pl-3 drop-shadow">
                        <EditableText
                          value={cardData.groomTagLabel || 'Chú rể'}
                          onChange={(v) => updateField('groomTagLabel', v)}
                          isEditing={isLiveEditing}
                          className="text-white"
                        />
                      </span>
                      <span className="font-brownsugar font-bold text-3xl sm:text-4xl text-white uppercase block mt-1 tracking-wider drop-shadow-md">
                        <EditableText
                          value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                          onChange={(v) => updateField('groom.nickname', v)}
                          isEditing={isLiveEditing}
                          className="text-white uppercase"
                        />
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                // Mẫu 1 Nhà Trai: CHÚ RỂ Ở TRÊN, CÔ DÂU Ở DƯỚI
                <>
                  {/* Groom Card (Trên) */}
                  <div className={`relative aspect-[336/398] w-full rounded-xl overflow-hidden shadow-xl border border-[#e5dec9] group ${groomCardAnim}`}>
                    <img
                      key={`groom-img-${photoAnimKey}-${photoAnimClass}`}
                      src={cardData.groom?.avatar || '/templates/007/images/groom.jpg'}
                      alt={groomName}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#928362] via-[#928362]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3.5 inset-x-0 text-center px-4 z-10">
                      <span className="font-motherland text-2xl text-white block -rotate-6 text-left pl-3 drop-shadow">
                        <EditableText
                          value={cardData.groomTagLabel || 'Chú rể'}
                          onChange={(v) => updateField('groomTagLabel', v)}
                          isEditing={isLiveEditing}
                          className="text-white"
                        />
                      </span>
                      <span className="font-brownsugar font-bold text-3xl sm:text-4xl text-white uppercase block mt-1 tracking-wider drop-shadow-md">
                        <EditableText
                          value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                          onChange={(v) => updateField('groom.nickname', v)}
                          isEditing={isLiveEditing}
                          className="text-white uppercase"
                        />
                      </span>
                    </div>
                  </div>

                  {/* Bride Card (Dưới) */}
                  <div className={`relative aspect-[336/398] w-full rounded-xl overflow-hidden shadow-xl border border-[#e5dec9] group ${brideCardAnim}`}>
                    <img
                      key={`bride-img-${photoAnimKey}-${photoAnimClass}`}
                      src={cardData.bride?.avatar || '/templates/007/images/bride.jpg'}
                      alt={brideName}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#928362] via-[#928362]/60 to-transparent pointer-events-none"></div>
                    <div className="absolute bottom-3.5 inset-x-0 text-center px-4 z-10">
                      <span className="font-motherland text-2xl text-white block -rotate-6 text-left pl-3 drop-shadow">
                        <EditableText
                          value={cardData.brideTagLabel || 'Cô dâu'}
                          onChange={(v) => updateField('brideTagLabel', v)}
                          isEditing={isLiveEditing}
                          className="text-white"
                        />
                      </span>
                      <span className="font-brownsugar font-bold text-3xl sm:text-4xl text-white uppercase block mt-1 tracking-wider drop-shadow-md">
                        <EditableText
                          value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                          onChange={(v) => updateField('bride.nickname', v)}
                          isEditing={isLiveEditing}
                          className="text-white uppercase"
                        />
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* ================= SECTION 3: CARD-INFO (COCOHAPPII ORIGINAL CEREMONY & EVENTS) ================= */}
        <div id="card-info" className="relative px-6 py-12 text-center border-b border-[#e5dec9] overflow-hidden">
          {/* Top right decorative sketch flower (227px rotate -22deg flipped) */}
          <img
            src="/templates/007/images/decor-flower2.png"
            alt=""
            className="absolute -top-12 -right-16 w-56 pointer-events-none opacity-85 rotate-[-22deg] scale-x-[-1] z-0 select-none"
          />
          {/* Left center decorative sketch flower (Ảnh 1: Beside Venue & Address) */}
          <img
            src="/templates/007/images/decor-flower1.png"
            alt=""
            className="absolute -left-14 bottom-24 w-52 pointer-events-none opacity-85 rotate-[12deg] z-0 select-none"
          />

          <div className="relative z-10">
            {/* 1. DÒNG CHỮ LỜI MỜI & TÊN DÂU RỂ (COCOHAPPII ORIGINAL) */}
            {cardData.sectionVisibility?.greeting !== false && (
              <div key={`greeting-text-${textAnimKey}-${textAnimClass}`} className={textAnimClass}>
                {/* Swans Emblem Icon (Cocohappii Original 105px) */}
                <div className="mb-4">
                  <img
                    src="/templates/007/images/swans.png"
                    alt="Swans"
                    className="mx-auto w-[105px] object-contain drop-shadow-sm"
                  />
                </div>

                {/* Dòng chữ Lời mời (1 dòng liền mạch, không rớt chữ) */}
                <div className="font-avo text-[#928362] mb-3">
                  <div className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-wider whitespace-nowrap">
                    <EditableText
                      value={cardData.invitationGreeting || 'Trân trọng kính mời'}
                      onChange={(v) => updateField('invitationGreeting', v)}
                      isEditing={isLiveEditing}
                      placeholder="Trân trọng kính mời"
                      className="text-[#928362] whitespace-nowrap"
                    />
                  </div>
                  <div className="text-xs sm:text-sm mt-1 whitespace-nowrap">
                    <EditableText
                      value={cardData.invitationSub || 'đến tham dự lễ cưới của'}
                      onChange={(v) => updateField('invitationSub', v)}
                      isEditing={isLiveEditing}
                      placeholder="đến tham dự lễ cưới của"
                      className="text-[#928362] whitespace-nowrap"
                    />
                  </div>
                </div>

                {/* Tên Cô Dâu Chú Rể (Cocohappii Original vl-brown-sugar + and-sign-dark.png, 1 dòng liền mạch) */}
                <div className="text-lg min-[360px]:text-xl sm:text-2xl md:text-3xl font-brownsugar font-bold text-[#928362] tracking-normal min-[360px]:tracking-wider uppercase flex items-center justify-center gap-1.5 sm:gap-2.5 mb-8 flex-nowrap whitespace-nowrap">
                  {isBrideCard ? (
                    <>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-left' : textAnimClass} whitespace-nowrap`}>
                        <EditableText
                          value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                          onChange={(v) => updateField('bride.nickname', v)}
                          isEditing={isLiveEditing}
                          placeholder="Tên cô dâu"
                          className="text-[#928362] uppercase whitespace-nowrap"
                        />
                      </span>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-up' : ''} inline-block shrink-0`}>
                        <img src="/templates/007/images/and-sign-dark.png" alt="&" className="h-5 sm:h-7 inline-block mx-0.5 sm:mx-1 shrink-0" />
                      </span>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-right' : textAnimClass} whitespace-nowrap`}>
                        <EditableText
                          value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                          onChange={(v) => updateField('groom.nickname', v)}
                          isEditing={isLiveEditing}
                          placeholder="Tên chú rể"
                          className="text-[#928362] uppercase whitespace-nowrap"
                        />
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-left' : textAnimClass} whitespace-nowrap`}>
                        <EditableText
                          value={cardData.groom?.nickname || cardData.groom?.name || 'Đình Hiếu'}
                          onChange={(v) => updateField('groom.nickname', v)}
                          isEditing={isLiveEditing}
                          placeholder="Tên chú rể"
                          className="text-[#928362] uppercase whitespace-nowrap"
                        />
                      </span>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-up' : ''} inline-block shrink-0`}>
                        <img src="/templates/007/images/and-sign-dark.png" alt="&" className="h-5 sm:h-7 inline-block mx-0.5 sm:mx-1 shrink-0" />
                      </span>
                      <span className={`${isCocohappiiText ? 'animate-cocohappii-right' : textAnimClass} whitespace-nowrap`}>
                        <EditableText
                          value={cardData.bride?.nickname || cardData.bride?.name || 'Thanh Thúy'}
                          onChange={(v) => updateField('bride.nickname', v)}
                          isEditing={isLiveEditing}
                          placeholder="Tên cô dâu"
                          className="text-[#928362] uppercase whitespace-nowrap"
                        />
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Events List (TIỆC CƯỚI NHÀ TRAI / LỄ THÀNH HÔN) */}
            {cardData.sectionVisibility?.events !== false && (cardData.events || []).length > 0 && (
              <div key={`events-text-${textAnimKey}-${textAnimClass}`} className={`space-y-10 ${textAnimClass}`}>
                {(cardData.events || []).map((ev, index) => (
                  <div key={ev.id || index} className="space-y-4">
                    {index > 0 && (
                      <div className="w-3/4 mx-auto border-t border-dashed border-[#928362]/40 my-8"></div>
                    )}

                    {/* Tiêu đề Sự kiện dạng Pill Button đặc trưng Cocohappii (1 dòng không ngắt) */}
                    <div className="text-center my-2">
                      <div className="inline-block bg-[#928362] text-white px-7 py-2 rounded-full font-bold text-xs sm:text-sm tracking-wider uppercase shadow-md whitespace-nowrap">
                        <EditableText
                          value={ev.title}
                          onChange={(v) => updateEventField(index, 'title', v)}
                          isEditing={isLiveEditing}
                          placeholder="TIÊU ĐỀ SỰ KIỆN"
                          className="text-white uppercase whitespace-nowrap"
                        />
                      </div>
                    </div>

                    {/* 3-Column Time & Date Box with blackmango day */}
                    <div className="flex items-center justify-center gap-3 my-4">
                      <div className="text-sm font-bold text-[#928362] uppercase tracking-wider text-right w-24 whitespace-nowrap">
                        <EditableText
                          value={ev.time}
                          onChange={(v) => updateEventField(index, 'time', v)}
                          isEditing={isLiveEditing}
                          placeholder="16 GIỜ"
                          className="text-[#928362] whitespace-nowrap"
                        />
                      </div>

                      <div className="w-[1px] h-14 bg-[#928362]/40 shrink-0"></div>

                      <div className="text-center px-3">
                        <div className="text-xs text-[#928362] font-bold uppercase tracking-wider whitespace-nowrap">
                          <EditableText
                            value={ev.dayOfWeek || 'Thứ Bảy'}
                            onChange={(v) => updateEventField(index, 'dayOfWeek', v)}
                            isEditing={isLiveEditing}
                            placeholder="Thứ"
                            className="text-[#928362] whitespace-nowrap"
                          />
                        </div>
                        <div className="font-blackmango text-5xl sm:text-6xl text-[#928362] leading-none my-0.5 whitespace-nowrap">
                          <EditableText
                            value={ev.date || '26'}
                            onChange={(v) => updateEventField(index, 'date', v)}
                            isEditing={isLiveEditing}
                            placeholder="26"
                            className="text-[#928362] whitespace-nowrap"
                          />
                        </div>
                        <div className="text-xs text-[#928362] font-bold uppercase tracking-wider whitespace-nowrap">
                          <EditableText
                            value={ev.month || 'Tháng 12'}
                            onChange={(v) => updateEventField(index, 'month', v)}
                            isEditing={isLiveEditing}
                            placeholder="Tháng 12"
                            className="text-[#928362] whitespace-nowrap"
                          />
                        </div>
                      </div>

                      <div className="w-[1px] h-14 bg-[#928362]/40 shrink-0"></div>

                      <div className="text-sm font-bold text-[#928362] text-left w-24 whitespace-nowrap">
                        <EditableText
                          value={ev.year || 'Năm 2026'}
                          onChange={(v) => updateEventField(index, 'year', v)}
                          isEditing={isLiveEditing}
                          placeholder="Năm 2026"
                          className="text-[#928362] whitespace-nowrap"
                        />
                      </div>
                    </div>

                    {/* Lunar Date (Tức ngày...) */}
                    <p className="text-xs text-[#928362] italic whitespace-nowrap">
                      <EditableText
                        value={ev.lunarDate || '(Tức ngày 18 tháng 11 năm Bính Ngọ)'}
                        onChange={(v) => updateEventField(index, 'lunarDate', v)}
                        isEditing={isLiveEditing}
                        placeholder="Ngày âm lịch"
                        className="text-[#928362] whitespace-nowrap"
                      />
                    </p>

                    {/* Venue & Address */}
                    <div className="text-xs sm:text-sm space-y-1 pt-2">
                      <p className="font-bold text-[#928362] text-sm sm:text-base uppercase tracking-wide whitespace-nowrap">
                        <EditableText
                          value={ev.venue}
                          onChange={(v) => updateEventField(index, 'venue', v)}
                          isEditing={isLiveEditing}
                          placeholder="Tên địa điểm (Tại...)"
                          className="text-[#928362] whitespace-nowrap"
                        />
                      </p>
                      <p className="text-stone-700 max-w-xs mx-auto leading-relaxed">
                        <EditableText
                          value={ev.address}
                          onChange={(v) => updateEventField(index, 'address', v)}
                          isEditing={isLiveEditing}
                          placeholder="Địa chỉ cụ thể"
                        />
                      </p>
                    </div>

                    {/* Map Button (Cocohappii Original rounded pill) */}
                    <div className="pt-2">
                      <a
                        href={ev.mapUrl || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 px-6 py-2 rounded-full bg-[#928362] hover:bg-[#7a6b4c] text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>
                          <EditableText
                            value={ev.mapBtnText || 'Chỉ đường'}
                            onChange={(v) => updateEventField(index, 'mapBtnText', v)}
                            isEditing={isLiveEditing}
                            className="text-white whitespace-nowrap"
                          />
                        </span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Custom Sections Added By User */}
            {(cardData.customSections || []).map((cs, index) => (
              <div key={cs.id || index} className={`space-y-3 mt-8 pt-8 border-t border-[#928362]/30 ${textAnimClass}`}>
                <h3 className="text-xl font-bold font-serif-elegant text-[#928362] uppercase tracking-wide whitespace-nowrap">
                  {cs.title}
                </h3>
                {cs.subtitle && (
                  <p className="text-sm font-serif-elegant italic text-[#928362] whitespace-nowrap">
                    {cs.subtitle}
                  </p>
                )}
                {cs.content && (
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed max-w-sm mx-auto whitespace-pre-line">
                    {cs.content}
                  </p>
                )}
              </div>
            ))}

          </div>
        </div>

        {/* ================= SECTION 4: CARD-CALENDAR ================= */}
        {cardData.sectionVisibility?.calendar !== false && (
          <div 
            key={`calendar-text-${textAnimKey}-${textAnimClass}`} 
            id="card-calendar" 
            className="w-full block relative px-3 sm:px-6 py-10 sm:py-12 border-b border-[#e5dec9] overflow-hidden"
          >
            {/* Flower sketch decorations on left and right for rich atmosphere */}
            <img
              src="/templates/007/images/decor-flower3.png"
              alt=""
              className="absolute -top-8 -left-12 w-48 pointer-events-none opacity-80 rotate-[20deg] z-0 select-none"
            />
            <img
              src="/templates/007/images/decor-flower4.png"
              alt=""
              className="absolute -bottom-6 -right-10 w-44 pointer-events-none opacity-80 rotate-[-15deg] z-0 select-none"
            />

            <div className={`relative z-10 w-full ${textAnimClass}`}>
              <MiniCalendar targetDate={cardData.weddingDate || '2026-11-29'} events={cardData.events} />
            </div>
          </div>
        )}

        {/* ================= SECTION: ẢNH CƯỚI NGHỆ THUẬT DƯỚI PHẦN LỊCH (ĐỘC LẬP HOÀN TOÀN VỚI TIMELINE) ================= */}
        {cardData.sectionVisibility?.timelinePhoto !== false && (
          <div id="card-calendar-photo" className="relative border-b border-[#e5dec9] overflow-hidden bg-stone-900">
            {/* Khung ảnh chiều cao tối ưu cho ảnh cưới (thấy rõ khuôn mặt cô dâu & chú rể) */}
            <div className="relative w-full h-80 sm:h-96 md:h-[440px] overflow-hidden flex items-center justify-center">
              <img
                key={`timeline-img-${photoAnimKey}-${photoAnimClass}`}
                src={cardData.timelineBgPhoto || '/templates/007/images/timeline_bg.jpg'}
                alt="Ảnh cưới cô dâu chú rể"
                style={{
                  objectPosition: cardData.timelineBgPhotoPosition || 'center 15%'
                }}
                className={`w-full h-full object-cover filter brightness-90 ${isCocohappiiPhoto ? 'animate-kenburns' : photoAnimClass}`}
              />
              {/* Hiệu ứng bóng đổ nhẹ ở góc dưới để tôn chữ/icon mà không che mặt cô dâu chú rể */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex items-center justify-center pointer-events-none">
                <img
                  src="/templates/007/images/love.png"
                  alt="Love"
                  className="h-14 sm:h-16 object-contain drop-shadow-xl"
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 5: CARD-TIMELINES (MỐC LỊCH TRÌNH TIỆC CƯỚI) ================= */}
        {cardData.sectionVisibility?.timeline !== false && (
          <div id="card-timelines" className="relative border-b border-[#e5dec9] overflow-hidden">
            {/* Timeline sketch flowers along the sides */}
            <img
              src="/templates/007/images/decor-flower2.png"
              alt=""
              className="absolute top-8 -right-12 w-48 pointer-events-none opacity-75 rotate-[30deg] z-0 select-none"
            />
            <img
              src="/templates/007/images/decor-flower1.png"
              alt=""
              className="absolute bottom-10 -left-14 w-48 pointer-events-none opacity-75 rotate-[-20deg] z-0 select-none"
            />

            <div className="relative z-10 px-6 py-10">
              {/* Tiêu đề Timeline trong font-highspirited theo ảnh người dùng gửi */}
              <h2 className={`text-5xl sm:text-6xl font-highspirited text-[#928362] text-center mb-6 whitespace-nowrap select-none ${textAnimClass}`}>
                <EditableText
                  value={cardData.timelineHeading || 'Timeline'}
                  onChange={(v) => updateField('timelineHeading', v)}
                  isEditing={isLiveEditing}
                  placeholder="Timeline"
                  className="text-[#928362] whitespace-nowrap font-highspirited"
                />
              </h2>

              {/* Các mốc Timeline với hoa timeline-flower-beige */}
              <div className="space-y-6 max-w-xs mx-auto">
                {(cardData.timeline || []).map((tl, index) => (
                  <div key={tl.id || index} className="flex items-center gap-4 bg-white/90 backdrop-blur-xs p-3.5 rounded-2xl shadow-sm border border-[#d8cdb4]">
                    <div className="w-12 h-12 rounded-xl bg-[#f8f4ec] flex items-center justify-center p-2 shrink-0 border border-[#d8cdb4]">
                      <img
                        src={tl.icon || `/templates/007/images/icon-tl${(index % 2) + 1}.png`}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1">
                      <span className="text-base font-bold text-[#928362] block leading-tight font-avo whitespace-nowrap">
                        <EditableText
                          value={tl.time}
                          onChange={(v) => updateTimelineField(index, 'time', v)}
                          isEditing={isLiveEditing}
                          placeholder="15:00"
                          className="text-[#928362] whitespace-nowrap"
                        />
                      </span>
                      <span className="text-[11px] font-semibold text-[#928362]/80 uppercase tracking-wide block whitespace-nowrap">
                        <EditableText
                          value={tl.date}
                          onChange={(v) => updateTimelineField(index, 'date', v)}
                          isEditing={isLiveEditing}
                          placeholder="NGÀY 26.12.2026"
                          className="text-[#928362]/80 whitespace-nowrap"
                        />
                      </span>
                      <span className="text-xs font-bold text-stone-800 block whitespace-nowrap">
                        <EditableText
                          value={tl.title}
                          onChange={(v) => updateTimelineField(index, 'title', v)}
                          isEditing={isLiveEditing}
                          placeholder="ĐÓN KHÁCH"
                          className="whitespace-nowrap"
                        />
                      </span>
                    </div>

                    <img
                      src={tl.flower || '/templates/007/images/timeline-flower-beige.png'}
                      alt=""
                      className="w-11 object-contain shrink-0"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION 6: CARD-GALLERY (OUR MEMORIES) ================= */}
        <div id="card-gallery" className="relative px-5 py-10 border-b border-[#e5dec9] overflow-hidden">
          {/* Flower sketch decorations in gallery corners */}
          <img
            src="/templates/007/images/decor-flower1.png"
            alt=""
            className="absolute -top-6 -left-12 w-48 pointer-events-none opacity-75 rotate-[-10deg] z-0 select-none"
          />
          <img
            src="/templates/007/images/decor-flower3.png"
            alt=""
            className="absolute -bottom-6 -right-12 w-48 pointer-events-none opacity-75 rotate-[15deg] z-0 select-none"
          />

          <div className="relative z-10 text-center mb-6">
            <h2 className={`text-3xl font-motherland text-[#928362] whitespace-nowrap ${textAnimClass}`}>
              <EditableText
                value={cardData.galleryHeading || 'Our Memories'}
                onChange={(v) => updateField('galleryHeading', v)}
                isEditing={isLiveEditing}
                placeholder="Our Memories"
                className="text-[#928362] whitespace-nowrap"
              />
            </h2>
            <div className="w-12 h-[2px] bg-[#928362] mx-auto mt-2"></div>
          </div>

          {/* Quick guide in preview/admin mode */}
          {(isPreview || isAdmin) && (
            <div className="relative z-20 mb-3 text-center">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 bg-amber-100/90 border border-amber-300 py-1.5 px-3.5 rounded-full shadow-xs select-none">
                <span>✋ Nhấn giữ vào ảnh và kéo thả để sắp xếp lại album</span>
              </span>
            </div>
          )}

          {/* Photos Masonry - Natural full view with ZERO blank space */}
          <div className="relative z-10 columns-2 gap-3">
            {(cardData.gallery || []).map((photo, index) => {
              const galleryAnimClass = isCocohappiiPhoto
                ? (index % 2 === 0 ? 'animate-cocohappii-photo-left' : 'animate-cocohappii-photo-right')
                : photoAnimClass;

              const isDragging = cardDragIdx === index;
              const isOver = cardDragOverIdx === index;

              return (
                <div
                  key={photo.id || index}
                  data-gallery-idx={index}
                  draggable={isPreview || isAdmin}
                  onDragStart={(e) => handleCardDragStart(e, index)}
                  onDragOver={(e) => handleCardDragOver(e, index)}
                  onDragEnd={handleCardDragEnd}
                  onDrop={(e) => handleCardDrop(e, index)}
                  onTouchStart={(e) => handleCardTouchStart(e, index)}
                  onTouchMove={handleCardTouchMove}
                  onTouchEnd={handleCardTouchEnd}
                  onClick={() => {
                    if (!hasDragged && cardDragIdx === null) {
                      setLightboxIndex(index);
                    }
                  }}
                  style={{
                    cursor: (isPreview || isAdmin)
                      ? (isDragging ? 'grabbing' : 'grab')
                      : 'pointer'
                  }}
                  className={`break-inside-avoid mb-3 relative rounded-xl overflow-hidden shadow-sm transition-all duration-200 select-none ${
                    isDragging
                      ? 'opacity-40 scale-95 ring-2 ring-amber-500 border-2 border-dashed border-amber-500 shadow-inner'
                      : isOver
                      ? 'ring-4 ring-amber-500 scale-[1.03] shadow-2xl z-30 brightness-105'
                      : (isPreview || isAdmin)
                      ? 'hover:shadow-lg hover:scale-[1.01] cursor-grab active:cursor-grabbing'
                      : 'cursor-pointer'
                  }`}
                >
                  <img
                    key={`gallery-img-${photoAnimKey}-${photoAnimClass}-${index}`}
                    src={photo.url}
                    alt={photo.caption || ''}
                    draggable={false}
                    className={`w-full h-auto block rounded-xl pointer-events-none select-none transition-transform duration-500 ${galleryAnimClass}`}
                  />

                  {/* Order badge & subtle hand grip indicator on top-left (No arrows!) */}
                  {(isPreview || isAdmin) && (
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white/20 select-none pointer-events-none">
                      <span className="text-amber-300">✋</span>
                      <span>#{index + 1}</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl pointer-events-none">
                    {(isPreview || isAdmin) ? (
                      <span className="bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md border border-white/20 flex items-center gap-1">
                        <span>✋ Kéo để đổi vị trí</span>
                      </span>
                    ) : (
                      <Maximize2 className="w-5 h-5 text-white drop-shadow" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= SECTION 7: CARD-GIFT (HỘP MỪNG CƯỚI) ================= */}
        <div id="card-gift" className="relative px-6 py-10 text-center border-b border-[#e5dec9] overflow-hidden">
          {/* Flower sketch decorations */}
          <img
            src="/templates/007/images/decor-flower4.png"
            alt=""
            className="absolute -top-4 -left-10 w-44 pointer-events-none opacity-75 rotate-[25deg] z-0 select-none"
          />
          <img
            src="/templates/007/images/decor-flower2.png"
            alt=""
            className="absolute -bottom-4 -right-10 w-44 pointer-events-none opacity-75 rotate-[-20deg] z-0 select-none"
          />

          <div className="relative z-10">
            {/* Tiêu đề Hộp mừng cưới - giãn khoảng cách đáy để đuôi chữ "g" và "p" không chạm dòng dưới */}
            <h2 className={`text-3xl sm:text-4xl font-motherland text-[#928362] mb-6 sm:mb-7 whitespace-nowrap select-none ${textAnimClass}`}>
              <EditableText
                value={cardData.giftHeading || 'Hộp mừng cưới'}
                onChange={(v) => updateField('giftHeading', v)}
                isEditing={isLiveEditing}
                placeholder="Hộp mừng cưới"
                className="text-[#928362] whitespace-nowrap"
              />
            </h2>
            <p className="text-xs text-stone-600 max-w-xs mx-auto mb-6 leading-relaxed">
              <EditableText
                value={cardData.giftSubtitle || 'Cảm ơn tình cảm của mọi người đã dành cho chúng mình!'}
                onChange={(v) => updateField('giftSubtitle', v)}
                isEditing={isLiveEditing}
                multiline={true}
                placeholder="Lời cảm ơn mừng cưới..."
              />
            </p>

            {/* Present Box Image */}
            <div
              onClick={() => setGiftModalOpen(true)}
              className="w-28 h-28 mx-auto cursor-pointer transition-transform hover:scale-110 mb-3"
              title="Nhấn để mở hộp mừng cưới"
            >
              <img
                src="/templates/007/images/present-beige.png"
                alt="Hộp quà mừng cưới"
                className="w-full h-full object-contain animate-pulse-slow drop-shadow-md"
              />
            </div>

            <button
              onClick={() => setGiftModalOpen(true)}
              className="px-6 py-2 rounded-full bg-[#928362] hover:bg-[#7a6b4c] text-white text-xs font-semibold shadow-md transition-all whitespace-nowrap"
            >
              <EditableText
                value={cardData.giftButtonLabel || 'Mở Hộp Mừng Cưới'}
                onChange={(v) => updateField('giftButtonLabel', v)}
                isEditing={isLiveEditing}
                className="text-white whitespace-nowrap"
              />
            </button>
          </div>
        </div>

        {/* ================= SECTION 8: CARD-COMMENTS (SỔ LƯU BÚT & COUNTDOWN) ================= */}
        <div id="card-comments" className="relative px-6 py-10 border-b border-[#e5dec9] overflow-hidden">
          {/* Flower decorations on left and right (Cocohappii Original decor-flower3 & decor-flower4 + bottom flower) */}
          <img
            src="/templates/007/images/decor-flower3.png"
            alt=""
            className="absolute top-2 right-0 w-28 pointer-events-none opacity-80 z-0 select-none"
          />
          <img
            src="/templates/007/images/decor-flower4.png"
            alt=""
            className="absolute bottom-40 left-0 w-28 pointer-events-none opacity-80 z-0 select-none"
          />
          <img
            src="/templates/007/images/decor-flower1.png"
            alt=""
            className="absolute -bottom-6 -right-12 w-44 pointer-events-none opacity-75 rotate-[-25deg] z-0 select-none"
          />

          <div className="relative z-10 text-center mb-6">
            <h2 className="text-3xl sm:text-4xl font-motherland text-[#928362] mb-1 whitespace-nowrap">
              <EditableText
                value={cardData.commentsHeading || 'Sổ lưu bút'}
                onChange={(v) => updateField('commentsHeading', v)}
                isEditing={isLiveEditing}
                placeholder="Sổ lưu bút"
                className="text-[#928362] whitespace-nowrap"
              />
            </h2>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              <EditableText
                value={cardData.commentsSubtitle || 'Cảm ơn bạn rất nhiều vì đã gửi những lời chúc mừng tốt đẹp nhất đến đám cưới của chúng tôi!'}
                onChange={(v) => updateField('commentsSubtitle', v)}
                isEditing={isLiveEditing}
                multiline={true}
                placeholder="Lời cảm ơn lưu bút..."
              />
            </p>
          </div>

          {/* Form Sổ Lưu Bút */}
          <form onSubmit={handleWishSubmit} className="relative z-20 space-y-3.5 max-w-sm mx-auto text-xs">
            {wishSubmitted && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs flex items-center justify-center gap-2 font-medium shadow-sm animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Lời chúc của bạn đã được gửi thành công! Cảm ơn bạn rất nhiều ♥</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#70561f] mb-1">
                Tên khách mời gửi chúc:
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tên của bạn (Tự động điền theo thiệp)*"
                value={wishForm.name}
                onChange={(e) => setWishForm({ ...wishForm, name: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#d8cdb4] bg-white focus:outline-none focus:ring-2 focus:ring-[#928362]/30 focus:border-[#928362] text-xs font-medium text-stone-800 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#70561f] mb-1">
                Lời chúc của bạn:
              </label>
              <textarea
                required
                rows={3}
                placeholder="Nhập lời chúc phúc tốt đẹp nhất gửi tới cô dâu & chú rể...*"
                value={wishForm.message}
                onChange={(e) => setWishForm({ ...wishForm, message: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl border border-[#d8cdb4] bg-white focus:outline-none focus:ring-2 focus:ring-[#928362]/30 focus:border-[#928362] text-xs text-stone-800 shadow-xs resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-full bg-[#928362] hover:bg-[#7a6b4c] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer active:scale-98"
            >
              <Send className="w-4 h-4 text-amber-200" />
              <span>{cardData.submitWishButtonText || 'Gửi Lời Chúc'}</span>
            </button>
          </form>

          {/* Wishes List preview */}
          {cardData.wishes && cardData.wishes.length > 0 && (
            <div className="relative z-10 mt-7 space-y-2.5 max-w-sm mx-auto">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#928362]">
                  Lời chúc từ người thân & bạn bè ({cardData.wishes.length})
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                {cardData.wishes.map((w, idx) => {
                  const isBrideSide = w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái');
                  return (
                    <div key={w.id || idx} className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl border border-[#e5dec9] shadow-xs text-xs text-stone-700 space-y-1">
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-[#70561f] text-sm">{w.name}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${isBrideSide ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                            {isBrideSide ? '👰 Họ Nhà Gái' : '🤵 Họ Nhà Trai'}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400 shrink-0">{w.createdAt || 'Mới'}</span>
                      </div>
                      <p className="text-stone-700 italic leading-relaxed pt-0.5">"{w.message}"</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Countdown Block with blackmango numbers (1 dòng) */}
          <div className="relative z-10 mt-10 text-center">
            <h3 className="text-3xl font-motherland text-[#928362] mb-3 whitespace-nowrap">
              <EditableText
                value={cardData.countdownHeading || 'Countdown'}
                onChange={(v) => updateField('countdownHeading', v)}
                isEditing={isLiveEditing}
                placeholder="Countdown"
                className="text-[#928362] whitespace-nowrap"
              />
            </h3>
            <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto">
              {[
                { label: cardData.countdownLabels?.days || 'Ngày', val: countdown.days },
                { label: cardData.countdownLabels?.hours || 'Giờ', val: countdown.hours },
                { label: cardData.countdownLabels?.minutes || 'Phút', val: countdown.minutes },
                { label: cardData.countdownLabels?.seconds || 'Giây', val: countdown.seconds }
              ].map((c, i) => (
                <div key={i} className="bg-white/90 backdrop-blur-xs p-2.5 rounded-xl border border-[#d8cdb4] shadow-sm flex flex-col items-center">
                  <span className="text-2xl sm:text-3xl font-bold font-blackmango text-[#928362]">
                    {String(c.val).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-[#928362] mt-0.5 whitespace-nowrap">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= SECTION 9: CARD-FOOTER ================= */}
        <div id="card-footer" className="relative w-full aspect-[4/3] max-h-[420px] overflow-hidden bg-stone-900 flex flex-col justify-end text-center p-6">
          <img
            key={`footer-img-${photoAnimKey}-${photoAnimClass}`}
            src={cardData.footerBgPhoto || '/templates/007/images/footer_bg.jpg'}
            alt="Footer couple"
            className={`absolute inset-0 w-full h-full object-cover filter brightness-75 ${isCocohappiiPhoto ? 'animate-kenburns' : photoAnimClass}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>

          {/* Footer Text (Ảnh 4: 1 dòng liền mạch, không rớt chữ xuống dòng thứ 2) */}
          <div
            key={`footer-text-${textAnimKey}-${textAnimClass}`}
            className={`relative z-10 text-white ${textAnimClass}`}
          >
            <p className="text-xl sm:text-2xl font-motherland text-stone-200 mb-1.5 whitespace-nowrap">
              <EditableText
                value={cardData.footerThankYou || 'Rất hân hạnh được đón tiếp!'}
                onChange={(v) => updateField('footerThankYou', v)}
                isEditing={isLiveEditing}
                className="text-stone-200 whitespace-nowrap"
              />
            </p>
            <p className="text-lg sm:text-xl md:text-2xl font-brownsugar font-bold text-white uppercase tracking-wider drop-shadow-md whitespace-nowrap">
              <EditableText
                value={cardData.footerSignature || `${groomName} & ${brideName}`}
                onChange={(v) => updateField('footerSignature', v)}
                isEditing={isLiveEditing}
                className="text-white uppercase whitespace-nowrap"
              />
            </p>
          </div>
        </div>

      </div>
      </>
      )}

      {/* 6. WEDDING GIFT MODAL */}
      <WeddingGiftModal
        isOpen={giftModalOpen}
        onClose={() => setGiftModalOpen(false)}
        banking={cardData.banking}
        groom={cardData.groom}
        bride={cardData.bride}
        isAbsolute={isPreview}
      />

      {/* 7. LIGHTBOX MODAL (Z-INDEX 200 ABOVE TOP TOOLBAR) */}
      {lightboxIndex !== null && cardData.gallery && (
        <div 
          onClick={() => setLightboxIndex(null)}
          className={`${isPreview ? 'absolute' : 'fixed'} inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 select-none animate-fadeIn`}
        >
          {/* Top Bar with Counter & Big Prominent Close Button */}
          <div className="absolute top-0 inset-x-0 z-[210] flex items-center justify-between p-3 sm:p-5 bg-gradient-to-b from-black/90 via-black/50 to-transparent">
            <div className="flex items-center gap-2 sm:gap-3 text-white">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold tracking-wider">
                Ảnh {lightboxIndex + 1} / {cardData.gallery.length}
              </span>
              {cardData.gallery[lightboxIndex]?.caption && (
                <span className="text-white/80 text-xs truncate max-w-[150px] sm:max-w-md hidden sm:inline">
                  {cardData.gallery[lightboxIndex].caption}
                </span>
              )}
            </div>

            {/* BIG PROMINENT CLOSE BUTTON */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-2xl transition-all border border-white/30 cursor-pointer"
              title="Đóng xem ảnh (Phím Esc)"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              <span>ĐÓNG / THOÁT</span>
            </button>
          </div>

          {/* Previous Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex - 1 + cardData.gallery.length) % cardData.gallery.length);
            }}
            className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-[210] w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
            title="Ảnh trước (Mũi tên trái)"
          >
            <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Next Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxIndex((lightboxIndex + 1) % cardData.gallery.length);
            }}
            className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-[210] w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-black/60 hover:bg-black/90 active:scale-95 text-white flex items-center justify-center border border-white/20 shadow-2xl backdrop-blur-md transition-all hover:scale-105 cursor-pointer"
            title="Ảnh tiếp theo (Mũi tên phải)"
          >
            <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>

          {/* Main Photo Container */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-full max-h-[76vh] flex items-center justify-center z-[205] my-auto"
          >
            <img
              src={cardData.gallery[lightboxIndex].url}
              alt={cardData.gallery[lightboxIndex]?.caption || ''}
              className="max-w-full max-h-[76vh] object-contain rounded-2xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Bottom Floating Bar */}
          <div className="absolute bottom-4 sm:bottom-6 inset-x-0 z-[210] flex flex-col items-center justify-center gap-2 pointer-events-none px-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(null);
              }}
              className="pointer-events-auto px-5 py-2.5 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-2 border border-white/30 shadow-2xl cursor-pointer transition-all hover:scale-105"
            >
              <X className="w-4 h-4 text-rose-400" />
              <span>✕ Bấm vào đây hoặc bấm ra ngoài để quay lại thiệp cưới</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
