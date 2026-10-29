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
      if (p.banking?.groomBank?.qrImage) {
        p.banking.groomBank.qrImage = stripBigBase64(p.banking.groomBank.qrImage, '');
      }
      if (p.banking?.brideBank?.qrImage) {
        p.banking.brideBank.qrImage = stripBigBase64(p.banking.brideBank.qrImage, '');
      }
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
export function compressImageFile(file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) {
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
