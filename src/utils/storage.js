/**
 * Persistent Storage & Audio/Video Engine for Wedding Cards
 * - IndexedDB Primary: High capacity storage (hundreds of MBs), eliminating localStorage 5MB quota errors.
 * - Dedicated Audio Store: Stores raw MP3/MP4 Blobs natively, preventing memory bloat and JSON stringify limits.
 * - Auto Image Compression: Resizes large smartphone/camera photos (5-15MB) to web-optimized 1600px (~150-250KB).
 * - Dual layer: IndexedDB primary + localStorage fallback.
 */

const DB_NAME = 'WeddingCardsIndexedDB_v2';
const STORE_NAME = 'wedding_data_store';
const AUDIO_STORE_NAME = 'wedding_audio_store';
const PROFILES_KEY = 'wedding_invitation_profiles_v5';

// Memory cache for active Blob ObjectURLs
const blobUrlCache = new Map();

// BroadcastChannel for instant cross-tab real-time sync (0ms latency, unlimited size)
let liveChannel = null;
export function getLiveSyncChannel() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    if (!liveChannel) {
      liveChannel = new BroadcastChannel('wedding_live_sync_channel');
    }
    return liveChannel;
  }
  return null;
}

export function broadcastProfileUpdate(profiles, source = 'studio') {
  try {
    const ch = getLiveSyncChannel();
    if (ch) {
      ch.postMessage({
        type: 'PROFILE_UPDATED',
        source,
        timestamp: Date.now(),
        profiles
      });
    }
  } catch (e) {
    console.warn('BroadcastChannel error:', e);
  }
}

// Open or initialize IndexedDB
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported in this environment'));
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
        db.createObjectStore(AUDIO_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save custom audio/video (MP3 or MP4) Blob to dedicated IndexedDB store
 */
export async function saveAudioTrackBlob(trackId, fileOrBlob) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(AUDIO_STORE_NAME, 'readwrite');
    tx.objectStore(AUDIO_STORE_NAME).put(fileOrBlob, trackId);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });

    if (blobUrlCache.has(trackId)) {
      try { URL.revokeObjectURL(blobUrlCache.get(trackId)); } catch (e) {}
    }
    const url = URL.createObjectURL(fileOrBlob);
    blobUrlCache.set(trackId, url);
    return url;
  } catch (err) {
    console.error('Failed to save audio blob to IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieve audio Blob ObjectURL for playback
 */
export async function getAudioTrackUrl(trackId) {
  if (!trackId) return null;
  if (blobUrlCache.has(trackId)) {
    return blobUrlCache.get(trackId);
  }
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(AUDIO_STORE_NAME, 'readonly');
    const req = tx.objectStore(AUDIO_STORE_NAME).get(trackId);
    const blob = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });
    if (blob) {
      const url = URL.createObjectURL(blob);
      blobUrlCache.set(trackId, url);
      return url;
    }
  } catch (err) {
    console.warn('Failed to load audio blob from IndexedDB:', err);
  }
  return null;
}

/**
 * Delete custom audio track from IndexedDB
 */
export async function deleteAudioTrackBlob(trackId) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(AUDIO_STORE_NAME, 'readwrite');
    tx.objectStore(AUDIO_STORE_NAME).delete(trackId);
    if (blobUrlCache.has(trackId)) {
      try { URL.revokeObjectURL(blobUrlCache.get(trackId)); } catch (e) {}
      blobUrlCache.delete(trackId);
    }
  } catch (err) {
    console.warn('Failed to delete audio blob:', err);
  }
}

/**
 * Strip giant Base64 media strings before saving to localStorage to prevent QuotaExceededError
 */
function stripBigBase64(val, fallback = '') {
  if (typeof val === 'string' && val.startsWith('data:') && val.length > 50000) {
    return fallback;
  }
  return val;
}

function createLightweightProfileCopy(profiles) {
  try {
    const copy = JSON.parse(JSON.stringify(profiles));
    ['groom', 'bride'].forEach(side => {
      const p = copy[side];
      if (!p) return;
      if (p.music?.presetTracks) {
        p.music.presetTracks = p.music.presetTracks.map(t => {
          if (t.isCustom && t.url && t.url.startsWith('data:')) {
            return { ...t, url: t.cloudUrl || (t.id ? `/api/audio-track?id=${t.id}` : '') };
          }
          return t;
        });
      }
      if (p.music?.customTrackUrl && p.music.customTrackUrl.startsWith('data:')) {
        p.music.customTrackUrl = p.music.activeTrackId ? `/api/audio-track?id=${p.music.activeTrackId}` : '';
      }
      p.heroBannerPhoto = stripBigBase64(p.heroBannerPhoto, '/templates/007/images/hero_banner.jpg');
      p.timelineBgPhoto = stripBigBase64(p.timelineBgPhoto, '/templates/007/images/timeline_bg.jpg');
      p.footerBgPhoto = stripBigBase64(p.footerBgPhoto, '/templates/007/images/footer_bg.jpg');
      if (p.groom) p.groom.avatar = stripBigBase64(p.groom.avatar, '/templates/007/images/groom.jpg');
      if (p.bride) p.bride.avatar = stripBigBase64(p.bride.avatar, '/templates/007/images/bride.jpg');
      if (p.socialShare) p.socialShare.thumbnail = stripBigBase64(p.socialShare.thumbnail, '/templates/007/images/cover_social.jpg');
      if (p.coverConfig) {
        ['style1', 'style2', 'style3', 'style4'].forEach(st => {
          if (p.coverConfig[st]?.photo) {
            p.coverConfig[st].photo = stripBigBase64(p.coverConfig[st].photo, '/templates/007/images/hero_banner.jpg');
          }
        });
      }
      if (p.gallery) {
        p.gallery = p.gallery.map(g => ({
          ...g,
          url: stripBigBase64(g.url, '/templates/007/images/gallery_1.jpg')
        }));
      }
      // Preserve banking QR images so they are NEVER lost in offline storage or cache
      // QR images are small (~40-90KB) and fit comfortably within localStorage quota
    });
    return copy;
  } catch (e) {
    return profiles;
  }
}

/**
 * Save wedding profiles to both IndexedDB and localStorage safely
 */
export async function saveProfilesToStorage(profiles) {
  if (!profiles) return;

  // 0. Immediately broadcast to all other open tabs in real-time
  broadcastProfileUpdate(profiles, 'save');

  // 1. Save to IndexedDB (Primary, high capacity, no 5MB limit)
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(profiles, PROFILES_KEY);
    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  } catch (err) {
    console.warn('IndexedDB save failed:', err);
  }

  // 2. Also sync lightweight version to localStorage as immediate backup
  try {
    const lightCopy = createLightweightProfileCopy(profiles);
    const jsonStr = JSON.stringify(lightCopy);
    localStorage.setItem(PROFILES_KEY, jsonStr);
  } catch (e) {
    console.warn('LocalStorage quota limit reached, but data is safely stored in IndexedDB:', e);
  }
}

/**
 * Load wedding profiles from IndexedDB, falling back to localStorage
 */
export async function loadProfilesFromStorage() {
  // Proactively purge obsolete v1 database so old demo data never haunts the browser
  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('WeddingCardsIndexedDB_v1');
    }
  } catch (err) {}

  // 1. Try reading from primary IndexedDB v2
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(PROFILES_KEY);
    const dbData = await new Promise((res, rej) => {
      req.onsuccess = () => res(req.result);
      req.onerror = rej;
    });
    if (dbData && dbData.groom && dbData.bride) {
      return dbData;
    }
  } catch (err) {
    console.warn('IndexedDB v2 read failed:', err);
  }

  // 2. Fallback to localStorage
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.groom && parsed.bride) {
        return parsed;
      }
    }
  } catch (e) {}

  return null;
}

/**
 * Auto Compress Image File using HTML5 Canvas
 * - Reduces 5-15MB phone camera photos down to crisp ~150-250KB JPEGs
 * - Prevents memory bloat, keeps browser animations silky smooth (60fps)
 */
export function compressImageFile(file, maxWidth = 1280, maxHeight = 1280, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    // If already small SVG or animated GIF, keep original
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    // Small images under 60KB can be read directly
    if (file.size < 60 * 1024) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      } catch (e) {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Create OpenGraph / Zalo / Facebook 1.91:1 (1200x630) Banner
 * - If photo is portrait or square (ratio < 1.85):
 *   Generates 1200x630 canvas with blurred ambient background and centered full uncropped photo.
 *   Guarantees 0% cropping on Zalo/Facebook: faces, heads, suits, dresses are 100% visible!
 * - If photo is already wide landscape (ratio >= 1.85):
 *   Resizes to 1200x630 cleanly.
 */
export function createOgBannerImageFile(file, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);
        const targetW = 1200;
        const targetH = 630;
        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const ratio = img.width / img.height;

        if (ratio < 1.85) {
          // Portrait or square photo:
          // 1. Draw blurred ambient background filling 1200x630
          const bgScale = Math.max(targetW / img.width, targetH / img.height);
          const bgW = img.width * bgScale;
          const bgH = img.height * bgScale;
          const bgX = (targetW - bgW) / 2;
          const bgY = (targetH - bgH) / 2;

          ctx.save();
          if (typeof ctx.filter === 'string') {
            ctx.filter = 'blur(28px) brightness(0.88)';
          }
          ctx.drawImage(img, bgX - 20, bgY - 20, bgW + 40, bgH + 40);
          ctx.restore();

          // Soft ambient tint overlay
          ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
          ctx.fillRect(0, 0, targetW, targetH);

          // 2. Draw centered uncropped original photo with subtle drop shadow
          const fgH = targetH;
          const fgW = Math.round(targetH * ratio);
          const fgX = Math.round((targetW - fgW) / 2);

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
          ctx.shadowBlur = 24;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
          ctx.drawImage(img, fgX, 0, fgW, fgH);
          ctx.restore();
        } else {
          // Already wide landscape
          ctx.drawImage(img, 0, 0, targetW, targetH);
        }

        const bannerBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(bannerBase64);
      } catch (err) {
        console.warn('Canvas OG banner creation error, fallback to compress:', err);
        compressImageFile(file, 1200, 630, quality).then(resolve).catch(reject);
      }
    };

    img.onerror = (err) => {
      try { URL.revokeObjectURL(objectUrl); } catch (e) {}
      reject(err);
    };

    img.src = objectUrl;
  });
}

/**
 * Universal Mobile & Desktop Clipboard Copy
 * - 100% compatible with iOS Safari (iPhone/iPad), Android Chrome, in-app webviews (Zalo, Messenger) and desktop browsers
 * - Important: Must be executed synchronously in the direct user tap/click event without preceding awaits
 * - Supports rich HTML formatted text with automatic plain-text markdown fallback
 */
export async function copyToClipboardSafe(plainText, richHtml = null) {
  if (!plainText && !richHtml) return false;
  const text = String(plainText || '').trim();
  const html = richHtml ? String(richHtml).trim() : null;

  let copied = false;

  // 1. Try modern navigator.clipboard with ClipboardItem (supports rich text on modern browsers)
  if (html && typeof window !== 'undefined' && navigator.clipboard && window.ClipboardItem) {
    try {
      const item = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      });
      await navigator.clipboard.write([item]);
      copied = true;
    } catch (e) {
      console.warn('ClipboardItem rich copy error, falling back to plain text:', e);
    }
  }

  // 2. Try modern navigator.clipboard.writeText directly
  if (!copied && typeof window !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (e) {
      console.warn('navigator.clipboard.writeText error, falling back to DOM execCommand:', e);
    }
  }

  // 3. Battle-tested DOM textarea fallback (especially critical for iOS Safari & Android WebViews)
  if (!copied && typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      textArea.style.opacity = '0.01';
      textArea.style.fontSize = '16px'; // Prevents auto-zoom in iOS Safari
      textArea.setAttribute('readonly', '');

      document.body.appendChild(textArea);

      if (navigator.userAgent.match(/ipad|ipod|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.focus({ preventScroll: true });
        textArea.select();
        textArea.setSelectionRange(0, text.length);
      }

      copied = document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.warn('DOM execCommand error:', err);
    }
  }

  // 4. Fallback prompt if completely blocked
  if (!copied && typeof window !== 'undefined' && window.prompt) {
    try {
      window.prompt('Sao chép đường link bên dưới:', text);
      copied = true;
    } catch (e) {}
  }

  return copied;
}


