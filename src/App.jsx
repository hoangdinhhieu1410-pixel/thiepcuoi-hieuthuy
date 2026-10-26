import React, { useState, useEffect, useRef } from 'react';
import { DEFAULT_WEDDING_DATA, DEFAULT_BRIDE_WEDDING_DATA } from './data/defaultData';
import { GuestView } from './components/GuestView';
import { StudioEditor } from './components/StudioEditor';
import { saveProfilesToStorage, loadProfilesFromStorage, getLiveSyncChannel, broadcastProfileUpdate } from './utils/storage';

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
    if (merged.coverConfig.style2 && isDemoSampleName(merged.coverConfig.style2.names)) {
      merged.coverConfig.style2.names = isBride ? `${bride} - ${groom}` : `${groom} - ${bride}`;
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

  const [activeProfileKey, setActiveProfileKey] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const side = params.get('side') || params.get('profile') || params.get('mau') || params.get('thiep');
      if (side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai') return 'bride';
      return 'groom';
    } catch (e) {
      return 'groom';
    }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      // Link gửi riêng cho khách mời (có ?to=..., ?guest=..., ?name=..., hoặc ?view=guest): HIỂN THỊ THIỆP GUEST
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
      const params = new URLSearchParams(window.location.search);
      const toParam = params.get('to') || params.get('guest') || params.get('name');
      return toParam ? decodeURIComponent(toParam) : '';
    } catch (e) {
      return '';
    }
  });
  const [guestSalutation, setGuestSalutation] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sal = params.get('salutation') || params.get('xungho');
      return sal ? decodeURIComponent(sal) : '';
    } catch (e) {
      return '';
    }
  });
  const [initialEnvelopeOpen, setInitialEnvelopeOpen] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
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
      const params = new URLSearchParams(window.location.search);
      // If URL has guest parameters: to, guest, name, view=guest -> STRICTLY GUEST MODE!
      if (params.get('to') || params.get('guest') || params.get('name') || params.get('view') === 'guest' || params.get('view') === 'card') {
        return false;
      }
      if (params.get('guest_mode') === 'true') {
        return false;
      }
      // When visiting the main website without guest parameters (owner session), ALWAYS enable Admin mode!
      return true;
    } catch (e) {
      return true;
    }
  });

  // Whenever user is in studio, mark them as admin
  useEffect(() => {
    if (viewMode === 'studio') {
      localStorage.setItem('wedding_is_admin', 'true');
      setIsAdmin(true);
    }
  }, [viewMode]);

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
      const params = new URLSearchParams(window.location.search);
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
      const side = params.get('side') || params.get('profile') || params.get('mau') || params.get('thiep');
      if (side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai') {
        setActiveProfileKey('bride');
      } else if (side === 'groom' || side === '1' || side === 'nhatrai' || side === 'trai') {
        setActiveProfileKey('groom');
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
        // Asynchronously load rich data (with uploaded images & music) from IndexedDB
        loadProfilesFromStorage().then(dbProfiles => {
          if (dbProfiles && dbProfiles.groom && dbProfiles.bride) {
            const sideKey = (side === 'bride' || side === '2' || side === 'nhagai' || side === 'gai') ? 'bride' : 'groom';
            const curProfile = dbProfiles[sideKey] || dbProfiles.groom;
            if (params.get('open') === '1' || params.get('open') === 'true' || params.get('ruot') === '1') {
              setInitialEnvelopeOpen(true);
            } else if (params.get('cover') === 'true' || params.get('cover') === '1' || params.get('bia') === '1') {
              setInitialEnvelopeOpen(false);
            } else {
              setInitialEnvelopeOpen(false);
            }
            setProfiles(prev => ({
              activeProfile: dbProfiles.activeProfile || prev?.activeProfile || 'groom',
              groom: sanitizeProfile({ ...DEFAULT_WEDDING_DATA, ...dbProfiles.groom }, DEFAULT_WEDDING_DATA),
              bride: sanitizeProfile({ ...DEFAULT_BRIDE_WEDDING_DATA, ...dbProfiles.bride }, DEFAULT_BRIDE_WEDDING_DATA)
            }));
          }
        }).catch(err => {
          console.warn('Error loading from IndexedDB:', err);
        }).finally(() => {
          setIsStorageReady(true);
        });
      }
    } catch (e) {
      console.warn('Error reading URL params:', e);
      setIsStorageReady(true);
    }
  }, []);

  // Save specific profile (Mẫu 1: Nhà Trai hoặc Mẫu 2: Nhà Gái)
  const handleSaveProfile = (profileKey, profileData) => {
    setProfiles(prev => {
      const updated = {
        ...prev,
        activeProfile: profileKey,
        [profileKey]: profileData
      };
      saveProfilesToStorage(updated);
      return updated;
    });
  };

  // Save both profiles simultaneously
  const handleSaveAllProfiles = (updatedProfiles) => {
    setProfiles(updatedProfiles);
    saveProfilesToStorage(updatedProfiles);
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
    const side = activeProfileKey || 'groom';
    const enrichedWish = {
      id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      side,
      sideLabel: side === 'bride' ? 'Nhà Gái' : 'Nhà Trai',
      createdAt: 'Vừa xong',
      timestamp: Date.now(),
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
      templateStyle: styleKey
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
      {viewMode === 'guest' ? (
        <GuestView
          data={currentWeddingData}
          guestName={guestName}
          guestSalutation={guestSalutation}
          activeProfileKey={activeProfileKey}
          onSwitchProfile={handleSwitchProfile}
          initialEnvelopeOpen={initialEnvelopeOpen}
          onAddWish={handleAddWish}
          onOpenStudio={() => {
            setIsAdmin(true);
            setViewMode('studio');
          }}
          onStyleChange={handleStyleChange}
          onUpdateData={handleUpdateCurrentData}
          onResetData={handleResetData}
          isAdmin={isAdmin}
        />
      ) : (
        <StudioEditor
          profiles={profiles}
          activeProfileKey={activeProfileKey}
          onSaveProfile={handleSaveProfile}
          onSaveAllProfiles={handleSaveAllProfiles}
          onSwitchProfile={handleSwitchProfile}
          onCloseStudio={() => setViewMode('guest')}
        />
      )}
    </div>
  );
}

export default App;
