import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_WEDDING_DATA, DEFAULT_BRIDE_WEDDING_DATA } from './data/defaultData';
import { GuestView } from './components/GuestView';
import { StudioEditor } from './components/StudioEditor';
import { StudioAuthModal } from './components/StudioAuthModal';
import { saveProfilesToStorage, loadProfilesFromStorage, getLiveSyncChannel, broadcastProfileUpdate, getAudioTrackUrl } from './utils/storage';

const PROFILES_STORAGE_KEY = 'wedding_invitation_profiles_v5';

const ensureAllCoverStyles = (weddingData, defaultData) => {
  const merged = { ...defaultData, ...weddingData };
  const currentStyles = merged.coverConfig?.availableStyles || ['style1', 'style2', 'style3', 'style4'];
  const allRequired = ['style1', 'style2', 'style3', 'style4'];
  const combined = Array.from(new Set([...allRequired, ...currentStyles]));
  merged.coverConfig = {
    ...(merged.coverConfig || {}),
    availableStyles: combined,
    style4: merged.coverConfig?.style4 || defaultData.coverConfig?.style4 || {
      names: 'Đình Hiếu & Thanh Thúy',
      groomName: 'Đình Hiếu',
      brideName: 'Thanh Thúy',
      subTitle: 'Save our date',
      date: '29.11.2026',
      greetingLabel: 'Trân trọng kính mời',
      buttonText: 'MỞ THIỆP',
      ribbonColor: '#b8cddc',
      bgColor: '#faf6ee'
    }
  };
  return merged;
};

const isDemoSampleName = (val) => {
  if (!val || typeof val !== 'string') return false;
  const l = val.toLowerCase().trim();
  return l.includes('quốc toàn') || l.includes('bích phương') || l.includes('thanh sơn') || l.includes('diệu nhi');
};

const sanitizeProfile = (profile, defaultData) => {
  if (!profile) return defaultData;
  const merged = ensureAllCoverStyles(profile, defaultData);
  const isBride = merged.profileType === 'bride' || merged.profileName?.toLowerCase().includes('gái');

  // 1. Sanitize Groom & Bride Names if they match old demo names
  if (merged.groom) {
    if (isDemoSampleName(merged.groom.name)) merged.groom.name = defaultData.groom.name;
    if (isDemoSampleName(merged.groom.nickname)) merged.groom.nickname = defaultData.groom.nickname;
  }
  if (merged.bride) {
    if (isDemoSampleName(merged.bride.name)) merged.bride.name = defaultData.bride.name;
    if (isDemoSampleName(merged.bride.nickname)) merged.bride.nickname = defaultData.bride.nickname;
    if (isDemoSampleName(merged.bride.mother)) merged.bride.mother = defaultData.bride.mother;
  }

  // 1.1 Sanitize Wedding Dates if still pointing to old demo dates
  if (merged.saveTheDateDay === '26.12.2026') {
    merged.saveTheDateDay = '29.11.2026';
  }
  if (!merged.weddingDate || merged.weddingDate === '2026-12-26T11:00:00' || merged.weddingDate.includes('2026-12-26')) {
    merged.weddingDate = '2026-11-29T11:00:00';
  }
  if (merged.coverConfig) {
    ['style1', 'style2', 'style3', 'style4'].forEach(st => {
      if (merged.coverConfig[st]?.date === '26.12.2026') {
        merged.coverConfig[st].date = '29.11.2026';
      }
    });
  }

  // 1.2 Sanitize Events if still demo 25/26 December
  if (merged.events && Array.isArray(merged.events)) {
    merged.events = merged.events.map(ev => {
      if (ev.month === 'Tháng 12' && (ev.date === '25' || ev.date === '26')) {
        if (ev.date === '25') {
          return {
            ...ev,
            date: '28',
            month: 'Tháng 11',
            dayOfWeek: 'Thứ Bảy',
            lunarDate: '(Tức ngày 20 tháng 10 năm Bính Ngọ)'
          };
        } else {
          return {
            ...ev,
            date: '29',
            month: 'Tháng 11',
            dayOfWeek: 'Chủ Nhật',
            lunarDate: '(Tức ngày 21 tháng 10 năm Bính Ngọ)'
          };
        }
      }
      return ev;
    });
  }

  // 1.3 Sanitize Timeline
  if (!merged.timelineHeading || merged.timelineHeading === 'TIMELINE') {
    merged.timelineHeading = 'Timeline';
  }
  if (merged.timeline && Array.isArray(merged.timeline)) {
    merged.timeline = merged.timeline.map(tl => {
      if (tl.date && tl.date.includes('25.12.2026')) {
        return { ...tl, date: tl.date.replace('25.12.2026', '28.11.2026') };
      }
      return tl;
    });
  }

  // 1.4 Sanitize Wishes
  if (merged.wishes && Array.isArray(merged.wishes)) {
    merged.wishes = merged.wishes.map(w => {
      if (w.message && isDemoSampleName(w.message)) {
        return {
          ...w,
          message: w.message.replace(/Quốc Toàn/gi, 'Đình Hiếu').replace(/Bích Phương/gi, 'Thanh Thúy')
        };
      }
      return w;
    });
  }

  const groom = merged.groom?.nickname || merged.groom?.name || defaultData.groom.nickname || 'Đình Hiếu';
  const bride = merged.bride?.nickname || merged.bride?.name || defaultData.bride.nickname || 'Thanh Thúy';
  const coupleNames = isBride ? `${bride} ♥ ${groom}` : `${groom} ♥ ${bride}`;

  // 2. Sanitize Social Share Title & Description
  if (merged.socialShare) {
    if (isDemoSampleName(merged.socialShare.title)) {
      merged.socialShare.title = isBride ? `Thư mời cưới ${bride} ♥ ${groom} (Nhà Gái)` : `Thư mời cưới ${groom} ♥ ${bride}`;
    }
    if (isDemoSampleName(merged.socialShare.description)) {
      merged.socialShare.description = defaultData.socialShare.description;
    }
    if (merged.socialShare.slug && (merged.socialShare.slug.includes('quoctoan') || merged.socialShare.slug.includes('bichphuong'))) {
      merged.socialShare.slug = defaultData.socialShare.slug;
    }
  }

  // 3. Sanitize Footer Signature
  if (isDemoSampleName(merged.footerSignature)) {
    merged.footerSignature = defaultData.footerSignature || 'Hiếu + Thúy';
  }

  // 4. Sanitize Banking Account Names
  if (merged.banking?.groomBank && isDemoSampleName(merged.banking.groomBank.accountName)) {
    merged.banking.groomBank.accountName = defaultData.banking.groomBank.accountName;
  }
  if (merged.banking?.brideBank && isDemoSampleName(merged.banking.brideBank.accountName)) {
    merged.banking.brideBank.accountName = defaultData.banking.brideBank.accountName;
  }

  // 5. Sanitize Hero Banner Photo if it points to demo photo of quoc toan / bich phuong
  if (merged.heroBannerPhoto && (
    merged.heroBannerPhoto.includes('quoctoan') ||
    merged.heroBannerPhoto.includes('bichphuong') ||
    merged.heroBannerPhoto.includes('demo')
  )) {
    merged.heroBannerPhoto = defaultData.heroBannerPhoto;
  }

  // 6. Sanitize Cover Config Styles
  if (merged.coverConfig) {
    if (merged.coverConfig.style1 && isDemoSampleName(merged.coverConfig.style1.names)) {
      merged.coverConfig.style1.names = coupleNames;
    }
    if (merged.coverConfig.style2) {
      if (isDemoSampleName(merged.coverConfig.style2.names)) {
        merged.coverConfig.style2.names = isBride ? `${bride} - ${groom}` : `${groom} - ${bride}`;
      }
      // Bảo đảm phong bì Mẫu 2 luôn giữ màu đỏ nhung nguyên bản (#8c111e), không bị biến thành màu trắng
      if (merged.coverConfig.style2.envelopeColor === '#faf7f2' ||
          merged.coverConfig.style2.envelopeColor === '#faf8f4' ||
          merged.coverConfig.style2.envelopeColor === '#ffffff' ||
          !merged.coverConfig.style2.envelopeColor) {
        merged.coverConfig.style2.envelopeColor = '#8c111e';
      }
      if (!merged.coverConfig.style2.bgColor) {
        merged.coverConfig.style2.bgColor = '#faf8f4';
      }
    }
    if (merged.coverConfig.style3 && isDemoSampleName(merged.coverConfig.style3.names)) {
      merged.coverConfig.style3.names = isBride ? `${bride} & ${groom}` : `${groom} & ${bride}`;
    }
    if (merged.coverConfig.style4) {
      if (isDemoSampleName(merged.coverConfig.style4.names)) merged.coverConfig.style4.names = isBride ? `${bride} & ${groom}` : `${groom} & ${bride}`;
      if (isDemoSampleName(merged.coverConfig.style4.groomName)) merged.coverConfig.style4.groomName = isBride ? bride : groom;
      if (isDemoSampleName(merged.coverConfig.style4.brideName)) merged.coverConfig.style4.brideName = isBride ? groom : bride;
    }
  }
  return merged;
};

export function App() {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const lastCloudUpdatedAt = useRef(0);
  // Profiles store both groom (Mẫu 1: Nhà Trai) and bride (Mẫu 2: Nhà Gái)
  const [profiles, setProfiles] = useState(() => {
    try {
      // Clear legacy storage keys
      ['wedding_invitation_data_v1', 'wedding_invitation_data_v2', 'wedding_invitation_data_v3'].forEach(k => {
        localStorage.removeItem(k);
      });

      const saved = localStorage.getItem(PROFILES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.groom && parsed?.bride) {
          return {
            activeProfile: parsed.activeProfile || 'groom',
            groom: sanitizeProfile(parsed.groom, DEFAULT_WEDDING_DATA),
            bride: sanitizeProfile(parsed.bride, DEFAULT_BRIDE_WEDDING_DATA)
          };
        }
      }

      const initial = {
        activeProfile: 'groom',
        groom: DEFAULT_WEDDING_DATA,
        bride: DEFAULT_BRIDE_WEDDING_DATA
      };
      return initial;
    } catch (e) {
      console.warn('Failed to load wedding profiles from localStorage:', e);
      return {
        activeProfile: 'groom',
        groom: DEFAULT_WEDDING_DATA,
        bride: DEFAULT_BRIDE_WEDDING_DATA
      };
    }
  });

  const getAppParams = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      const hashClean = hash.startsWith('#') ? hash.substring(1) : hash;
      const hashParams = new URLSearchParams(hashClean.startsWith('?') ? hashClean.substring(1) : hashClean);
      return {
        get: (key) => searchParams.get(key) || hashParams.get(key)
      };
    } catch (e) {
      return new URLSearchParams(window.location.search);
    }
  };

  const [activeProfileKey, setActiveProfileKey] = useState(() => {
    try {
      const pathname = (window.location.pathname || '').toLowerCase();
      if (pathname.includes('co-dau') || pathname.includes('nha-gai') || pathname.includes('nhagai') || pathname.includes('bride')) return 'bride';
      if (pathname.includes('chu-re') || pathname.includes('nha-trai') || pathname.includes('nhatrai') || pathname.includes('groom')) return 'groom';

      const params = getAppParams();
      const side = params.get('side') || params.get('profile') || params.get('mau') || params.get('thiep');
      if (side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai') return 'bride';
      if (side === 'groom' || side === '1' || side === 'nhatrai' || side === 'trai') return 'groom';
      
      const stored = sessionStorage.getItem('locked_guest_side');
      if (stored === 'bride' || stored === 'groom') return stored;

      return 'groom';
    } catch (e) {
      return 'groom';
    }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      const params = getAppParams();
      // Link gửi riêng cho khách mời (có to=..., guest=..., name=..., hoặc view=guest): HIỂN THỊ THIỆP GUEST
      if (params.get('to') || params.get('guest') || params.get('name') || params.get('view') === 'guest' || params.get('view') === 'card') {
        return 'guest';
      }
      if (params.get('guest_mode') === 'true') {
        return 'guest';
      }
      // Mặc định cho chủ nhân khi vào trang chủ chính (cả localhost và https://thiepcuoi-hieuthuy-web.vercel.app/):
      // LUÔN MỞ NGAY GIAO DIỆN CHỈNH SỬA STUDIO ĐỂ THAO TÁC SỬA THIỆP
      return 'studio';
    } catch (e) {
      return 'studio';
    }
  });
  const [guestName, setGuestName] = useState(() => {
    try {
      const params = getAppParams();
      const toParam = params.get('to') || params.get('guest') || params.get('name');
      return toParam ? decodeURIComponent(toParam) : '';
    } catch (e) {
      return '';
    }
  });
  const [guestSalutation, setGuestSalutation] = useState(() => {
    try {
      const params = getAppParams();
      const sal = params.get('salutation') || params.get('xungho');
      return sal ? decodeURIComponent(sal) : '';
    } catch (e) {
      return '';
    }
  });
  const [initialEnvelopeOpen, setInitialEnvelopeOpen] = useState(() => {
    try {
      const params = getAppParams();
      // If URL explicitly requests open inner card (?open=1 or ?ruot=1)
      if (params.get('open') === '1' || params.get('open') === 'true' || params.get('ruot') === '1') {
        return true;
      }
      // If URL explicitly requests cover envelope (?cover=1 or ?cover=true or ?bia=1)
      if (params.get('cover') === 'true' || params.get('cover') === '1' || params.get('bia') === '1') {
        return false;
      }
      // Default for wedding guests: display formal envelope cover first so guest can tap to open!
      return false;
    } catch (e) {
      return false;
    }
  });

  // Determine if the current session is an Administrator / Owner
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const params = getAppParams();
      // If URL has guest parameters: to, guest, name, view=guest -> STRICTLY GUEST MODE!
      if (params.get('to') || params.get('guest') || params.get('name') || params.get('view') === 'guest' || params.get('view') === 'card') {
        return false;
      }
      if (params.get('guest_mode') === 'true') {
        return false;
      }
      // When visiting the main website without guest parameters (owner session), enable Admin mode!
      return true;
    } catch (e) {
      return true;
    }
  });

  // Current authenticated user (Gmail Auth & RBAC)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('wedding_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Periodically & on viewMode change verify authenticated user status with Upstash Redis
  useEffect(() => {
    if (currentUser?.email) {
      fetch(`/api/auth-users?email=${encodeURIComponent(currentUser.email)}&requester=${encodeURIComponent(currentUser.email)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.user && data.user.status === 'approved') {
            setCurrentUser(data.user);
            localStorage.setItem('wedding_auth_user', JSON.stringify(data.user));
          } else {
            // User was removed by Super Admin or is no longer approved
            setCurrentUser(null);
            localStorage.removeItem('wedding_auth_user');
          }
        })
        .catch(err => console.warn('User status sync warning:', err));
    }
  }, [viewMode]);

  const handleLogout = () => {
    localStorage.removeItem('wedding_auth_user');
    setCurrentUser(null);
    setIsAdmin(false);
    setViewMode('studio');
  };

  // Whenever user is in studio and approved, mark them as admin
  useEffect(() => {
    if (viewMode === 'studio' && currentUser?.status === 'approved') {
      localStorage.setItem('wedding_is_admin', 'true');
      setIsAdmin(true);
    }
  }, [viewMode, currentUser]);

  // Synchronize document title and OpenGraph meta tags
  useEffect(() => {
    const current = profiles?.[activeProfileKey] || profiles?.groom;
    const social = current?.socialShare;
    if (social?.title) {
      document.title = social.title;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) ogTitle.setAttribute('content', social.title);
    }
    if (social?.description) {
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', social.description);
    }
    if (social?.thumbnail) {
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) ogImg.setAttribute('content', social.thumbnail);
    }
  }, [profiles, activeProfileKey]);

  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  // Synchronize across open browser tabs in real-time (BroadcastChannel + storage event)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === PROFILES_STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed?.groom && parsed?.bride) {
            setProfiles({
              activeProfile: parsed.activeProfile || 'groom',
              groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...parsed.groom }, DEFAULT_WEDDING_DATA),
              bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...parsed.bride }, DEFAULT_BRIDE_WEDDING_DATA)
            });
          }
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // BroadcastChannel: instant in-memory cross-tab communication (no 5MB limit)
    const channel = getLiveSyncChannel();
    let handleChannelMessage = null;
    if (channel) {
      handleChannelMessage = (event) => {
        const { type, profiles: incomingProfiles } = event.data || {};
        if (type === 'PROFILE_UPDATED' && incomingProfiles) {
          setProfiles({
            activeProfile: incomingProfiles.activeProfile || 'groom',
            groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...incomingProfiles.groom }, DEFAULT_WEDDING_DATA),
            bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...incomingProfiles.bride }, DEFAULT_BRIDE_WEDDING_DATA)
          });
        } else if (type === 'REQUEST_LATEST_PROFILES') {
          // If this tab is studio, share our current profiles with the newly opened guest tab!
          if (viewModeRef.current === 'studio' && profilesRef.current) {
            channel.postMessage({
              type: 'RESPONSE_LATEST_PROFILES',
              profiles: profilesRef.current
            });
          }
        } else if (type === 'RESPONSE_LATEST_PROFILES' && incomingProfiles) {
          setProfiles({
            activeProfile: incomingProfiles.activeProfile || 'groom',
            groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...incomingProfiles.groom }, DEFAULT_WEDDING_DATA),
            bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...incomingProfiles.bride }, DEFAULT_BRIDE_WEDDING_DATA)
          });
        }
      };
      channel.addEventListener('message', handleChannelMessage);

      // Request latest data from any open studio tab
      channel.postMessage({ type: 'REQUEST_LATEST_PROFILES' });
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (channel && handleChannelMessage) {
        channel.removeEventListener('message', handleChannelMessage);
      }
    };
  }, []);

  // Read URL query parameters on initial mount & Load from IndexedDB
  useEffect(() => {
    try {
      const params = getAppParams();
      const toParam = params.get('to') || params.get('guest') || params.get('name');
      if (toParam) {
        setGuestName(decodeURIComponent(toParam));
      }
      if (params.get('to') || params.get('guest') || params.get('name') || params.get('view') === 'guest' || params.get('view') === 'card' || params.get('guest_mode') === 'true') {
        setViewMode('guest');
      } else {
        setViewMode('studio');
      }
      if (params.get('open') === '1' || params.get('open') === 'true' || params.get('ruot') === '1') {
        setInitialEnvelopeOpen(true);
      } else if (params.get('cover') === 'true' || params.get('cover') === '1' || params.get('bia') === '1') {
        setInitialEnvelopeOpen(false);
      } else {
        setInitialEnvelopeOpen(false);
      }
      const pathname = (window.location.pathname || '').toLowerCase();
      const isBridePath = pathname.includes('co-dau') || pathname.includes('nha-gai') || pathname.includes('nhagai') || pathname.includes('bride');
      const isGroomPath = pathname.includes('chu-re') || pathname.includes('nha-trai') || pathname.includes('nhatrai') || pathname.includes('groom');

      const side = params.get('side') || params.get('profile') || params.get('mau') || params.get('thiep');
      if (isBridePath || side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai') {
        setActiveProfileKey('bride');
        try { sessionStorage.setItem('locked_guest_side', 'bride'); } catch (e) {}
      } else if (isGroomPath || side === 'groom' || side === '1' || side === 'nhatrai' || side === 'trai') {
        setActiveProfileKey('groom');
        try { sessionStorage.setItem('locked_guest_side', 'groom'); } catch (e) {}
      }
      // If user passed ?reset=true, reset to default immediately
      if (params.get('reset') === 'true') {
        const resetObj = {
          activeProfile: 'groom',
          groom: DEFAULT_WEDDING_DATA,
          bride: DEFAULT_BRIDE_WEDDING_DATA
        };
        setProfiles(resetObj);
        setActiveProfileKey('groom');
        saveProfilesToStorage(resetObj);
        setIsStorageReady(true);
      } else {
        // Asynchronously load rich data from IndexedDB (fallback, does not overwrite newer cloud data)
        loadProfilesFromStorage().then(dbProfiles => {
          if (dbProfiles && dbProfiles.groom && dbProfiles.bride) {
            const dbTime = dbProfiles.updatedAt || 0;
            // Only use dbProfiles if it is strictly NEWER than what cloud provided
            if (dbTime > lastCloudUpdatedAt.current) {
              lastCloudUpdatedAt.current = dbTime;
              setProfiles(prev => ({
                activeProfile: dbProfiles.activeProfile || prev?.activeProfile || 'groom',
                groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...dbProfiles.groom }, DEFAULT_WEDDING_DATA),
                bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...dbProfiles.bride }, DEFAULT_BRIDE_WEDDING_DATA)
              }));
            }
          }
        }).catch(err => {
          console.warn('Error loading from IndexedDB:', err);
        });
      }
    } catch (e) {
      console.warn('Error reading URL params:', e);
    }

    // Function to fetch the absolute latest card configuration from Cloud Redis
    const fetchLatestCloudConfig = async () => {
      try {
        const res = await fetch(`/api/card-config?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        const d = await res.json();
        if (d?.success && d?.config?.groom && d?.config?.bride) {
          const cloudConfig = d.config;
          const cloudTime = cloudConfig.updatedAt || 0;
          if (cloudTime >= lastCloudUpdatedAt.current) {
            lastCloudUpdatedAt.current = cloudTime;
            setProfiles(prev => ({
              activeProfile: cloudConfig.activeProfile || prev?.activeProfile || 'groom',
              groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...cloudConfig.groom }, DEFAULT_WEDDING_DATA),
              bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...cloudConfig.bride }, DEFAULT_BRIDE_WEDDING_DATA)
            }));

            // Check URL parameters & pathname for family side isolation
            const pathname = (window.location.pathname || '').toLowerCase();
            const isBridePath = pathname.includes('co-dau') || pathname.includes('nha-gai') || pathname.includes('nhagai') || pathname.includes('bride');
            const isGroomPath = pathname.includes('chu-re') || pathname.includes('nha-trai') || pathname.includes('nhatrai') || pathname.includes('groom');

            const p = getAppParams();
            const sideParam = p.get('side') || p.get('profile') || p.get('mau') || p.get('thiep');
            const guestNameParam = (p.get('to') || p.get('guest') || p.get('name') || '').trim();
            const isGuestAccess = Boolean(guestNameParam || p.get('view') === 'guest' || p.get('view') === 'card' || p.get('guest_mode') === 'true');

            if (isBridePath) {
              setActiveProfileKey('bride');
              try { sessionStorage.setItem('locked_guest_side', 'bride'); } catch (e) {}
            } else if (isGroomPath) {
              setActiveProfileKey('groom');
              try { sessionStorage.setItem('locked_guest_side', 'groom'); } catch (e) {}
            } else if (sideParam) {
              const isBride = (sideParam === 'bride' || sideParam === '2' || sideParam === 'nhagai' || sideParam === 'gai');
              const resolved = isBride ? 'bride' : 'groom';
              setActiveProfileKey(resolved);
              try { sessionStorage.setItem('locked_guest_side', resolved); } catch (e) {}
            } else if (isGuestAccess) {
              // Backward-compatibility: if an old guest link was sent without ?side=, check which list the guest belongs to
              let resolved = null;
              if (guestNameParam) {
                const lowerName = guestNameParam.toLowerCase();
                const brideGuests = cloudConfig.bride?.guests || [];
                const groomGuests = cloudConfig.groom?.guests || [];
                const inBride = brideGuests.some(g => g.name?.trim().toLowerCase() === lowerName);
                const inGroom = groomGuests.some(g => g.name?.trim().toLowerCase() === lowerName);
                if (inBride && !inGroom) resolved = 'bride';
                else if (inGroom) resolved = 'groom';
              }
              if (!resolved) {
                try { resolved = sessionStorage.getItem('locked_guest_side'); } catch (e) {}
              }
              if (resolved) {
                setActiveProfileKey(resolved);
              }
              // STRICT GUARD: When viewing as a guest, NEVER let cloudConfig.activeProfile change activeProfileKey!
            } else if (cloudConfig.activeProfile) {
              // Only update activeProfileKey for studio/owner view without explicit ?side=
              setActiveProfileKey(cloudConfig.activeProfile);
            }
            saveProfilesToStorage(cloudConfig);
          }
          return cloudConfig;
        }
      } catch (e) {
        console.warn('Cloud config fetch warning:', e);
      }
      return null;
    };

    // Initial immediate load from Cloud Redis
    const cloudPromise = fetchLatestCloudConfig();
    const timeoutPromise = new Promise(res => setTimeout(res, 600));
    Promise.race([cloudPromise, timeoutPromise]).finally(() => {
      setIsStorageReady(true);
    });

    // Real-time background sync: poll every 4s and revalidate on tab focus
    const syncInterval = setInterval(fetchLatestCloudConfig, 4000);
    const handleTabFocus = () => fetchLatestCloudConfig();
    window.addEventListener('focus', handleTabFocus);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchLatestCloudConfig();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Load initial cloud wishes from Redis server
    fetch(`/api/wishes?_t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d?.success && Array.isArray(d?.wishes)) {
          setProfiles(prev => {
            const serverWishes = d.wishes;
            const updated = {
              ...prev,
              groom: {
                ...(prev?.groom || {}),
                wishes: serverWishes
              },
              bride: {
                ...(prev?.bride || {}),
                wishes: serverWishes
              }
            };
            return updated;
          });
        }
      })
      .catch(() => {});

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleTabFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Save specific profile (Mẫu 1: Nhà Trai hoặc Mẫu 2: Nhà Gái)
  const handleSaveProfile = async (profileKey, profileData) => {
    const now = Date.now();
    lastCloudUpdatedAt.current = now;
    const updated = {
      ...profiles,
      activeProfile: profileKey,
      [profileKey]: profileData,
      updatedAt: now
    };
    setProfiles(updated);
    saveProfilesToStorage(updated);
    try {
      const res = await fetch('/api/card-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      const data = await res.json();
      if (data?.updatedAt) {
        lastCloudUpdatedAt.current = data.updatedAt;
      }
      return data;
    } catch (e) {
      console.warn('Cloud save error:', e);
      return null;
    }
  };

  // Save both profiles simultaneously
  const handleSaveAllProfiles = async (updatedProfiles) => {
    const now = Date.now();
    lastCloudUpdatedAt.current = now;
    const enriched = {
      ...updatedProfiles,
      updatedAt: now
    };
    setProfiles(enriched);
    saveProfilesToStorage(enriched);
    try {
      const res = await fetch('/api/card-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enriched)
      });
      const data = await res.json();
      if (data?.updatedAt) {
        lastCloudUpdatedAt.current = data.updatedAt;
      }
      return data;
    } catch (e) {
      console.warn('Cloud save error:', e);
      return null;
    }
  };

  // Switch active profile
  const handleSwitchProfile = (key) => {
    setActiveProfileKey(key);
    setProfiles(prev => {
      const updated = { ...prev, activeProfile: key };
      saveProfilesToStorage(updated);
      return updated;
    });
  };

  // Update current active profile (used by WYSIWYG live editing)
  const handleUpdateCurrentData = (newData) => {
    handleSaveProfile(activeProfileKey, newData);
  };

  // Reset to default data
  const handleResetData = () => {
    if (window.confirm('Khôi phục toàn bộ cả 2 mẫu thiệp về mặc định (Đình Hiếu ♥ Thanh Thúy)?')) {
      const resetObj = {
        activeProfile: 'groom',
        groom: DEFAULT_WEDDING_DATA,
        bride: DEFAULT_BRIDE_WEDDING_DATA
      };
      setProfiles(resetObj);
      setActiveProfileKey('groom');
      saveProfilesToStorage(resetObj);
      alert('Đã khôi phục thành công 2 mẫu thiệp!');
    }
  };

  // Add wish to both profiles so any guest on either side sees all shared wishes
  const handleAddWish = (newWish) => {
    const side = newWish?.side || activeProfileKey || 'groom';
    const enrichedWish = {
      id: newWish?.id || ('wish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)),
      name: newWish?.name || '',
      message: newWish?.message || '',
      side,
      sideLabel: side === 'bride' ? 'Nhà Gái' : 'Nhà Trai',
      createdAt: newWish?.createdAt || 'Vừa xong',
      timestamp: newWish?.timestamp || Date.now(),
      ...newWish
    };

    setProfiles(prev => {
      const prevGroomWishes = prev?.groom?.wishes || [];
      const prevBrideWishes = prev?.bride?.wishes || [];
      const groomWishes = [enrichedWish, ...prevGroomWishes.filter(w => w.id !== enrichedWish.id)];
      const brideWishes = [enrichedWish, ...prevBrideWishes.filter(w => w.id !== enrichedWish.id)];
      const updated = {
        ...prev,
        groom: {
          ...(prev?.groom || {}),
          wishes: groomWishes
        },
        bride: {
          ...(prev?.bride || {}),
          wishes: brideWishes
        }
      };
      saveProfilesToStorage(updated);
      return updated;
    });
  };

  // Quick style change from envelope switcher
  const handleStyleChange = (styleKey) => {
    const current = profiles[activeProfileKey] || profiles.groom;
    const updated = {
      ...current,
      templateStyle: styleKey,
      coverConfig: {
        ...(current.coverConfig || {}),
        activeStyle: styleKey
      }
    };
    handleUpdateCurrentData(updated);
  };

  const currentWeddingData = profiles?.[activeProfileKey] || profiles?.groom || DEFAULT_WEDDING_DATA;

  if (!isStorageReady) {
    return (
      <div className="w-full min-h-screen bg-[#faf7f2] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-full border-3 border-amber-300 border-t-[#70561f] animate-spin mb-3"></div>
        <p className="text-[#70561f] font-serif-elegant font-semibold text-sm animate-pulse">
          Đang nạp dữ liệu thiệp cưới...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen">
      {/* If navigating to Studio without being approved, present StudioAuthModal */}
      {viewMode === 'studio' && (!currentUser || currentUser.status !== 'approved') ? (
        <StudioAuthModal
          onAuthenticated={(user) => {
            setCurrentUser(user);
            setIsAdmin(true);
            setViewMode('studio');
          }}
          onCancelToGuest={() => {
            setViewMode('guest');
          }}
        />
      ) : viewMode === 'studio' ? (
        <StudioEditor
          profiles={profiles}
          activeProfileKey={activeProfileKey}
          onSaveProfile={handleSaveProfile}
          onSaveAllProfiles={handleSaveAllProfiles}
          onSwitchProfile={handleSwitchProfile}
          onCloseStudio={() => setViewMode('guest')}
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      ) : (
        <GuestView
          data={currentWeddingData}
          guestName={guestName}
          guestSalutation={guestSalutation}
          activeProfileKey={activeProfileKey}
          onSwitchProfile={handleSwitchProfile}
          initialEnvelopeOpen={initialEnvelopeOpen}
          onAddWish={handleAddWish}
          onOpenStudio={() => {
            if (!currentUser || currentUser.status !== 'approved') {
              setViewMode('studio');
            } else {
              setIsAdmin(true);
              setViewMode('studio');
            }
          }}
          onStyleChange={handleStyleChange}
          onUpdateData={handleUpdateCurrentData}
          onResetData={handleResetData}
          isAdmin={isAdmin && Boolean(currentUser && currentUser.status === 'approved')}
        />
      )}
    </div>
  );
}

export default App;
