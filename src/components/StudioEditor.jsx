import React, { useState, useRef, useEffect } from 'react';
import {
  Users, Calendar, Camera, Music, Share2, Palette, Download, Eye,
  Save, Plus, Trash2, Edit2, Copy, Check, ExternalLink, Play, Pause,
  Upload, Search, Heart, Sparkles, MessageSquare, MessageCircle, MessageSquareHeart, ArrowLeft, RefreshCw,
  Type, Clock, MapPin, Smartphone, X, CheckCircle2, ArrowRightLeft, ArrowRight,
  ChevronRight, ChevronLeft, GripVertical, Sparkle, RotateCcw, Sliders, Image as ImageIcon,
  Mail, FileText, EyeOff, Film, Layers, Volume2, VolumeX, Link as LinkIcon,
  Gift, QrCode, Database, Cloud, Server, ShieldCheck, HardDrive, Key, FileJson, CheckCircle, AlertCircle, Laptop, Monitor
} from 'lucide-react';
import { GuestView } from './GuestView';
import { WeddingGiftModal } from './WeddingGiftModal';
import { DEFAULT_WEDDING_DATA, DEFAULT_BRIDE_WEDDING_DATA } from '../data/defaultData';
import { compressImageFile, saveAudioTrackBlob, getAudioTrackUrl, deleteAudioTrackBlob, broadcastProfileUpdate, getLiveSyncChannel } from '../utils/storage';
import { UserApprovalManager } from './UserApprovalManager';

export const GUEST_GROUP_CONFIG = {
  'Bạn học': {
    name: 'Bạn học',
    icon: '🎓',
    badgeClass: 'bg-sky-100 text-sky-800 border-sky-300',
    btnSelectedClass: 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300 font-bold',
    indicatorClass: 'bg-sky-50 text-sky-800 border-sky-300'
  },
  'Bạn xã hội': {
    name: 'Bạn xã hội',
    icon: '🌟',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    btnSelectedClass: 'bg-purple-600 text-white shadow-md ring-2 ring-purple-300 font-bold',
    indicatorClass: 'bg-purple-50 text-purple-800 border-purple-300'
  },
  'Đồng nghiệp': {
    name: 'Đồng nghiệp',
    icon: '💼',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    btnSelectedClass: 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300 font-bold',
    indicatorClass: 'bg-amber-50 text-amber-900 border-amber-300'
  },
  'Họ hàng': {
    name: 'Họ hàng',
    icon: '🏡',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    btnSelectedClass: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 font-bold',
    indicatorClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
  }
};

export function StudioEditor({
  data,
  onUpdateData,
  profiles,
  activeProfileKey = 'groom',
  onSaveProfile,
  onSaveAllProfiles,
  onSwitchProfile,
  onCloseStudio,
  currentUser,
  onLogout
}) {
  const [activeTab, setActiveTab] = useState('textcontent');

  // Helper to partition guests strictly by family side
  const cleanProfileGuests = (profs) => {
    if (!profs) return profs;
    const res = JSON.parse(JSON.stringify(profs));
    if (res.groom) {
      res.groom.guests = (res.groom.guests || [])
        .filter(g => (g.side === 'groom' || g.invitedSide === 'Nhà Trai' || (!g.side && !g.invitedSide)) && (g.invitedSide !== 'Nhà Gái' && g.side !== 'bride'))
        .map(g => ({ ...g, side: 'groom', invitedSide: 'Nhà Trai' }));
    }
    if (res.bride) {
      res.bride.guests = (res.bride.guests || [])
        .filter(g => g.side === 'bride' || g.invitedSide === 'Nhà Gái')
        .map(g => ({ ...g, side: 'bride', invitedSide: 'Nhà Gái' }));
    }
    return res;
  };

  const isSuperAdmin = currentUser?.role === 'super_admin' || currentUser?.email === 'hoangdinhhieu1410@gmail.com';

  const userAllowedProfiles = isSuperAdmin
    ? ['groom', 'bride']
    : (Array.isArray(currentUser?.allowedProfiles) && currentUser.allowedProfiles.length > 0)
      ? currentUser.allowedProfiles
      : (currentUser?.role === 'editor' ? ['groom', 'bride'] : []);

  const canEditGroom = isSuperAdmin || userAllowedProfiles.includes('groom');
  const canEditBride = isSuperAdmin || userAllowedProfiles.includes('bride');

  const [currentProfileKey, setCurrentProfileKey] = useState(() => {
    if (activeProfileKey && userAllowedProfiles.includes(activeProfileKey)) {
      return activeProfileKey;
    }
    if (userAllowedProfiles.includes('groom')) return 'groom';
    if (userAllowedProfiles.includes('bride')) return 'bride';
    return activeProfileKey || 'groom';
  });

  const canEditCurrentProfile = isSuperAdmin || (currentUser?.role === 'editor' && userAllowedProfiles.includes(currentProfileKey));
  const isReadOnly = !canEditCurrentProfile;

  // Both profiles state
  const [allProfiles, setAllProfiles] = useState(() => {
    if (profiles && profiles.groom && profiles.bride) {
      return cleanProfileGuests(profiles);
    }
    const base = data || DEFAULT_WEDDING_DATA;
    return cleanProfileGuests({
      activeProfile: activeProfileKey || 'groom',
      groom: JSON.parse(JSON.stringify(base)),
      bride: JSON.parse(JSON.stringify(DEFAULT_BRIDE_WEDDING_DATA))
    });
  });

  // Active form data being edited in real-time
  const [formData, setFormData] = useState(() => {
    const initKey = (!userAllowedProfiles.includes('groom') && userAllowedProfiles.includes('bride'))
      ? 'bride'
      : (activeProfileKey || 'groom');
    const cleaned = cleanProfileGuests(profiles);
    const target = (cleaned && cleaned[initKey]) || (data || DEFAULT_WEDDING_DATA);
    return JSON.parse(JSON.stringify(target));
  });

  // Customizable drag-and-drop tab order
  const DEFAULT_MENU_ORDER = [
    'textcontent',
    'guests',
    'wishes',
    'couple',
    'events',
    'gallery',
    'gift',
    'music',
    'social',
    'templates',
    'cloud',
    'export',
    'approval'
  ];

  const [tabOrder, setTabOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('wedding_studio_tabs_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const list = [...parsed];
          DEFAULT_MENU_ORDER.forEach(id => {
            if (!list.includes(id)) list.push(id);
          });
          return list;
        }
      }
    } catch (e) {}
    return DEFAULT_MENU_ORDER;
  });

  const [draggedTabId, setDraggedTabId] = useState(null);
  const [dragOverTabId, setDragOverTabId] = useState(null);

  const handleResetTabOrder = () => {
    setTabOrder(DEFAULT_MENU_ORDER);
    localStorage.removeItem('wedding_studio_tabs_order');
  };

  // Last saved data for undo / revert
  const [lastSavedData, setLastSavedData] = useState(() => {
    const initKey = (!userAllowedProfiles.includes('groom') && userAllowedProfiles.includes('bride'))
      ? 'bride'
      : (activeProfileKey || 'groom');
    const cleaned = cleanProfileGuests(profiles);
    const target = (cleaned && cleaned[initKey]) || (data || DEFAULT_WEDDING_DATA);
    return JSON.parse(JSON.stringify(target));
  });

  // Revert unsaved edits back to last saved state
  const handleRevertToLastSaved = () => {
    if (isReadOnly) {
      alert('Tài khoản của bạn có quyền "Chỉ xem", không thể thực hiện thao tác này.');
      return;
    }
    if (window.confirm('Khôi phục lại toàn bộ dữ liệu theo bản đã lưu gần nhất? Các thay đổi chưa lưu sẽ được hoàn tác.')) {
      setFormData(JSON.parse(JSON.stringify(lastSavedData)));
      setSaveStatus('Đã khôi phục về bản lưu gần nhất thành công!');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Wishes state & helpers
  const [wishesFilter, setWishesFilter] = useState('all'); // 'all' | 'groom' | 'bride'
  const [wishesSearch, setWishesSearch] = useState('');
  const [showAddWishModal, setShowAddWishModal] = useState(false);
  const [cloudWishes, setCloudWishes] = useState([]);
  const [isRefreshingWishes, setIsRefreshingWishes] = useState(false);
  const [manualWish, setManualWish] = useState({
    name: '',
    side: 'groom',
    message: ''
  });

  // Helper to track permanently deleted wish keys locally to prevent resurrection from cache
  const getDeletedWishKeys = () => {
    try {
      const raw = localStorage.getItem('wedding_deleted_wish_keys');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const addDeletedWishKey = (keyOrWish) => {
    try {
      const keys = getDeletedWishKeys();
      if (typeof keyOrWish === 'string') {
        if (keyOrWish && !keys.includes(keyOrWish)) keys.push(keyOrWish);
      } else if (keyOrWish) {
        if (keyOrWish.id && !keys.includes(keyOrWish.id)) keys.push(keyOrWish.id);
        const nm = (keyOrWish.name?.trim() + '_' + keyOrWish.message?.trim());
        if (nm && !keys.includes(nm)) keys.push(nm);
      }
      localStorage.setItem('wedding_deleted_wish_keys', JSON.stringify(keys));
    } catch {}
  };

  // Helper to format wish date to DD/MM/YYYY
  const formatWishDate = (w) => {
    if (!w) return '';
    const ts = w.timestamp || (typeof w.id === 'string' && w.id.startsWith('wish-') ? parseInt(w.id.split('-')[1], 10) : null);
    if (ts && !isNaN(ts)) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
      }
    }
    if (w.createdAt && w.createdAt !== 'Vừa xong' && w.createdAt !== 'Mới' && w.createdAt !== 'Gần đây') {
      return w.createdAt;
    }
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  };

  // Fetch wishes from cloud Redis backend with strict cache-busting
  const fetchCloudWishes = async (showToast = false) => {
    try {
      setIsRefreshingWishes(true);
      const res = await fetch(`/api/wishes?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await res.json();
      if (data?.success && Array.isArray(data?.wishes)) {
        const deletedKeys = getDeletedWishKeys();
        const activeWishes = data.wishes.filter(w => {
          if (!w || !w.name || !w.message) return false;
          if (w.id && deletedKeys.includes(w.id)) return false;
          const nm = w.name.trim() + '_' + w.message.trim();
          if (deletedKeys.includes(nm)) return false;
          return true;
        });

        setCloudWishes(activeWishes);
        setFormData(p => ({ ...p, wishes: activeWishes }));
        setAllProfiles(prev => ({
          ...prev,
          groom: { ...(prev.groom || {}), wishes: activeWishes },
          bride: { ...(prev.bride || {}), wishes: activeWishes }
        }));
        if (showToast) {
          setSaveStatus(`Đã làm mới! Đang có ${activeWishes.length} lời chúc từ khách mời.`);
          setTimeout(() => setSaveStatus(''), 3000);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải lời chúc từ máy chủ:', err);
      if (showToast) {
        setSaveStatus('Không thể tải lời chúc lúc này.');
        setTimeout(() => setSaveStatus(''), 2500);
      }
    } finally {
      setIsRefreshingWishes(false);
    }
  };

  // Real-time polling & instant cross-tab sync for wishes
  useEffect(() => {
    fetchCloudWishes(false);

    // Fast polling every 2.5s for instant sync
    const interval = setInterval(() => fetchCloudWishes(false), 2500);
    const handleFocus = () => fetchCloudWishes(false);
    window.addEventListener('focus', handleFocus);
    const handleVis = () => {
      if (document.visibilityState === 'visible') fetchCloudWishes(false);
    };
    document.addEventListener('visibilitychange', handleVis);

    let handleChannel = null;
    try {
      const channel = getLiveSyncChannel();
      if (channel) {
        handleChannel = (e) => {
          if (e.data?.type === 'WISH_ADDED' || e.data?.type === 'WISH_DELETED' || e.data?.type === 'WISHES_SYNC') {
            fetchCloudWishes(false);
          }
        };
        channel.addEventListener('message', handleChannel);
      }
    } catch (e) {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVis);
      try {
        const channel = getLiveSyncChannel();
        if (channel && handleChannel) channel.removeEventListener('message', handleChannel);
      } catch (e) {}
    };
  }, []);

  // Unified wishes list from cloud Redis (Filtered against deleted blacklists)
  const allUniqueWishes = (() => {
    const deletedKeys = getDeletedWishKeys();
    const source = (cloudWishes && cloudWishes.length > 0) ? cloudWishes : (formData?.wishes || []);
    return source.filter(w => {
      if (!w || !w.name || !w.message) return false;
      if (w.id && deletedKeys.includes(w.id)) return false;
      const nm = w.name.trim() + '_' + w.message.trim();
      if (deletedKeys.includes(nm)) return false;
      return true;
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  })();

  const handleSaveUnifiedWishes = (updatedWishes) => {
    setCloudWishes(updatedWishes);
    setFormData(p => ({ ...p, wishes: updatedWishes }));
    setAllProfiles(prev => ({
      ...prev,
      groom: { ...(prev.groom || {}), wishes: updatedWishes },
      bride: { ...(prev.bride || {}), wishes: updatedWishes }
    }));
    setLastSavedData(prev => prev ? ({ ...prev, wishes: updatedWishes }) : prev);
    broadcastProfileUpdate(allProfiles, 'studio_wishes_updated');
  };

  const handleDeleteWish = async (wish) => {
    const wishId = typeof wish === 'string' ? wish : wish?.id;
    const wishName = typeof wish === 'object' ? wish.name : '';
    const wishMessage = typeof wish === 'object' ? wish.message : '';

    const label = wishName ? `của "${wishName}"` : 'này';
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lời chúc ${label} không?\nLời chúc sẽ được xóa vĩnh viễn trên toàn hệ thống và thiệp mời.`)) {
      return;
    }

    // 1. Blacklist immediately so it can never be resurrected
    addDeletedWishKey(wish);
    if (wishId) addDeletedWishKey(wishId);
    if (wishName && wishMessage) addDeletedWishKey(wishName.trim() + '_' + wishMessage.trim());

    // 2. Filter local state
    const filtered = allUniqueWishes.filter(w => {
      if (wishId && w.id === wishId) return false;
      if (wishName && wishMessage && w.name?.trim() === wishName?.trim() && w.message?.trim() === wishMessage?.trim()) return false;
      return true;
    });

    handleSaveUnifiedWishes(filtered);

    // 3. Instant 0.001s cross-tab broadcast so the wedding card updates immediately
    try {
      const channel = getLiveSyncChannel();
      if (channel) {
        channel.postMessage({ type: 'WISH_DELETED', wishId, wishes: filtered });
      }
    } catch (e) {}

    // 4. Send API DELETE to server
    try {
      const endpoint = `/api/wishes?id=${encodeURIComponent(wishId || '')}&name=${encodeURIComponent(wishName || '')}&message=${encodeURIComponent(wishMessage || '')}&_t=${Date.now()}`;
      await fetch(endpoint, {
        method: 'DELETE',
        cache: 'no-store'
      });
      // Fallback POST action=delete for guaranteed delivery across any network proxy
      fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: wishId, name: wishName, message: wishMessage })
      }).catch(() => {});
    } catch (e) {
      console.warn('Lỗi gọi API xóa lời chúc:', e);
    }

    setSaveStatus('✅ Đã xóa lời chúc thành công!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handlePurgeAllWishes = async () => {
    const count = allUniqueWishes.length;
    const msg = count > 0
      ? `Bạn có chắc chắn muốn XÓA TẤT CẢ (${count}) lời chúc không?\nThao tác này sẽ làm sạch toàn bộ sổ lưu bút trên cả máy chủ và thiệp cưới.`
      : 'Làm sạch và đồng bộ lại toàn bộ sổ lưu bút về 0 trên toàn hệ thống và thiệp cưới?';
    if (!window.confirm(msg)) {
      return;
    }

    allUniqueWishes.forEach(w => addDeletedWishKey(w));

    handleSaveUnifiedWishes([]);

    // Instant 0.001s cross-tab broadcast
    try {
      const channel = getLiveSyncChannel();
      if (channel) {
        channel.postMessage({ type: 'WISH_DELETED', wishId: 'all', wishes: [] });
      }
    } catch (e) {}

    try {
      await fetch(`/api/wishes?id=all&_t=${Date.now()}`, {
        method: 'DELETE',
        cache: 'no-store'
      });
      fetch('/api/wishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: 'all' })
      }).catch(() => {});
    } catch (e) {
      console.warn('Lỗi xóa tất cả lời chúc:', e);
    }

    setSaveStatus('✅ Đã xóa sạch tất cả lời chúc thành công!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleToggleWishSide = (wishId) => {
    const updated = allUniqueWishes.map(w => {
      if (w.id === wishId) {
        const isBride = w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái');
        const newSide = isBride ? 'groom' : 'bride';
        return {
          ...w,
          side: newSide,
          sideLabel: newSide === 'bride' ? 'Nhà Gái' : 'Nhà Trai'
        };
      }
      return w;
    });
    handleSaveUnifiedWishes(updated);
    setSaveStatus('Đã cập nhật phân loại họ cho lời chúc!');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  const handleAddManualWish = (e) => {
    e.preventDefault();
    if (!manualWish.name.trim() || !manualWish.message.trim()) return;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newWish = {
      id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      name: manualWish.name.trim(),
      message: manualWish.message.trim(),
      side: manualWish.side,
      sideLabel: manualWish.side === 'bride' ? 'Nhà Gái' : 'Nhà Trai',
      createdAt: formattedDate,
      timestamp: Date.now()
    };
    handleSaveUnifiedWishes([newWish, ...allUniqueWishes]);
    fetch('/api/wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWish)
    }).catch(e => console.warn('Lỗi gửi lời chúc thủ công lên máy chủ:', e));
    setManualWish({ name: '', side: 'groom', message: '' });
    setShowAddWishModal(false);
    setSaveStatus('Đã thêm lời chúc mới thành công!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleCopyAllWishes = () => {
    const text = allUniqueWishes.map((w, idx) => {
      const isBride = w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái');
      const sideStr = isBride ? '[Họ Nhà Gái]' : '[Họ Nhà Trai]';
      return `${idx + 1}. ${w.name} ${sideStr} (${w.createdAt || ''}):\n   "${w.message}"`;
    }).join('\n\n');
    navigator.clipboard.writeText(text);
    setSaveStatus('Đã sao chép toàn bộ lời chúc vào bộ nhớ đệm!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handlePurgeDemoWishes = () => {
    if (window.confirm('Xóa tất cả các lời chúc mẫu có chứa tên cũ (Quốc Toàn / Bích Phương)?')) {
      const cleaned = allUniqueWishes.filter(w => {
        const m = (w.message || '').toLowerCase();
        const n = (w.name || '').toLowerCase();
        return !m.includes('quốc toàn') && !m.includes('bích phương') && !n.includes('quốc toàn') && !n.includes('bích phương');
      });
      handleSaveUnifiedWishes(cleaned);
      setSaveStatus('Đã dọn dẹp sạch sẽ các lời chúc mẫu!');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  // Track mount state and auto-save every edit
  const isInitialMount = useRef(true);
  const userHasEdited = useRef(false);

  // Synchronize when parent profiles prop updates (before user types or when cloud config arrives from other accounts)
  useEffect(() => {
    if (profiles) {
      const cleaned = cleanProfileGuests(profiles);
      setAllProfiles(cleaned);
      const target = cleaned[currentProfileKey] || cleaned.groom;
      if (target) {
        const cloned = JSON.parse(JSON.stringify(target));
        // Only update formData if user hasn't made unsaved changes in this session
        const hasUnsavedChanges = lastSavedData && JSON.stringify(formData) !== JSON.stringify(lastSavedData);
        if (!hasUnsavedChanges) {
          setFormData(cloned);
          setLastSavedData(cloned);
        }
      }
    }
  }, [profiles, currentProfileKey]);

  // Auto-save debounced effect (1200ms): ONLY if formData actually differs from lastSavedData AND user has permission!
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!lastSavedData || isReadOnly) return;
    const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(lastSavedData);
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(async () => {
      setLastSavedData(JSON.parse(JSON.stringify(formData)));
      const updatedAll = {
        ...allProfiles,
        activeProfile: currentProfileKey,
        [currentProfileKey]: formData
      };
      broadcastProfileUpdate(updatedAll, 'studio_autosave');
      if (onSaveProfile) {
        await onSaveProfile(currentProfileKey, formData);
      } else if (onSaveAllProfiles) {
        await onSaveAllProfiles(updatedAll);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [formData, isReadOnly]);

  // Real-time live preview state
  const [showPreview, setShowPreview] = useState(true);
  const [previewEnvelopeOpen, setPreviewEnvelopeOpen] = useState(false);
  const previewScrollRef = useRef(null);

  // Automatically switch preview phone: Envelope Cover on 'templates' tab, opened wedding card for all other tabs
  useEffect(() => {
    if (activeTab === 'templates') {
      setPreviewEnvelopeOpen(false);
    } else {
      setPreviewEnvelopeOpen(true);
    }
  }, [activeTab]);

  // Scroll preview phone to top whenever switching between Envelope and Inner Card
  useEffect(() => {
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [previewEnvelopeOpen, activeTab]);

  // Copy modal state
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Cover opening style editor state
  const [editingCoverTab, setEditingCoverTab] = useState(() => {
    return formData.templateStyle || formData.coverConfig?.activeStyle || 'style1';
  });

  const baseDefaultStyles = ['style1', 'style2', 'style3', 'style4'];
  const rawAvailable = formData.coverConfig?.availableStyles;
  const availableCoverStyles = (!rawAvailable || rawAvailable.length === 0)
    ? baseDefaultStyles
    : (!rawAvailable.includes('style4') && rawAvailable.length === 3 && rawAvailable.includes('style1') && rawAvailable.includes('style2') && rawAvailable.includes('style3'))
      ? [...rawAvailable, 'style4']
      : rawAvailable;
  const activeCoverStyle = formData.templateStyle || formData.coverConfig?.activeStyle || 'style1';

  // Live animation test replay state
  const [testAnimationCount, setTestAnimationCount] = useState(0);
  const [testPhotoAnimCount, setTestPhotoAnimCount] = useState(0);
  const [testTextAnimCount, setTestTextAnimCount] = useState(0);

  // Link / File cover import state (Yêu cầu ý 5 & cập nhật mới)
  const [importUrl, setImportUrl] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Trigger preview opening animation test (Slow, emphasized 1.6s)
  const triggerOpeningAnimationTest = (effectId) => {
    setFormData(prev => ({
      ...prev,
      coverConfig: {
        ...(prev.coverConfig || {}),
        coverAnimationEffect: effectId
      }
    }));
    setPreviewEnvelopeOpen(false);
    setTimeout(() => {
      setTestAnimationCount(c => c + 1);
    }, 150);
  };

  // Trigger preview photo animation test
  const triggerPhotoAnimationTest = (effectId) => {
    setFormData(prev => ({
      ...prev,
      photoAnimationEffect: effectId
    }));
    setPreviewEnvelopeOpen(true);
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setTimeout(() => {
      setTestPhotoAnimCount(c => c + 1);
    }, 150);
  };

  // Trigger preview text animation test
  const triggerTextAnimationTest = (effectId) => {
    setFormData(prev => ({
      ...prev,
      textAnimationEffect: effectId
    }));
    setPreviewEnvelopeOpen(true);
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: 380, behavior: 'smooth' });
    }
    setTimeout(() => {
      setTestTextAnimCount(c => c + 1);
    }, 150);
  };

  // Analyze and create / clone cover from link or uploaded image (Yêu cầu ý 1 & 2)
  const handleAnalyzeAndCreateCover = () => {
    if (!importUrl.trim() && !importFile) {
      alert('Vui lòng dán link web thiệp cưới hoặc chọn file ảnh mẫu bìa từ máy tính!');
      return;
    }

    setIsAnalyzing(true);

    setTimeout(async () => {
      const urlLower = importUrl.toLowerCase();

      // Case 1: 27BigGroup A9 (Cổng Xanh Ngọc & Ấn Triện Đôi Cung Điện)
      if (urlLower.includes('27biggroup') || urlLower.includes('wedinga9') || urlLower.includes('27big')) {
        handleSelectCover('style3');
        setFormData(prev => ({
          ...prev,
          templateStyle: 'style3',
          coverConfig: {
            ...(prev.coverConfig || {}),
            activeStyle: 'style3',
            coverAnimationEffect: 'splitDoor', // Mở 2 cánh cửa cung điện 3D
            style3: {
              ...(prev.coverConfig?.style3 || {}),
              bgColor: '#183120',
              headerTitle: 'THIỆP MỜI CƯỚI',
              names: `${prev.groom?.nickname || prev.groom?.name || 'Đình Hiếu'} & ${prev.bride?.nickname || prev.bride?.name || 'Thanh Thúy'}`,
              hintText: 'Chạm vào ấn đỏ để mở cánh cửa',
              greetingLabel: 'Trân trọng kính mời',
              buttonText: 'MỞ THIỆP'
            }
          }
        }));
        setPreviewEnvelopeOpen(false);
        setIsAnalyzing(false);
        setImportUrl('');
        setImportFile(null);
        setSaveStatus('🎉 Đã sao chép trọn vẹn bố cục cổng xanh ngọc, ruy băng vàng kim & hiệu ứng mở 2 cánh cửa 27BigGroup A9!');
        setTimeout(() => setSaveStatus(''), 5000);
        setTimeout(() => setTestAnimationCount(c => c + 1), 300);
        return;
      }

      // Case 2: LoveCard 26 (Phong Bì Đỏ Nhung & Cánh Hoa Rơi Nở Bung)
      if (urlLower.includes('lovecard') || urlLower.includes('thiepso26')) {
        handleSelectCover('style2');
        setFormData(prev => ({
          ...prev,
          templateStyle: 'style2',
          coverConfig: {
            ...(prev.coverConfig || {}),
            activeStyle: 'style2',
            coverAnimationEffect: 'flowerBloom', // Cánh hoa rơi & nở bung rực rỡ
            style2: {
              ...(prev.coverConfig?.style2 || {}),
              bgColor: '#faf7f2',
              envelopeColor: '#8c111e',
              names: `${prev.groom?.nickname || prev.groom?.name || 'Đình Hiếu'} - ${prev.bride?.nickname || prev.bride?.name || 'Thanh Thúy'}`,
              subTitle: 'SAVE THE DATE',
              buttonText: 'Mở Thiệp Ngay',
              hintText: 'NHẤN VÀO THIỆP ĐỂ MỞ',
              date: prev.saveTheDateDay || '26.12.2026'
            }
          }
        }));
        setPreviewEnvelopeOpen(false);
        setIsAnalyzing(false);
        setImportUrl('');
        setImportFile(null);
        setSaveStatus('🎉 Đã sao chép trọn vẹn bố cục phong bì đỏ, hoa cưới 4 góc & hiệu ứng cánh hoa rơi của LoveCard 26!');
        setTimeout(() => setSaveStatus(''), 5000);
        setTimeout(() => setTestAnimationCount(c => c + 1), 300);
        return;
      }

      // Case 3: Cocohappii (Bìa Sáp Vàng Hoàng Gia)
      if (urlLower.includes('cocohappii')) {
        handleSelectCover('style1');
        setFormData(prev => ({
          ...prev,
          templateStyle: 'style1',
          coverConfig: {
            ...(prev.coverConfig || {}),
            activeStyle: 'style1',
            coverAnimationEffect: 'waxFlap', // Mở nắp sáp hoàng gia 3D
            style1: {
              ...(prev.coverConfig?.style1 || {}),
              bgColor: '#fbe8ea',
              subTitle: 'THE WEDDING OF',
              names: `${prev.groom?.nickname || prev.groom?.name || 'Đình Hiếu'} ♥ ${prev.bride?.nickname || prev.bride?.name || 'Thanh Thúy'}`,
              date: prev.saveTheDateDay || '26.12.2026'
            }
          }
        }));
        setPreviewEnvelopeOpen(false);
        setIsAnalyzing(false);
        setImportUrl('');
        setImportFile(null);
        setSaveStatus('🎉 Đã sao chép trọn vẹn bố cục sáp vàng hoàng gia, background & hiệu ứng mở nắp sáp Cocohappii!');
        setTimeout(() => setSaveStatus(''), 5000);
        setTimeout(() => setTestAnimationCount(c => c + 1), 300);
        return;
      }

      // Case 4: Uploaded file image
      if (importFile) {
        setSaveStatus('⏳ Đang tối ưu và nén ảnh bìa sắc nét...');
        try {
          const base64Photo = await compressImageFile(importFile, 1600, 1600, 0.82);
          const customStyleId = 'custom_' + Date.now();
          const customTitle = importFile.name.replace(/\.[^/.]+$/, '').slice(0, 25);
          const newCoverData = {
            id: customStyleId,
            headerTitle: customTitle || 'MẪU BÌA TỪ ẢNH',
            subTitle: 'The Wedding Of',
            names: `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} & ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`,
            date: formData.saveTheDateDay || '26.12.2026',
            greetingLabel: 'Trân trọng kính mời',
            buttonText: 'MỞ THIỆP NGAY',
            photo: base64Photo,
            bgColor: '#18181b',
            coverAnimationEffect: 'zoomFade'
          };

          const currentList = Array.from(new Set([...availableCoverStyles, customStyleId]));
          setFormData(prev => ({
            ...prev,
            templateStyle: customStyleId,
            coverConfig: {
              ...(prev.coverConfig || {}),
              activeStyle: customStyleId,
              availableStyles: currentList,
              [customStyleId]: newCoverData
            }
          }));

          setEditingCoverTab(customStyleId);
          setPreviewEnvelopeOpen(false);
          setIsAnalyzing(false);
          setImportUrl('');
          setImportFile(null);
          setSaveStatus(`🎉 Đã đọc và tạo thành công mẫu bìa mới từ file ảnh "${importFile.name}"!`);
          setTimeout(() => setSaveStatus(''), 4500);
          setTimeout(() => setTestAnimationCount(c => c + 1), 300);
        } catch (err) {
          console.warn('Error reading cover file:', err);
          setIsAnalyzing(false);
        }
        return;
      }

      // Case 5: Generic Web URL
      const customStyleId = 'custom_' + Date.now();
      let domainName = 'Mẫu Web Mới';
      try {
        const parsedDomain = new URL(importUrl).hostname.replace('www.', '');
        domainName = 'Mẫu từ ' + parsedDomain;
      } catch (err) {}

      const newCoverData = {
        id: customStyleId,
        headerTitle: domainName,
        subTitle: 'The Wedding Of',
        names: `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} & ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`,
        date: formData.saveTheDateDay || '26.12.2026',
        greetingLabel: 'Trân trọng kính mời',
        buttonText: 'MỞ THIỆP',
        photo: formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg',
        bgColor: '#18181b',
        coverAnimationEffect: 'zoomFade'
      };

      const currentList = Array.from(new Set([...availableCoverStyles, customStyleId]));
      setFormData(prev => ({
        ...prev,
        templateStyle: customStyleId,
        coverConfig: {
          ...(prev.coverConfig || {}),
          activeStyle: customStyleId,
          availableStyles: currentList,
          [customStyleId]: newCoverData
        }
      }));

      setEditingCoverTab(customStyleId);
      setPreviewEnvelopeOpen(false);
      setIsAnalyzing(false);
      setImportUrl('');
      setImportFile(null);
      setSaveStatus(`🎉 Đã tạo mẫu bìa mới thành công từ link ${domainName}!`);
      setTimeout(() => setSaveStatus(''), 4500);
      setTimeout(() => setTestAnimationCount(c => c + 1), 300);
    }, 600);
  };

  // Select Cover Style (Nút chọn làm bìa chính)
  const handleSelectCover = async (styleId) => {
    const updatedForm = {
      ...formData,
      templateStyle: styleId,
      coverConfig: {
        ...(formData.coverConfig || {}),
        activeStyle: styleId
      }
    };
    setFormData(updatedForm);
    setEditingCoverTab(styleId);
    setPreviewEnvelopeOpen(false); // Close envelope in preview so user immediately sees the selected cover!
    if (previewScrollRef.current) {
      previewScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Persist immediately to all profiles and sync to Cloud Redis
    // HOÀN TOÀN ĐỘC LẬP: Mẫu bìa phong bì của Nhà Trai và Nhà Gái lưu riêng biệt 100%, không bao giờ can thiệp profile còn lại
    const updatedAll = {
      ...allProfiles,
      activeProfile: currentProfileKey,
      [currentProfileKey]: updatedForm
    };
    setAllProfiles(updatedAll);
    setSaveStatus(`Đang đồng bộ mẫu bìa [${styleId}] cho ${currentProfileKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'} lên đám mây... ⏳`);
    if (onSaveProfile) {
      await onSaveProfile(currentProfileKey, updatedForm);
    } else if (onSaveAllProfiles) {
      await onSaveAllProfiles(updatedAll);
    }
    broadcastProfileUpdate(updatedAll, 'studio_cover_changed');

    const names = {
      style1: 'Mẫu 1: Bìa Sáp Vàng Hoàng Gia (Cocohappii)',
      style2: 'Mẫu 2: Phong Bì Đỏ Hoa Tươi (LoveCard 26)',
      style3: 'Mẫu 3: Cổng Xanh Ngọc & Ấn Triện (27BigGroup A9)',
      style4: 'Mẫu 4: Khung Ảnh Vòm & Sáp Hoàng Gia (Ảnh 2 & 4)'
    };
    setSaveStatus(`✅ Đã chọn và đồng bộ: ${names[styleId] || styleId} lên link thiệp mời!`);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Delete Cover Style (Nút xóa mẫu bìa)
  const handleDeleteCoverStyle = (styleId, e) => {
    e?.stopPropagation();
    const currentList = formData.coverConfig?.availableStyles || ['style1', 'style2', 'style3', 'style4'];
    if (currentList.length <= 1) {
      alert('Bạn cần giữ lại ít nhất 1 mẫu bìa thiệp!');
      return;
    }
    const names = {
      style1: 'Mẫu 1: Bìa Sáp Vàng Hoàng Gia',
      style2: 'Mẫu 2: Phong Bì Đỏ Hoa Tươi',
      style3: 'Mẫu 3: Cổng Xanh Ngọc & Ấn Triện',
      style4: 'Mẫu 4: Khung Ảnh Vòm & Sáp Hoàng Gia'
    };
    if (window.confirm(`Bạn có chắc chắn muốn xóa hẳn [${names[styleId] || styleId}] khỏi danh sách bìa không?`)) {
      const newList = currentList.filter(id => id !== styleId);
      let newActive = formData.templateStyle;
      if (newActive === styleId) {
        newActive = newList[0];
      }
      setFormData(prev => ({
        ...prev,
        templateStyle: newActive,
        coverConfig: {
          ...(prev.coverConfig || {}),
          activeStyle: newActive,
          availableStyles: newList
        }
      }));
      if (editingCoverTab === styleId) {
        setEditingCoverTab(newActive);
      }
      setSaveStatus('Đã xóa mẫu bìa thành công!');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  // Restore all cover styles
  const handleRestoreAllCoverStyles = () => {
    setFormData(prev => ({
      ...prev,
      coverConfig: {
        ...(prev.coverConfig || {}),
        availableStyles: ['style1', 'style2', 'style3', 'style4']
      }
    }));
    setSaveStatus('Đã khôi phục lại đầy đủ 4 mẫu bìa phong bì!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Update Cover text / property
  const updateCoverField = (styleId, field, value) => {
    setPreviewEnvelopeOpen(false);
    setFormData(prev => {
      const updated = { ...prev };
      if (!updated.coverConfig) updated.coverConfig = {};
      if (!updated.coverConfig[styleId]) {
        const defaultCover = (
          styleId === 'style2' ? DEFAULT_WEDDING_DATA.coverConfig?.style2 :
          styleId === 'style3' ? DEFAULT_WEDDING_DATA.coverConfig?.style3 :
          styleId === 'style4' ? DEFAULT_WEDDING_DATA.coverConfig?.style4 :
          DEFAULT_WEDDING_DATA.coverConfig?.style1
        ) || {};
        updated.coverConfig[styleId] = { ...defaultCover };
      }
      updated.coverConfig[styleId][field] = value;
      return updated;
    });
  };

  // Upload Photo for Cover (Mẫu 1 & Mẫu 3)
  const handleCoverPhotoUpload = (styleId, e) => {
    setPreviewEnvelopeOpen(false);
    handleFileUpload(e, (base64) => {
      updateCoverField(styleId, 'photo', base64);
      setSaveStatus('Đã cập nhật ảnh bìa mới thành công!');
      setTimeout(() => setSaveStatus(''), 3000);
    });
  };

  const [saveStatus, setSaveStatus] = useState('');
  const [copiedLink, setCopiedLink] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [previewAudio, setPreviewAudio] = useState(null);
  const [previewTrackId, setPreviewTrackId] = useState(null);
  const [previewGiftModal, setPreviewGiftModal] = useState(false);
  const audioPreviewRef = useRef(null);

  // Helper to update media field (Album ảnh, hình nền...) hoàn toàn độc lập cho từng mẫu thiệp
  const updateMediaField = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      setAllProfiles(prevAll => {
        const updatedAll = {
          ...prevAll,
          activeProfile: currentProfileKey,
          [currentProfileKey]: updated
        };
        if (onSaveProfile) {
          onSaveProfile(currentProfileKey, updated);
        } else if (onSaveAllProfiles) {
          onSaveAllProfiles(updatedAll);
        }
        return updatedAll;
      });
      return updated;
    });
  };

  // Gallery photo drag-and-drop & reorder state
  const [galleryDragIdx, setGalleryDragIdx] = useState(null);
  const [galleryDragOverIdx, setGalleryDragOverIdx] = useState(null);

  const moveGalleryPhoto = (fromIndex, toIndex) => {
    const list = [...(formData.gallery || [])];
    if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    updateMediaField('gallery', list);
    setSaveStatus(`🎉 Đã chuyển ảnh #${fromIndex + 1} sang vị trí #${toIndex + 1}!`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  const handleGalleryDragStart = (e, index) => {
    setGalleryDragIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleGalleryDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (galleryDragOverIdx !== index) {
      setGalleryDragOverIdx(index);
    }
  };

  const handleGalleryDrop = (e, targetIndex) => {
    e.preventDefault();
    setGalleryDragOverIdx(null);
    if (galleryDragIdx === null || galleryDragIdx === targetIndex) {
      setGalleryDragIdx(null);
      return;
    }
    moveGalleryPhoto(galleryDragIdx, targetIndex);
    setGalleryDragIdx(null);
  };

  // Cloud & Multi-storage states
  const [cloudServicesInfo, setCloudServicesInfo] = useState(null);
  const [isCheckingCloud, setIsCheckingCloud] = useState(false);
  const [cloudCustomConfig, setCloudCustomConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('wedding_custom_cloud_config');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const checkCloudHealth = async () => {
    setIsCheckingCloud(true);
    try {
      const res = await fetch('/api/cloud-sync');
      const json = await res.json();
      if (json.success && json.services) {
        setCloudServicesInfo(json.services);
        setSaveStatus('✅ Kiểm tra kết nối đa đám mây thành công!');
      } else {
        setSaveStatus('Đã kết nối cơ sở dữ liệu Upstash Redis!');
      }
    } catch (e) {
      console.warn('Cloud check error:', e);
      setSaveStatus('Đang hoạt động trên nền tảng Upstash Redis & Offline Cache');
    } finally {
      setIsCheckingCloud(false);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleDownloadFullBackup = async () => {
    try {
      setSaveStatus('⏳ Đang tổng hợp dữ liệu sao lưu toàn diện...');
      let backupPayload = null;
      try {
        const res = await fetch('/api/cloud-sync?action=dump');
        const json = await res.json();
        if (json.success && json.data) {
          backupPayload = json.data;
        }
      } catch (err) {}

      const fullDump = {
        exportedAt: new Date().toISOString(),
        appName: 'Thiệp Cưới Online - Đình Hiếu & Thanh Thúy',
        version: '2.0-multi-cloud',
        weddingDate: '26.12.2026',
        profiles: allProfiles,
        wishes: allUniqueWishes || [],
        databaseSnapshot: backupPayload
      };

      const blob = new Blob([JSON.stringify(fullDump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `sao-luu-thiep-cuoi-hieuthuy-${dateStr}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveStatus('🎉 Đã tải file sao lưu toàn diện (.JSON) thành công!');
      setTimeout(() => setSaveStatus(''), 3500);
    } catch (e) {
      alert('Không thể tạo file sao lưu: ' + e.message);
    }
  };

  const handleRestoreFromFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Bạn có chắc chắn muốn khôi phục dữ liệu từ file "${file.name}"? Dữ liệu hiện tại sẽ được thay thế bằng dữ liệu từ bản sao lưu.`)) {
      e.target.value = '';
      return;
    }

    try {
      setSaveStatus('⏳ Đang đọc và khôi phục dữ liệu...');
      const text = await file.text();
      const parsed = JSON.parse(text);

      const restoredProfiles = parsed.profiles || parsed.databaseSnapshot?.config?.profiles || parsed.config?.profiles;
      const restoredWishes = parsed.wishes || parsed.databaseSnapshot?.wishes || [];

      if (restoredProfiles) {
        setAllProfiles(restoredProfiles);
        const activeKey = restoredProfiles.activeProfile || currentProfileKey;
        if (restoredProfiles[activeKey]) {
          setFormData(restoredProfiles[activeKey]);
        }
        if (onSaveAllProfiles) {
          onSaveAllProfiles(restoredProfiles);
        }
      }

      if (Array.isArray(restoredWishes) && restoredWishes.length > 0) {
        handleSaveUnifiedWishes(restoredWishes);
      }

      // Also notify backend cloud-sync
      fetch('/api/cloud-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'restore',
          backupData: {
            config: restoredProfiles || parsed,
            wishes: restoredWishes
          }
        })
      }).catch(err => console.warn('Restore sync notice:', err));

      setSaveStatus('🎉 Khôi phục toàn bộ hệ thống thành công 100%!');
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      alert('Lỗi đọc file sao lưu: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  // Helper to update avatar
  const updateCoupleAvatar = (role, base64) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [role]: { ...(prev[role] || {}), avatar: base64 }
      };
      setAllProfiles(prevAll => {
        const updatedAll = {
          ...prevAll,
          activeProfile: currentProfileKey,
          [currentProfileKey]: updated
        };
        if (onSaveProfile) {
          onSaveProfile(currentProfileKey, updated);
        } else if (onSaveAllProfiles) {
          onSaveAllProfiles(updatedAll);
        }
        return updatedAll;
      });
      return updated;
    });
  };

  // Switch between Mẫu 1 (Nhà Trai) and Mẫu 2 (Nhà Gái)
  const handleSwitchProfileInternal = (newKey) => {
    if (newKey === currentProfileKey) return;
    // Auto-save currently edited formData to allProfiles[currentProfileKey]
    // TUYỆT ĐỐI KHÔNG COPY/ĐỒNG BỘ NỘI DUNG SANG newKey (Nhà Trai và Nhà Gái hoàn toàn độc lập 100%)
    let updatedAll = {
      ...allProfiles,
      activeProfile: newKey,
      [currentProfileKey]: formData
    };
    updatedAll = cleanProfileGuests(updatedAll);
    setAllProfiles(updatedAll);
    setCurrentProfileKey(newKey);
    const target = updatedAll[newKey] || (newKey === 'bride' ? DEFAULT_BRIDE_WEDDING_DATA : DEFAULT_WEDDING_DATA);
    target.profileType = newKey;
    const clonedTarget = JSON.parse(JSON.stringify(target));
    setFormData(clonedTarget);
    setLastSavedData(clonedTarget);

    // Cập nhật tab chỉnh sửa bìa tương ứng với mẫu bìa riêng của profile đích
    const targetCoverStyle = clonedTarget.templateStyle || clonedTarget.coverConfig?.activeStyle || 'style1';
    setEditingCoverTab(targetCoverStyle);

    if (onSwitchProfile) {
      onSwitchProfile(newKey);
    }
  };

  // Synchronize if parent activeProfileKey changes
  useEffect(() => {
    if (activeProfileKey && activeProfileKey !== currentProfileKey) {
      handleSwitchProfileInternal(activeProfileKey);
    }
  }, [activeProfileKey]);

  // Save currently active profile
  const handleSaveCurrent = async () => {
    if (isReadOnly) {
      alert(`Tài khoản của bạn không có quyền lưu ${currentProfileKey === 'groom' ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}!`);
      return;
    }
    setSaveStatus('Đang đồng bộ lên máy chủ đám mây... ⏳');
    // TUYỆT ĐỐI ĐỘC LẬP: Chỉ lưu dữ liệu của profile đang chỉnh sửa (currentProfileKey), không can thiệp bên còn lại
    let updatedAll = {
      ...allProfiles,
      activeProfile: currentProfileKey,
      [currentProfileKey]: formData
    };
    updatedAll = cleanProfileGuests(updatedAll);
    setAllProfiles(updatedAll);
    setLastSavedData(JSON.parse(JSON.stringify(formData)));
    broadcastProfileUpdate(updatedAll, 'studio_manual_save');
    if (onSaveProfile) {
      await onSaveProfile(currentProfileKey, formData);
    } else if (onSaveAllProfiles) {
      await onSaveAllProfiles(updatedAll);
    } else if (onUpdateData) {
      await onUpdateData(formData);
    }
    setSaveStatus(`✅ Đã lưu & đồng bộ tức thì lên link mời (${currentProfileKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'})!`);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleSave = handleSaveCurrent;

  // Save both profiles simultaneously
  const handleSaveBoth = async () => {
    if (isReadOnly) {
      alert('Tài khoản của bạn có quyền "Chỉ xem". Bạn không được phép lưu hoặc sửa đổi dữ liệu!');
      return;
    }
    setSaveStatus('Đang đồng bộ cả 2 mẫu thiệp lên máy chủ đám mây... ⏳');
    const updatedAll = cleanProfileGuests({
      ...allProfiles,
      activeProfile: currentProfileKey,
      [currentProfileKey]: formData
    });
    setAllProfiles(updatedAll);
    setLastSavedData(JSON.parse(JSON.stringify(formData)));
    broadcastProfileUpdate(updatedAll, 'studio_manual_save');
    if (onSaveAllProfiles) {
      await onSaveAllProfiles(updatedAll);
    } else if (onSaveProfile) {
      await onSaveProfile('groom', updatedAll.groom);
      await onSaveProfile('bride', updatedAll.bride);
    }
    setSaveStatus('✅ Đã lưu & đồng bộ thành công cả 2 mẫu thiệp!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Copy data between profiles
  const handleCopyData = (type) => {
    const targetKey = currentProfileKey === 'groom' ? 'bride' : 'groom';
    const targetData = allProfiles[targetKey] || (targetKey === 'bride' ? DEFAULT_BRIDE_WEDDING_DATA : DEFAULT_WEDDING_DATA);
    let updatedTarget = { ...targetData };

    if (type === 'all') {
      updatedTarget = {
        ...formData,
        guests: targetData.guests || [], // BẢO VỆ TUYỆT ĐỐI: Giữ nguyên danh sách khách mời của bên nhận, không bị đè hay lẫn lộn!
        profileType: targetKey,
        profileName: targetKey === 'bride' ? 'Thiệp Nhà Gái' : 'Thiệp Nhà Trai',
      };
    } else if (type === 'media') {
      updatedTarget.heroBannerPhoto = formData.heroBannerPhoto;
      updatedTarget.timelineBgPhoto = formData.timelineBgPhoto;
      updatedTarget.timelineBgPhotoPosition = formData.timelineBgPhotoPosition;
      updatedTarget.footerBgPhoto = formData.footerBgPhoto;
      updatedTarget.gallery = JSON.parse(JSON.stringify(formData.gallery || []));
      updatedTarget.music = JSON.parse(JSON.stringify(formData.music || {}));
    } else if (type === 'couple') {
      updatedTarget.groom = JSON.parse(JSON.stringify(formData.groom || {}));
      updatedTarget.bride = JSON.parse(JSON.stringify(formData.bride || {}));
      updatedTarget.parentGroomLabel = formData.parentGroomLabel;
      updatedTarget.parentBrideLabel = formData.parentBrideLabel;
    }

    const newAll = {
      ...allProfiles,
      [currentProfileKey]: formData,
      [targetKey]: updatedTarget
    };
    setAllProfiles(newAll);
    if (onSaveAllProfiles) {
      onSaveAllProfiles(newAll);
    }
    setShowCopyModal(false);
    setSaveStatus(`Đã sao chép sang [${targetKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'}] thành công!`);
    setTimeout(() => setSaveStatus(''), 3500);
  };

  // Scroll live preview phone to specific section
  const scrollToSection = (selector) => {
    if (!previewEnvelopeOpen) {
      setPreviewEnvelopeOpen(true);
      setTimeout(() => {
        const el = previewScrollRef.current?.querySelector(selector);
        el?.scrollIntoView({ behavior: 'smooth' });
      }, 350);
    } else {
      const el = previewScrollRef.current?.querySelector(selector);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // New Guest Form State
  const [newGuest, setNewGuest] = useState({
    name: '',
    salutation: 'Trân trọng kính mời',
    group: 'Bạn học'
  });

  // Convert and compress uploaded image file to optimized Base64
  const handleFileUpload = async (e, callback, maxWidth = 1600, maxHeight = 1600, quality = 0.82) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaveStatus('⏳ Đang tối ưu và nén ảnh sắc nét...');
    try {
      const compressed = await compressImageFile(file, maxWidth, maxHeight, quality);
      if (compressed) {
        callback(compressed);
        setSaveStatus('✅ Đã lưu và tối ưu ảnh thành công!');
        setTimeout(() => setSaveStatus(''), 2500);
      }
    } catch (err) {
      console.warn('Image compress fallback:', err);
      const reader = new FileReader();
      reader.onload = (event) => callback(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  // Upload custom MP3 / MP4 file with native IndexedDB Blob storage
  const handleMusicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSaveStatus('⏳ Đang lưu file nhạc MP3/MP4 vào bộ nhớ hệ thống...');
    try {
      const isVideo = file.type.includes('video') || file.name.toLowerCase().endsWith('.mp4');
      const trackTitle = file.name.replace(/\.[^/.]+$/, '');
      const trackId = 'track-' + Date.now();

      // 1. Save binary Blob directly into dedicated IndexedDB audio store
      const blobUrl = await saveAudioTrackBlob(trackId, file);

      // 2. Track metadata for the list (lightweight, no base64 memory bloat)
      const newTrack = {
        id: trackId,
        title: trackTitle,
        artist: isVideo ? 'File video MP4 từ máy tính' : 'File nhạc MP3 từ máy tính',
        url: blobUrl || '',
        isCustom: true,
        hasBlob: true,
        mimeType: file.type || (isVideo ? 'video/mp4' : 'audio/mp3')
      };

      const currentTracks = formData.music?.presetTracks || [];
      const updatedTracks = [newTrack, ...currentTracks];
      const updatedMusic = {
        ...(formData.music || {}),
        presetTracks: updatedTracks,
        activeTrackId: newTrack.id,
        customTrackUrl: blobUrl || '',
        customTrackName: trackTitle,
        enabled: true
      };

      const updatedFormData = {
        ...formData,
        music: updatedMusic
      };

      userHasEdited.current = true;
      setFormData(updatedFormData);

      // 3. Immediately persist to storage
      if (onSaveProfile) {
        onSaveProfile(currentProfileKey, updatedFormData);
      }

      setSaveStatus(`🎉 Đã tải lên và lưu vĩnh viễn bài: ${trackTitle}`);
      setTimeout(() => setSaveStatus(''), 4000);
    } catch (err) {
      console.error('Lỗi tải nhạc:', err);
      setSaveStatus('Có lỗi khi lưu file nhạc. Vui lòng thử lại!');
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  // Delete music track
  const handleDeleteTrack = async (trackId, e) => {
    e?.stopPropagation();
    const currentTracks = formData.music?.presetTracks || [];
    const trackToDelete = currentTracks.find(t => t.id === trackId);
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bài hát "${trackToDelete?.title || 'này'}" khỏi danh sách nhạc?`)) {
      return;
    }
    if (trackToDelete?.isCustom) {
      await deleteAudioTrackBlob(trackId);
    }
    const updatedTracks = currentTracks.filter(t => t.id !== trackId);
    let newActiveId = formData.music?.activeTrackId;
    let newCustomUrl = formData.music?.customTrackUrl;
    let newCustomName = formData.music?.customTrackName;

    if (newActiveId === trackId) {
      if (updatedTracks.length > 0) {
        newActiveId = updatedTracks[0].id;
        newCustomUrl = updatedTracks[0].url;
        newCustomName = updatedTracks[0].title;
      } else {
        newActiveId = '';
        newCustomUrl = '';
        newCustomName = '';
      }
    }

    const updatedForm = {
      ...formData,
      music: {
        ...(formData.music || {}),
        presetTracks: updatedTracks,
        activeTrackId: newActiveId,
        customTrackUrl: newCustomUrl,
        customTrackName: newCustomName
      }
    };

    userHasEdited.current = true;
    setFormData(updatedForm);
    if (onSaveProfile) {
      onSaveProfile(currentProfileKey, updatedForm);
    }

    if (previewAudio === trackToDelete?.url) {
      audioPreviewRef.current?.pause();
      setPreviewAudio(null);
    }
    setSaveStatus('Đã xóa bài hát khỏi danh sách!');
    setTimeout(() => setSaveStatus(''), 2500);
  };

  // Restore default preset tracks
  const handleRestoreDefaultTracks = () => {
    const defaultTracks = [
      {
        id: 'beautiful-in-white',
        title: 'Beautiful In White',
        artist: 'Shane Filan',
        url: 'https://assets.mixkit.co/music/preview/mixkit-wedding-walk-450.mp3'
      },
      {
        id: 'until-i-found-you',
        title: 'Until I Found You',
        artist: 'Stephen Sanchez',
        url: 'https://assets.mixkit.co/music/preview/mixkit-romantic-moment-1140.mp3'
      },
      {
        id: 'a-thousand-years',
        title: 'A Thousand Years',
        artist: 'Christina Perri (Violin Instrumental)',
        url: 'https://assets.mixkit.co/music/preview/mixkit-gentle-acoustic-guitar-376.mp3'
      }
    ];
    const updatedForm = {
      ...formData,
      music: {
        ...(formData.music || {}),
        presetTracks: defaultTracks,
        activeTrackId: 'beautiful-in-white',
        customTrackUrl: defaultTracks[0].url,
        customTrackName: defaultTracks[0].title
      }
    };
    userHasEdited.current = true;
    setFormData(updatedForm);
    if (onSaveProfile) {
      onSaveProfile(currentProfileKey, updatedForm);
    }
    setSaveStatus('Đã khôi phục lại 3 bản nhạc mẫu mặc định!');
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Select music track for the current card (Mẫu 1 Nhà Trai hoặc Mẫu 2 Nhà Gái)
  const handleSelectTrack = async (track) => {
    if (!track) return;
    const selectedTrackUrl = track.url || `/templates/007/tracks/${track.id}.m4a`;
    const updatedMusic = {
      ...(formData.music || {}),
      activeTrackId: track.id,
      customTrackUrl: selectedTrackUrl,
      customTrackName: track.title,
      enabled: true
    };
    const updated = {
      ...formData,
      music: updatedMusic
    };
    userHasEdited.current = true;
    setFormData(updated);

    const updatedAll = {
      ...allProfiles,
      activeProfile: currentProfileKey,
      [currentProfileKey]: updated
    };
    setAllProfiles(updatedAll);
    setSaveStatus(`Đang lưu bài hát [${track.title}] cho ${currentProfileKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'}... ⏳`);
    if (onSaveProfile) {
      await onSaveProfile(currentProfileKey, updated);
    } else if (onSaveAllProfiles) {
      await onSaveAllProfiles(updatedAll);
    }
    broadcastProfileUpdate(updatedAll, 'studio_music_changed');
    setSaveStatus(`✅ Đã chọn bài hát: ${track.title} cho ${currentProfileKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'}!`);
    setTimeout(() => setSaveStatus(''), 3000);
  };

  // Audio preview play
  const togglePreviewPlay = async (trackOrUrl) => {
    let playUrl = typeof trackOrUrl === 'string' ? trackOrUrl : trackOrUrl?.url;
    const trackId = typeof trackOrUrl === 'object' ? trackOrUrl?.id : null;
    if (trackId && (trackId.startsWith('track-') || trackOrUrl?.isCustom)) {
      const fresh = await getAudioTrackUrl(trackId);
      if (fresh) playUrl = fresh;
    } else if (!playUrl && trackId) {
      playUrl = await getAudioTrackUrl(trackId);
    }
    if (!playUrl) return;

    if (previewTrackId === trackId || previewAudio === playUrl) {
      audioPreviewRef.current?.pause();
      setPreviewAudio(null);
      setPreviewTrackId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.src = playUrl;
        audioPreviewRef.current.play().catch(e => console.log('Audio preview error:', e));
        setPreviewAudio(playUrl);
        setPreviewTrackId(trackId);
      }
    }
  };

  // Generate Personalized Link for a guest (Tách biệt 100% Nhà Trai / Nhà Gái qua đường dẫn riêng biệt)
  // Chuẩn công nghiệp (Biihappy, Thiepvip, iWedding): Sử dụng đường dẫn tĩnh sạch (/co-dau cho Nhà Gái, / cho Nhà Trai)
  // để Facebook và Messenger ánh xạ trực tiếp đến thẻ xem trước OpenGraph đã cache, không bị lỗi domain pill xám.
  const getGuestLink = (guest, platform = 'general') => {
    const configuredDomain = (formData.socialShare?.customDomain || '').trim();
    let baseUrl;
    if (configuredDomain) {
      baseUrl = configuredDomain.replace(/\/+$/, '');
    } else {
      baseUrl = window.location.origin.replace(/\/+$/, '');
    }

    const isBride = (currentProfileKey === 'bride' || guest?.side === 'bride' || guest?.invitedSide === 'Nhà Gái');
    const guestName = (guest?.name || '').trim();
    const sal = (guest?.salutation || '').trim();

    // Clean path routing matching industry standards:
    // Nhà Gái uses dedicated /co-dau, Nhà Trai uses /
    const basePath = isBride ? `${baseUrl}/co-dau` : `${baseUrl}/`;

    const params = new URLSearchParams();
    if (guestName) {
      params.set('to', guestName);
    }
    if (sal && sal !== 'Trân trọng kính mời') {
      params.set('salutation', sal);
    }

    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const [copiedZaloId, setCopiedZaloId] = useState('');
  const [copiedMessengerId, setCopiedMessengerId] = useState('');

  // Helper copy to clipboard with both Rich HTML and Plain text markdown
  const copyRichAndPlainText = async (plainText, htmlText) => {
    let copied = false;
    // Method 1: Modern async ClipboardItem with text/html and text/plain
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        const item = new ClipboardItem({
          'text/html': new Blob([htmlText], { type: 'text/html' }),
          'text/plain': new Blob([plainText], { type: 'text/plain' })
        });
        await navigator.clipboard.write([item]);
        copied = true;
      } catch (e) {
        console.warn('ClipboardItem write failed, trying fallback listener:', e);
      }
    }

    // Method 2: Synchronous copy event listener fallback (standard for Windows rich clipboard CF_HTML)
    if (!copied) {
      try {
        const onCopy = (e) => {
          e.clipboardData.setData('text/html', htmlText);
          e.clipboardData.setData('text/plain', plainText);
          e.preventDefault();
        };
        document.addEventListener('copy', onCopy);
        copied = document.execCommand('copy');
        document.removeEventListener('copy', onCopy);
      } catch (e2) {
        console.warn('execCommand copy failed:', e2);
      }
    }

    // Method 3: Direct writeText as final fallback
    if (!copied) {
      try {
        await navigator.clipboard.writeText(plainText);
        copied = true;
      } catch (e3) {
        console.error('navigator.clipboard.writeText failed:', e3);
      }
    }

    return copied;
  };

  // Format full formal invitation message matching EXACT user sample (Nhà Trai & Nhà Gái)
  // Chuẩn 100%:
  // 1. "THƯ MỜI CƯỚI": IN ĐẬM
  // 2. "— Nhà Trai —" / "— Nhà Gái —": IN NGHIÊNG
  // 3. Tên khách mời: IN ĐẬM
  // 4. Tên cô dâu & chú rể: IN ĐẬM
  // 5. "Ngày ...": IN ĐẬM
  const getGuestInvitationTemplate = (guest) => {
    const link = getGuestLink(guest);
    const salutation = (guest?.salutation || 'Trân trọng kính mời').trim();
    const guestName = (guest?.name || 'Quý Khách').trim();
    const isBride = (currentProfileKey === 'bride' || guest?.side === 'bride' || guest?.invitedSide === 'Nhà Gái');
    const groomName = (formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu').trim();
    const brideName = (formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy').trim();
    const coupleText = (isBride ? `${brideName} & ${groomName}` : `${groomName} & ${brideName}`).trim();
    const weddingDate = (formData.eventDateText || formData.saveTheDateDay || '29.11.2026').trim();
    const ceremonyType = (isBride ? 'lễ Vu Quy' : 'lễ Thành Hôn').trim();
    const sideLabel = (isBride ? 'Nhà Gái' : 'Nhà Trai').trim();

    let inviteLine = '';
    if (salutation.toLowerCase().includes('kính mời')) {
      inviteLine = `Đến tham dự ${ceremonyType}, chung vui cùng`;
    } else if (salutation.toLowerCase().includes('thân mời')) {
      inviteLine = `Trân trọng kính mời bạn đến tham dự ${ceremonyType}, chung vui cùng`;
    } else {
      inviteLine = `Trân trọng kính mời ${salutation ? salutation.toLowerCase() : 'quý khách'} đến tham dự ${ceremonyType}, chung vui cùng`;
    }

    // Plain text version (sử dụng Markdown chuẩn *in đậm* và _in nghiêng_ cho Zalo, Messenger, Telegram)
    const plain = `💌 *THƯ MỜI CƯỚI* 💌
— _${sideLabel}_ —

${salutation}: *${guestName}* ♡

${inviteLine}

🌷 *${coupleText}* 🌷

🗓️ *Ngày ${weddingDate}*

──────── ❀ ────────

💌 Kính mời *${guestName}* bấm vào đường link dưới đây để mở thiệp cưới:

🔗 ${link}

──────── ❀ ────────

Sự hiện diện của *${guestName}* là niềm vinh hạnh và hạnh phúc lớn của gia đình chúng tôi!

♡ *Rất hân hạnh được đón tiếp!* ♡`;

    // Rich HTML version (giữ nguyên định dạng in đậm <strong>, in nghiêng <em> khi dán vào Zalo PC / Zalo Web / Word)
    const html = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1c1917;">
<p>💌 <strong style="font-weight: 700;">THƯ MỜI CƯỚI</strong> 💌<br>
— <em style="font-style: italic;">${sideLabel}</em> —<br><br>
${salutation}: <strong style="font-weight: 700;">${guestName}</strong> ♡<br><br>
${inviteLine}<br><br>
🌷 <strong style="font-weight: 700;">${coupleText}</strong> 🌷<br><br>
🗓️ <strong style="font-weight: 700;">Ngày ${weddingDate}</strong><br><br>
──────── ❀ ────────<br><br>
💌 Kính mời <strong style="font-weight: 700;">${guestName}</strong> bấm vào đường link dưới đây để mở thiệp cưới:<br><br>
🔗 <a href="${link}">${link}</a><br><br>
──────── ❀ ────────<br><br>
Sự hiện diện của <strong style="font-weight: 700;">${guestName}</strong> là niềm vinh hạnh và hạnh phúc lớn của gia đình chúng tôi!<br><br>
♡ <strong style="font-weight: 700;">Rất hân hạnh được đón tiếp!</strong> ♡</p>
</div>`;

    return { plain, html };
  };

  const getGuestZaloMessage = (guest) => getGuestInvitationTemplate(guest);
  const getGuestMessengerMessage = (guest) => getGuestInvitationTemplate(guest);

  // Copy full Zalo message
  const copyGuestZaloMessage = async (guest) => {
    await handleSaveCurrent();
    const msg = getGuestZaloMessage(guest);
    await copyRichAndPlainText(msg.plain, msg.html);
    setCopiedZaloId(guest.id);
    setTimeout(() => setCopiedZaloId(''), 3000);
  };

  // Copy full Messenger message
  const copyGuestMessengerMessage = async (guest) => {
    await handleSaveCurrent();
    const msg = getGuestMessengerMessage(guest);
    await copyRichAndPlainText(msg.plain, msg.html);
    setCopiedMessengerId(guest.id);
    setTimeout(() => setCopiedMessengerId(''), 3000);
  };

  // Copy Guest Link
  const copyGuestLink = async (guest) => {
    await handleSaveCurrent();
    const link = getGuestLink(guest);
    navigator.clipboard.writeText(link);
    setCopiedLink(guest.id);
    setTimeout(() => setCopiedLink(''), 2500);
  };

  // Add Guest (Tách biệt tuyệt đối theo Mẫu 1 Nhà Trai / Mẫu 2 Nhà Gái)
  const handleAddGuest = (e) => {
    e.preventDefault();
    if (!newGuest.name.trim()) return;
    const isBride = currentProfileKey === 'bride';
    const currentSideLabel = isBride ? 'Nhà Gái' : 'Nhà Trai';
    const guestObj = {
      ...newGuest,
      name: newGuest.name.trim(),
      group: newGuest.group || 'Bạn học',
      side: currentProfileKey,
      invitedSide: currentSideLabel,
      id: 'guest-' + Date.now()
    };

    // Filter current side guests to prevent any cross-side pollution
    const currentSideGuests = (formData.guests || []).filter(g => {
      if (isBride) return g.side === 'bride' || g.invitedSide === 'Nhà Gái';
      return (g.side === 'groom' || g.invitedSide === 'Nhà Trai' || (!g.side && !g.invitedSide)) && (g.invitedSide !== 'Nhà Gái' && g.side !== 'bride');
    });

    const updatedGuests = [guestObj, ...currentSideGuests];
    const updatedForm = { ...formData, guests: updatedGuests };
    setFormData(updatedForm);

    const updatedAll = cleanProfileGuests({
      ...allProfiles,
      [currentProfileKey]: updatedForm
    });
    setAllProfiles(updatedAll);

    if (onSaveProfile) {
      onSaveProfile(currentProfileKey, updatedForm);
    } else if (onSaveAllProfiles) {
      onSaveAllProfiles(updatedAll);
    }

    setNewGuest({
      name: '',
      salutation: 'Trân trọng kính mời',
      group: 'Bạn học'
    });
    setSaveStatus(`✅ Đã thêm khách "${guestObj.name}" vào danh sách ${currentSideLabel}!`);
    setTimeout(() => setSaveStatus(''), 2500);
  };

  // Delete Guest
  const handleDeleteGuest = (id) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa khách mời này khỏi danh sách?')) {
      const updatedGuests = (formData.guests || []).filter(g => g.id !== id);
      const updatedForm = { ...formData, guests: updatedGuests };
      setFormData(updatedForm);
      const updatedAll = cleanProfileGuests({
        ...allProfiles,
        [currentProfileKey]: updatedForm
      });
      setAllProfiles(updatedAll);
      if (onSaveProfile) {
        onSaveProfile(currentProfileKey, updatedForm);
      } else if (onSaveAllProfiles) {
        onSaveAllProfiles(updatedAll);
      }
      setSaveStatus('Đã xóa khách mời khỏi danh sách!');
      setTimeout(() => setSaveStatus(''), 2500);
    }
  };

  // Filtered guests strictly for active side (Nhà Trai hoặc Nhà Gái)
  const isBrideSide = currentProfileKey === 'bride';
  const currentSideGuests = (formData.guests || []).filter(g => {
    if (isBrideSide) {
      return g.side === 'bride' || g.invitedSide === 'Nhà Gái';
    } else {
      return (g.side === 'groom' || g.invitedSide === 'Nhà Trai' || (!g.side && !g.invitedSide)) && (g.invitedSide !== 'Nhà Gái' && g.side !== 'bride');
    }
  });

  const filteredGuests = currentSideGuests.filter(g => 
    g.name?.toLowerCase().includes(guestSearch.toLowerCase()) ||
    g.group?.toLowerCase().includes(guestSearch.toLowerCase()) ||
    g.note?.toLowerCase().includes(guestSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 flex flex-col font-sans-clean">
      <audio ref={audioPreviewRef} onEnded={() => { setPreviewAudio(null); setPreviewTrackId(null); }} />

      {/* TOP HEADER: INCLUDES PROFILE SWITCHER, LIVE PREVIEW TOGGLE & SAVE BUTTONS (KHUNG ĐỎ) */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        
        {/* Left: Back button & Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isReadOnly) handleSaveCurrent();
              if (onCloseStudio) onCloseStudio();
            }}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Quay lại xem thiệp cưới"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Xem Thiệp</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-serif-elegant font-bold text-stone-900 leading-tight">
                Studio Thiết Kế Thiệp Cưới
              </h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentProfileKey === 'groom'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-rose-100 text-rose-900 border border-rose-300'
              }`}>
                {currentProfileKey === 'groom' ? '🎩 Mẫu 1: Nhà Trai' : '👰 Mẫu 2: Nhà Gái'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 hidden md:block">
              Sửa đến đâu xem trước trực quan đến đó • Tách riêng 2 mẫu thiệp cho Nhà Trai và Nhà Gái
            </p>
          </div>

          {/* User Status & Logout */}
          {currentUser && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-100 border border-stone-200 text-xs ml-2">
              <span className="font-semibold text-stone-800 hidden xl:inline">{currentUser.name || currentUser.email}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isSuperAdmin
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : currentUser.role === 'editor'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                {isSuperAdmin ? '👑 Super Admin' : currentUser.role === 'editor' ? '✏️ Chỉnh Sửa' : '👁️ Chỉ Xem'}
              </span>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="ml-1 px-1.5 py-0.5 rounded text-stone-400 hover:text-rose-600 font-semibold text-[11px] transition-colors cursor-pointer"
                  title="Đăng xuất khỏi tài khoản"
                >
                  Đăng xuất
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Area (KHU VỰC KHOANH ĐỎ): PROFILE SELECTOR + COPY + PREVIEW TOGGLE + SAVE */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* 1. MẪU THIỆP 1 / MẪU THIỆP 2 SELECTOR */}
          <div className="flex items-center bg-stone-100 p-1 rounded-2xl border border-stone-300 shadow-inner">
            <button
              onClick={() => handleSwitchProfileInternal('groom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentProfileKey === 'groom'
                  ? 'bg-[#70561f] text-white shadow-md ring-1 ring-amber-400'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={canEditGroom ? 'Chuyển sang sửa Thiệp Cưới Nhà Trai (Mẫu 1)' : 'Xem Thiệp Cưới Nhà Trai (Mẫu 1) - Chỉ xem'}
            >
              <span className="text-amber-300">🎩</span>
              <span>Mẫu 1 (Nhà Trai)</span>
              {!canEditGroom && (
                <span className="px-1.5 py-0.2 rounded-md bg-stone-200 text-stone-700 text-[10px] font-normal">Chỉ xem</span>
              )}
            </button>

            <button
              onClick={() => handleSwitchProfileInternal('bride')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentProfileKey === 'bride'
                  ? 'bg-rose-800 text-white shadow-md ring-1 ring-rose-400'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/60'
              }`}
              title={canEditBride ? 'Chuyển sang sửa Thiệp Cưới Nhà Gái (Mẫu 2)' : 'Xem Thiệp Cưới Nhà Gái (Mẫu 2) - Chỉ xem'}
            >
              <span className="text-rose-300">👰</span>
              <span>Mẫu 2 (Nhà Gái)</span>
              {!canEditBride && (
                <span className="px-1.5 py-0.2 rounded-md bg-stone-200 text-stone-700 text-[10px] font-normal">Chỉ xem</span>
              )}
            </button>
          </div>

          {/* 2. COPY TOOL BUTTON */}
          <button
            onClick={() => {
              if (isReadOnly) {
                alert('Tài khoản có quyền Chỉ Xem ở mẫu này, không thể thao tác sao chép dữ liệu!');
                return;
              }
              setShowCopyModal(true);
            }}
            disabled={isReadOnly}
            className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold flex items-center gap-1 shadow-sm transition-all ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Sao chép dữ liệu giữa Mẫu 1 và Mẫu 2"
          >
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden xl:inline">Sao Chép Mẫu</span>
          </button>

          {/* 3. TOGGLE PREVIEW BUTTON */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              showPreview
                ? 'bg-amber-50 text-[#70561f] border-amber-300 shadow-sm'
                : 'bg-white text-stone-700 border-stone-300'
            }`}
            title="Bật/Tắt khung xem trước thiệp bên phải"
          >
            <Eye className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">{showPreview ? 'Ẩn Xem Trước' : 'Hiện Xem Trước'}</span>
          </button>

          {/* 3.5. REVERT UNSAVED EDITS BUTTON */}
          <button
            onClick={handleRevertToLastSaved}
            disabled={isReadOnly}
            className={`px-2.5 py-1.5 rounded-xl bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Khôi phục lại dữ liệu theo bản lưu gần nhất (Hoàn tác chưa lưu)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden lg:inline">Phục Hồi Bản Lưu</span>
          </button>

          {/* 4. SAVE CURRENT BUTTON */}
          <button
            onClick={handleSaveCurrent}
            disabled={isReadOnly}
            className={`px-4 py-1.5 rounded-xl text-white text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all ${
              isReadOnly
                ? 'bg-stone-400 cursor-not-allowed opacity-60'
                : currentProfileKey === 'groom'
                  ? 'bg-[#70561f] hover:bg-[#5a4417] hover:scale-102'
                  : 'bg-rose-800 hover:bg-rose-900 hover:scale-102'
            }`}
            title={isReadOnly ? `Không có quyền lưu ${currentProfileKey === 'groom' ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}` : `Lưu thay đổi cho ${currentProfileKey === 'groom' ? 'Thiệp Nhà Trai' : 'Thiệp Nhà Gái'}`}
          >
            <Save className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isReadOnly
                ? `🔒 Chỉ xem (${currentProfileKey === 'groom' ? 'Nhà Trai' : 'Nhà Gái'})`
                : `Lưu ${currentProfileKey === 'groom' ? 'Thiệp 1 (Nhà Trai)' : 'Thiệp 2 (Nhà Gái)'}`}
            </span>
          </button>

          {/* 5. SAVE BOTH BUTTON (Chỉ hiển thị khi có quyền trên cả 2 mẫu) */}
          {(canEditGroom && canEditBride) && (
            <button
              onClick={handleSaveBoth}
              disabled={isReadOnly}
              className="px-2.5 py-1.5 rounded-xl text-stone-200 text-xs font-semibold shadow-sm flex items-center gap-1 transition-all bg-stone-900 hover:bg-stone-800 hover:text-white"
              title="Lưu lại cả 2 mẫu thiệp cùng một lúc"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">Lưu Cả 2</span>
            </button>
          )}

        </div>
      </header>

      {/* READ-ONLY / PERMISSION RESTRICTION WARNING BANNER */}
      {isReadOnly && (
        <div className="bg-amber-500/15 border-b border-amber-400/50 px-4 py-2.5 text-center text-xs text-amber-900 font-medium flex items-center justify-center gap-2">
          <Eye className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            {currentUser?.role === 'viewer' ? (
              <><strong>Chế độ Chỉ Xem:</strong> Bạn đang đăng nhập bằng tài khoản <strong>{currentUser?.email}</strong> (Quyền Chỉ Xem). Bạn có thể xem trước tất cả thông tin nhưng không được phép lưu hoặc chỉnh sửa.</>
            ) : (
              <><strong>Phân quyền bị giới hạn:</strong> Bạn chỉ được phân quyền chỉnh sửa <strong>{userAllowedProfiles.includes('groom') ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}</strong>. Mục <strong>{currentProfileKey === 'groom' ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}</strong> đang ở chế độ <strong>Chỉ Xem</strong> (không được phép lưu).</>
            )}
          </span>
        </div>
      )}

      {/* MAIN CONTAINER: LEFT (FORM TABS + CONTENT) + RIGHT (REAL-TIME LIVE PREVIEW) */}
      <div className="flex-1 max-w-[1720px] w-full mx-auto p-2 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-5 items-start">
        
        {/* LEFT COLUMN: TABS + FORM */}
        <div className={`flex-1 min-w-0 w-full grid grid-cols-1 ${showPreview ? 'lg:grid-cols-12' : 'lg:grid-cols-12'} gap-5`}>
          
          {/* SIDEBAR TABS WITH HAND DRAG-AND-DROP REORDERING */}
          <aside className={`${showPreview ? 'lg:col-span-4 xl:col-span-3.5 2xl:col-span-3' : 'lg:col-span-3.5 2xl:col-span-3'} bg-white rounded-3xl p-2.5 sm:p-3 shadow-md border border-stone-200/80 h-fit space-y-1`}>
            {/* Drag hint header */}
            <div className="flex items-center justify-between px-2.5 py-1 mb-1 border-b border-stone-100 text-[11px] text-stone-400">
              <span className="flex items-center gap-1 font-semibold text-stone-500">
                <span className="text-xs">🖐️</span>
                <span>Kéo thả để sắp xếp</span>
              </span>
              <button
                type="button"
                onClick={handleResetTabOrder}
                className="text-[10px] text-stone-400 hover:text-[#70561f] hover:underline cursor-pointer"
                title="Khôi phục thứ tự các menu về mặc định"
              >
                Đặt lại
              </button>
            </div>

            {(() => {
              const allTabsDefinitions = [
                { id: 'textcontent', label: 'Sửa Dòng Chữ (Ảnh 1,2,3)', icon: Type, highlight: true },
                { id: 'guests', label: 'Quản Lý Khách & Link Riêng', icon: Users, badge: currentSideGuests.length },
                { id: 'wishes', label: 'Tổng Hợp Lời Chúc', icon: MessageSquareHeart, badge: allUniqueWishes?.length },
                { id: 'couple', label: 'Cặp Đôi & Phụ Mẫu', icon: Heart },
                { id: 'events', label: 'Sự Kiện & Bản Đồ Đi Lại', icon: Calendar, badge: formData.events?.length },
                { id: 'gallery', label: 'Album Ảnh & Hiệu Ứng', icon: Camera, badge: formData.gallery?.length },
                { id: 'gift', label: 'Mừng Cưới & Hộp Quà', icon: Gift },
                { id: 'music', label: 'Nhạc Nền Thiệp Cưới', icon: Music },
                { id: 'social', label: 'Cấu Hình Link Zalo & FB', icon: Share2 },
                { id: 'templates', label: 'Chọn Mẫu Bìa Phong Bì', icon: Palette },
                { id: 'cloud', label: 'Đa Đám Mây & Sao Lưu', icon: Database, badge: 'Supabase', highlight: true },
                { id: 'export', label: 'Xuất Bản & File Độc Lập', icon: Download },
                ...(isSuperAdmin ? [
                  { id: 'approval', label: 'Phê Duyệt Phân Quyền', icon: ShieldCheck, highlight: true, badge: '👑 Admin' }
                ] : []),
              ];

              const tabsToRender = tabOrder
                .map(id => allTabsDefinitions.find(t => t.id === id))
                .filter(Boolean);

              // Ensure missing tabs are included
              allTabsDefinitions.forEach(t => {
                if (!tabsToRender.some(tr => tr.id === t.id)) {
                  tabsToRender.push(t);
                }
              });

              return tabsToRender.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                const isDragging = draggedTabId === tab.id;
                const isDragOver = dragOverTabId === tab.id;

                return (
                  <button
                    key={tab.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', tab.id);
                      e.dataTransfer.effectAllowed = 'move';
                      setDraggedTabId(tab.id);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverTabId !== tab.id) setDragOverTabId(tab.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverTabId === tab.id) setDragOverTabId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (!draggedTabId || draggedTabId === tab.id) return;
                      const currentIds = tabsToRender.map(t => t.id);
                      const fromIdx = currentIds.indexOf(draggedTabId);
                      const toIdx = currentIds.indexOf(tab.id);
                      if (fromIdx !== -1 && toIdx !== -1) {
                        const updated = [...currentIds];
                        updated.splice(fromIdx, 1);
                        updated.splice(toIdx, 0, draggedTabId);
                        setTabOrder(updated);
                        localStorage.setItem('wedding_studio_tabs_order', JSON.stringify(updated));
                      }
                      setDraggedTabId(null);
                      setDragOverTabId(null);
                    }}
                    onDragEnd={() => {
                      setDraggedTabId(null);
                      setDragOverTabId(null);
                    }}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'templates') {
                        setPreviewEnvelopeOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 sm:px-3 py-2.5 rounded-2xl text-xs sm:text-[13px] font-medium transition-all cursor-grab active:cursor-grabbing select-none ${
                      isActive
                        ? 'bg-[#70561f] text-white shadow-md font-semibold'
                        : 'text-stone-700 hover:bg-stone-50 hover:text-stone-900'
                    } ${isDragging ? 'opacity-40 scale-98 border-2 border-dashed border-[#70561f]' : ''} ${
                      isDragOver ? 'ring-2 ring-amber-500 bg-amber-50/70' : ''
                    }`}
                    title="Bấm để mở sửa • Bấm giữ và kéo thả bằng bàn tay để đổi thứ tự"
                  >
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <GripVertical
                        className={`w-3.5 h-3.5 shrink-0 transition-opacity cursor-grab active:cursor-grabbing ${
                          isActive ? 'text-amber-200/70 hover:text-white' : 'text-stone-300 hover:text-stone-600'
                        }`}
                      />
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-300' : (tab.highlight ? 'text-amber-600' : 'text-stone-400')}`} />
                      <span className={`truncate whitespace-nowrap leading-none tracking-tight ${tab.highlight && !isActive ? 'text-[#70561f] font-bold' : ''}`}>
                        {tab.label}
                      </span>
                    </div>

                    {tab.badge !== undefined && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold shrink-0 ml-1.5 leading-none ${
                        isActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </aside>

          {/* TAB CONTENT AREA */}
          <main className={`${showPreview ? 'lg:col-span-8 xl:col-span-8.5 2xl:col-span-9' : 'lg:col-span-8.5 2xl:col-span-9'} bg-white rounded-3xl p-4 sm:p-6 lg:p-8 shadow-md border border-stone-200/80`}>
          
          {/* READ-ONLY LOCK NOTIFICATION IN TAB AREA */}
          {isReadOnly && activeTab !== 'approval' && (
            <div className="mb-6 p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-bold text-lg flex-shrink-0">
                  🔒
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-sm">
                    {currentUser?.role === 'viewer'
                      ? 'Chế độ Chỉ Xem (Read-only)'
                      : `Mục này đang ở chế độ Chỉ Xem (${currentProfileKey === 'groom' ? 'Mẫu 1: Nhà Trai' : 'Mẫu 2: Nhà Gái'})`}
                  </h4>
                  <p className="text-xs text-amber-850 mt-0.5">
                    {currentUser?.role === 'viewer'
                      ? 'Tài khoản của bạn chỉ có quyền xem nội dung và danh sách, mọi chức năng lưu và chỉnh sửa đã được khóa an toàn.'
                      : `Tài khoản ${currentUser?.email} được cấp quyền chỉnh sửa ${userAllowedProfiles.includes('groom') ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}. Bạn không thể thao tác chỉnh sửa hay lưu trên ${currentProfileKey === 'groom' ? 'Mẫu 1 (Nhà Trai)' : 'Mẫu 2 (Nhà Gái)'}.`}
                  </p>
                </div>
              </div>
              {!canEditCurrentProfile && (
                userAllowedProfiles.includes('groom') ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchProfileInternal('groom')}
                    className="px-3.5 py-2 rounded-xl bg-[#70561f] text-white text-xs font-bold shadow-sm hover:bg-[#5a4417] transition-all cursor-pointer flex-shrink-0"
                  >
                    🎩 Sang Mẫu 1 (Nhà Trai) để chỉnh sửa
                  </button>
                ) : userAllowedProfiles.includes('bride') ? (
                  <button
                    type="button"
                    onClick={() => handleSwitchProfileInternal('bride')}
                    className="px-3.5 py-2 rounded-xl bg-rose-800 text-white text-xs font-bold shadow-sm hover:bg-rose-900 transition-all cursor-pointer flex-shrink-0"
                  >
                    👰 Sang Mẫu 2 (Nhà Gái) để chỉnh sửa
                  </button>
                ) : null
              )}
            </div>
          )}

          <fieldset disabled={isReadOnly && activeTab !== 'approval'} className="contents">
          {/* TAB: SỬA TỪNG DÒNG CHỮ (QUAN TRỌNG NHẤT - THEO YÊU CẦU NGƯỜI DÙNG) */}
          {activeTab === 'textcontent' && (
            <div className="space-y-8">
              <div className="border-b border-stone-200 pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Type className="w-5 h-5 text-[#70561f]" />
                    <span>Sửa Từng Dòng Chữ Trên Thiệp Cưới</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Toàn bộ các dòng chữ xuất hiện trong 3 hình ảnh bạn tải lên và toàn bộ thiệp đều có thể sửa ở đây!
                  </p>
                </div>

                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold shadow flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lưu Ngay</span>
                </button>
              </div>

              {/* 1. KHỐI LỜI MỜI (ẢNH 1 ĐỎ) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                    <span>1. Dòng Chữ Lời Mời Đầu Thiệp (Khoanh đỏ Ảnh 1)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({
                      ...p,
                      sectionVisibility: { ...(p.sectionVisibility || {}), greeting: !(p.sectionVisibility?.greeting !== false) }
                    }))}
                    className="text-stone-500 hover:text-rose-600 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                  >
                    {formData.sectionVisibility?.greeting !== false ? (
                      <>
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-rose-600">Xóa/Ẩn mục này</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-amber-700" />
                        <span className="text-amber-800 font-bold">Khôi phục hiển thị</span>
                      </>
                    )}
                  </button>
                </div>

                {formData.sectionVisibility?.greeting === false ? (
                  <div className="p-3 bg-stone-100 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500 flex items-center justify-between">
                    <span>Mục 1 (Lời mời đầu thiệp) đang được <b>Ẩn</b> khỏi thiệp cưới.</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        sectionVisibility: { ...(p.sectionVisibility || {}), greeting: true }
                      }))}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-semibold"
                    >
                      Bật lại mục này
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng mời trên:</label>
                        <input
                          type="text"
                          value={formData.invitationGreeting || ''}
                          onChange={(e) => setFormData({ ...formData, invitationGreeting: e.target.value })}
                          placeholder="Trân trọng kính mời"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng mời dưới:</label>
                        <input
                          type="text"
                          value={formData.invitationSub || ''}
                          onChange={(e) => setFormData({ ...formData, invitationSub: e.target.value })}
                          placeholder="đến tham dự lễ cưới của"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      {currentProfileKey === 'bride' ? (
                        <>
                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Tên Cô Dâu hiển thị (Nhà gái):</label>
                            <input
                              type="text"
                              value={formData.bride?.nickname || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bride: { ...formData.bride, nickname: e.target.value }
                              })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Tên Chú Rể hiển thị:</label>
                            <input
                              type="text"
                              value={formData.groom?.nickname || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                groom: { ...formData.groom, nickname: e.target.value }
                              })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Tên Chú Rể hiển thị (Nhà trai):</label>
                            <input
                              type="text"
                              value={formData.groom?.nickname || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                groom: { ...formData.groom, nickname: e.target.value }
                              })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                            />
                          </div>

                          <div>
                            <label className="block text-stone-700 font-semibold mb-1">Tên Cô Dâu hiển thị:</label>
                            <input
                              type="text"
                              value={formData.bride?.nickname || ''}
                              onChange={(e) => setFormData({
                                ...formData,
                                bride: { ...formData.bride, nickname: e.target.value }
                              })}
                              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 2 & 3. CÁC SỰ KIỆN CƯỚI (DANH SÁCH DYNAMIC: THÊM / XÓA TÙY Ý) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                      <span>2 & 3. Các Sự Kiện Cưới (Tiệc Cưới, Lễ Thành Hôn, Vu Quy...)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Tự do thêm mới hoặc xóa bớt các sự kiện theo đúng lịch cưới thực tế của bạn.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newEv = {
                        id: 'event-' + Date.now(),
                        title: 'LỄ VU QUY',
                        time: '11 GIỜ',
                        date: '26',
                        month: 'Tháng 12',
                        year: 'Năm 2026',
                        dayOfWeek: 'Thứ Bảy',
                        lunarDate: '(Tức ngày 18 tháng 11 năm Bính Ngọ)',
                        venue: 'Tại Tư gia...',
                        address: 'Địa chỉ: Xã Sóc Sơn - TP. Hà Nội',
                        mapBtnText: 'Chỉ đường',
                        mapUrl: 'https://maps.google.com'
                      };
                      setFormData(p => ({ ...p, events: [...(p.events || []), newEv] }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm Sự Kiện Cưới Mới</span>
                  </button>
                </div>

                {(formData.events || []).map((ev, index) => (
                  <div key={ev.id || index} className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 relative group">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                        <span>Sự Kiện {index + 1}: {ev.title || 'TIỆC CƯỚI'}</span>
                      </h4>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Bạn có chắc muốn xóa [${ev.title || `Sự kiện ${index + 1}`}] khỏi thiệp?`)) {
                            const updated = (formData.events || []).filter((_, i) => i !== index);
                            setFormData({ ...formData, events: updated });
                          }
                        }}
                        className="text-stone-400 hover:text-rose-600 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        title="Xóa hẳn sự kiện này khỏi thiệp"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-rose-600">Xóa sự kiện này</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="sm:col-span-2">
                        <label className="block text-stone-700 font-semibold mb-1">Tiêu đề sự kiện:</label>
                        <input
                          type="text"
                          value={ev.title || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].title = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Giờ tổ chức:</label>
                        <input
                          type="text"
                          value={ev.time || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].time = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="16 GIỜ"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-600 mb-1">Thứ:</label>
                        <input
                          type="text"
                          value={ev.dayOfWeek || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].dayOfWeek = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="Thứ Sáu"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 mb-1">Ngày (số to):</label>
                        <input
                          type="text"
                          value={ev.date || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].date = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="25"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 mb-1">Tháng:</label>
                        <input
                          type="text"
                          value={ev.month || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].month = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="Tháng 12"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 mb-1">Năm:</label>
                        <input
                          type="text"
                          value={ev.year || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].year = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="Năm 2026"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-stone-700 font-semibold mb-1">Ngày âm lịch:</label>
                      <input
                        type="text"
                        value={ev.lunarDate || ''}
                        onChange={(e) => {
                          const newEv = [...formData.events];
                          newEv[index].lunarDate = e.target.value;
                          setFormData({ ...formData, events: newEv });
                        }}
                        placeholder="(Tức ngày 17 tháng 11 năm Bính Ngọ)"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên địa điểm (Tại...):</label>
                        <input
                          type="text"
                          value={ev.venue || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].venue = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="Tại Nhà văn hoá..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Địa chỉ chi tiết:</label>
                        <input
                          type="text"
                          value={ev.address || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].address = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="Địa chỉ: xã Sóc Sơn - Tp. Hà Nội"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Chữ nút bấm:</label>
                        <input
                          type="text"
                          value={ev.mapBtnText || 'Chỉ đường'}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].mapBtnText = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Link Google Maps:</label>
                        <input
                          type="text"
                          value={ev.mapUrl || ''}
                          onChange={(e) => {
                            const newEv = [...formData.events];
                            newEv[index].mapUrl = e.target.value;
                            setFormData({ ...formData, events: newEv });
                          }}
                          placeholder="https://maps.app.goo.gl/..."
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 4. TIMELINE (MỐC LỊCH TRÌNH TIỆC CƯỚI) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/40 border border-amber-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                      <span>4. Mốc Lịch Trình Tiệc Cưới (Timeline)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Các mốc thời gian đón khách, khai tiệc. Khi ẩn mục này, ảnh cưới ở mục 3 vẫn hiển thị độc lập bên dưới lịch.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        sectionVisibility: { ...(p.sectionVisibility || {}), timeline: !(p.sectionVisibility?.timeline !== false) }
                      }))}
                      className="text-stone-500 hover:text-rose-600 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                      title="Xóa/Ẩn mục timeline khỏi thiệp"
                    >
                      {formData.sectionVisibility?.timeline !== false ? (
                        <>
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-rose-600">Xóa/Ẩn mục Timeline</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-amber-700" />
                          <span className="text-amber-800 font-bold">Khôi phục Timeline</span>
                        </>
                      )}
                    </button>

                    {formData.sectionVisibility?.timeline !== false && (
                      <button
                        type="button"
                        onClick={() => {
                          const newTl = {
                            id: 'tl-' + Date.now(),
                            time: '17:00',
                            date: 'NGÀY 25.12.2026',
                            title: 'CHỤP ẢNH KỶ NIỆM',
                            flower: '/templates/007/images/timeline-flower.png'
                          };
                          setFormData(p => ({ ...p, timeline: [...(p.timeline || []), newTl] }));
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-100 text-stone-800 text-[11px] font-semibold border border-amber-300 flex items-center gap-1 shadow-sm"
                      >
                        <Plus className="w-3 h-3 text-amber-700" />
                        <span>Thêm mốc</span>
                      </button>
                    )}
                  </div>
                </div>

                {formData.sectionVisibility?.timeline === false ? (
                  <div className="p-3 bg-stone-100 rounded-xl border border-dashed border-stone-300 text-xs text-stone-500 flex items-center justify-between">
                    <span>Mục 4 (Mốc Lịch Trình Tiệc Cưới) đang được <b>Xóa/Ẩn</b> khỏi thiệp cưới theo ý bạn.</span>
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({
                        ...p,
                        sectionVisibility: { ...(p.sectionVisibility || {}), timeline: true }
                      }))}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-semibold"
                    >
                      Bật lại mục Timeline
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs">
                      <label className="text-stone-700 font-semibold shrink-0">Tiêu đề khối Timeline:</label>
                      <input
                        type="text"
                        value={formData.timelineHeading || 'Timeline'}
                        onChange={(e) => setFormData({ ...formData, timelineHeading: e.target.value })}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white text-xs font-bold text-[#70561f] text-center w-40"
                      />
                    </div>

                    <div className="space-y-3">
                      {(formData.timeline || []).map((tl, index) => (
                        <div key={tl.id || index} className="p-3 bg-white rounded-xl border border-[#d8cdb4] grid grid-cols-1 sm:grid-cols-7 gap-2.5 text-xs items-center">
                          <div className="sm:col-span-2">
                            <label className="block text-stone-600 text-[10px] mb-0.5">Giờ (vd: 15:00):</label>
                            <input
                              type="text"
                              value={tl.time}
                              onChange={(e) => {
                                const newTl = [...formData.timeline];
                                newTl[index].time = e.target.value;
                                setFormData({ ...formData, timeline: newTl });
                              }}
                              className="w-full px-2 py-1 rounded-lg border border-stone-300 text-xs font-bold text-[#70561f]"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-stone-600 text-[10px] mb-0.5">Ngày (vd: NGÀY 25.12.2026):</label>
                            <input
                              type="text"
                              value={tl.date}
                              onChange={(e) => {
                                const newTl = [...formData.timeline];
                                newTl[index].date = e.target.value;
                                setFormData({ ...formData, timeline: newTl });
                              }}
                              className="w-full px-2 py-1 rounded-lg border border-stone-300 text-xs"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-stone-600 text-[10px] mb-0.5">Tên mốc (vd: ĐÓN KHÁCH):</label>
                            <input
                              type="text"
                              value={tl.title}
                              onChange={(e) => {
                                const newTl = [...formData.timeline];
                                newTl[index].title = e.target.value;
                                setFormData({ ...formData, timeline: newTl });
                              }}
                              className="w-full px-2 py-1 rounded-lg border border-stone-300 text-xs font-bold"
                            />
                          </div>

                          <div className="sm:col-span-1 flex justify-end items-end pt-3 sm:pt-0">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (formData.timeline || []).filter((_, i) => i !== index);
                                setFormData({ ...formData, timeline: updated });
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Xóa mốc này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 5. CÁC CÂU CHỮ KHÁC (SAVE THE DATE, HỘP MỪNG CƯỚI, SỔ LƯU BÚT, FOOTER) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f]">
                  <span>5. Các Dòng Chữ Tiêu Đề Khác</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tiêu đề Save the date:</label>
                    <input
                      type="text"
                      value={formData.saveTheDateText || 'Save the date'}
                      onChange={(e) => setFormData({ ...formData, saveTheDateText: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Ngày Save the date:</label>
                    <input
                      type="text"
                      value={formData.saveTheDateDay || '26.12.2026'}
                      onChange={(e) => setFormData({ ...formData, saveTheDateDay: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                    />
                  </div>

                  <div className="sm:col-span-2 p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-stone-800 font-bold text-xs flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#70561f]" />
                        <span>Kích thước biểu tượng cánh hoa (trên mục Nhà Trai - Nhà Gái):</span>
                      </label>
                      <span className="text-xs font-mono font-bold text-[#70561f] bg-white px-2 py-0.5 rounded-lg border border-amber-200">
                        {formData.saveTheDateFlowerSize || 112}px
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="40"
                        max="220"
                        step="4"
                        value={formData.saveTheDateFlowerSize || 112}
                        onChange={(e) => setFormData({ ...formData, saveTheDateFlowerSize: Number(e.target.value) })}
                        className="flex-1 accent-[#70561f] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 mt-2">
                      <span className="text-[11px] text-stone-500">Chọn nhanh:</span>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, saveTheDateFlowerSize: 96 })}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                          formData.saveTheDateFlowerSize === 96
                            ? 'bg-[#70561f] text-white'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        Vừa (96px)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, saveTheDateFlowerSize: 112 })}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                          (formData.saveTheDateFlowerSize || 112) === 112
                            ? 'bg-[#70561f] text-white'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        Lớn (112px - Chuẩn)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, saveTheDateFlowerSize: 140 })}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                          formData.saveTheDateFlowerSize === 140
                            ? 'bg-[#70561f] text-white'
                            : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        Rất Lớn (140px)
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tiêu đề Album ảnh:</label>
                    <input
                      type="text"
                      value={formData.galleryHeading || 'Our Memories'}
                      onChange={(e) => setFormData({ ...formData, galleryHeading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tiêu đề Hộp mừng cưới:</label>
                    <input
                      type="text"
                      value={formData.giftHeading || 'Hộp mừng cưới'}
                      onChange={(e) => setFormData({ ...formData, giftHeading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tiêu đề Sổ lưu bút:</label>
                    <input
                      type="text"
                      value={formData.commentsHeading || 'Sổ lưu bút'}
                      onChange={(e) => setFormData({ ...formData, commentsHeading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Tiêu đề Countdown:</label>
                    <input
                      type="text"
                      value={formData.countdownHeading || 'Countdown'}
                      onChange={(e) => setFormData({ ...formData, countdownHeading: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Lời cảm ơn chân thiệp:</label>
                    <input
                      type="text"
                      value={formData.footerThankYou || 'Rất hân hạnh được đón tiếp!'}
                      onChange={(e) => setFormData({ ...formData, footerThankYou: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Chữ ký chân thiệp:</label>
                    <input
                      type="text"
                      value={formData.footerSignature || 'Toàn + Phương'}
                      onChange={(e) => setFormData({ ...formData, footerSignature: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                    />
                  </div>
                </div>
              </div>

              {/* 6. ĐẦU MỤC TỰ TẠO THÊM (BỔ SUNG THEO Ý NGƯỜI DÙNG) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/30 border border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                      <span>6. Thêm Các Đầu Mục Tự Tạo Mới</span>
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Bổ sung bất kỳ mục nào khác bạn muốn hiển thị trên thiệp cưới (Dresscode, Gửi xe, Lưu ý...).
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const newCs = {
                        id: 'custom-' + Date.now(),
                        title: 'LƯU Ý DÀNH CHO KHÁCH MỜI',
                        subtitle: 'Dresscode & Phương tiện',
                        content: 'Quý khách vui lòng diện trang phục tông màu Pastel / Trắng / Be trang nhã.'
                      };
                      setFormData(p => ({ ...p, customSections: [...(p.customSections || []), newCs] }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Thêm Đầu Mục Mới</span>
                  </button>
                </div>

                {(formData.customSections || []).map((cs, index) => (
                  <div key={cs.id || index} className="p-4 bg-white rounded-xl border border-[#d8cdb4] space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                      <h4 className="font-bold text-xs text-[#70561f] uppercase tracking-wide">
                        Mục Tự Tạo {index + 1}: {cs.title}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (formData.customSections || []).filter((_, i) => i !== index);
                          setFormData({ ...formData, customSections: updated });
                        }}
                        className="text-rose-600 hover:text-rose-800 flex items-center gap-1 text-[11px] font-semibold"
                        title="Xóa mục tự tạo này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa mục này</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tiêu đề mục:</label>
                        <input
                          type="text"
                          value={cs.title}
                          onChange={(e) => {
                            const updated = [...formData.customSections];
                            updated[index].title = e.target.value;
                            setFormData({ ...formData, customSections: updated });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold"
                          placeholder="vd: LƯU Ý DÀNH CHO KHÁCH"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng chú thích phụ (nếu có):</label>
                        <input
                          type="text"
                          value={cs.subtitle || ''}
                          onChange={(e) => {
                            const updated = [...formData.customSections];
                            updated[index].subtitle = e.target.value;
                            setFormData({ ...formData, customSections: updated });
                          }}
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 text-xs italic"
                          placeholder="vd: Dresscode trang phục"
                        />
                      </div>
                    </div>

                    <div className="text-xs">
                      <label className="block text-stone-700 font-semibold mb-1">Nội dung chi tiết:</label>
                      <textarea
                        rows={3}
                        value={cs.content || ''}
                        onChange={(e) => {
                          const updated = [...formData.customSections];
                          updated[index].content = e.target.value;
                          setFormData({ ...formData, customSections: updated });
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs leading-relaxed"
                        placeholder="Nhập nội dung hiển thị..."
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* SAVE BUTTON AT BOTTOM */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-bold shadow-lg flex items-center gap-2 transition-all hover:scale-102"
                >
                  <Save className="w-4 h-4 text-amber-300" />
                  <span>Lưu Toàn Bộ Thay Đổi</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB: QUẢN LÝ KHÁCH MỜI */}
          {activeTab === 'guests' && (
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#70561f]" />
                    <span>Danh Sách Khách Mời & Sinh Link Riêng (Tách Biệt 2 Nhà)</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Mỗi khách mời sẽ có link riêng hiển thị đúng tên trên phong bì và <b>khóa cố định 100%</b> đúng thiệp cưới Nhà Trai hoặc Nhà Gái.
                  </p>
                </div>
              </div>

              {/* BANNER PHÂN BIỆT RÕ RÀNG NHÀ TRAI / NHÀ GÁI */}
              {currentProfileKey === 'groom' ? (
                <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#70561f] text-white flex items-center justify-center text-xl shrink-0 shadow">
                      🎩
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-950 text-sm sm:text-base">MẪU 1: DANH SÁCH KHÁCH MỜI BÊN NHÀ TRAI</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold border border-amber-300">
                          Khóa cố định ?side=groom
                        </span>
                      </div>
                      <p className="text-xs text-amber-900/90 mt-0.5">
                        Tất cả khách mời thêm ở đây thuộc bên <b>Nhà Trai</b>. Khi khách nhận link bấm mở, hệ thống luôn hiển thị đúng 100% thông tin thiệp cưới Nhà Trai!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchProfileInternal('bride')}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-50 text-rose-800 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                    title="Chuyển sang xem danh sách khách mời bên Nhà Gái"
                  >
                    <span>👰 Sang Khách Nhà Gái (Mẫu 2)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-gradient-to-r from-rose-50 via-pink-50 to-rose-100/60 border-2 border-rose-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-700 text-white flex items-center justify-center text-xl shrink-0 shadow">
                      👰
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-950 text-sm sm:text-base">MẪU 2: DANH SÁCH KHÁCH MỜI BÊN NHÀ GÁI</span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 text-[10px] font-bold border border-rose-300">
                          Khóa cố định ?side=bride
                        </span>
                      </div>
                      <p className="text-xs text-rose-900/90 mt-0.5">
                        Tất cả khách mời thêm ở đây thuộc bên <b>Nhà Gái</b>. Khi khách nhận link bấm mở, hệ thống luôn hiển thị đúng 100% thông tin thiệp cưới Nhà Gái!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchProfileInternal('groom')}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all shrink-0 cursor-pointer"
                    title="Chuyển sang xem danh sách khách mời bên Nhà Trai"
                  >
                    <span>🎩 Sang Khách Nhà Trai (Mẫu 1)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* CẤU HÌNH DOMAIN & HƯỚNG DẪN GỬI ZALO */}
              <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-amber-50/60 rounded-2xl border border-blue-200 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Share2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 text-xs">
                    <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                      <span>Tên Miền / Đường Dẫn Thiệp Khi Gửi Qua Zalo & Facebook</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-semibold">Tự động gắn vào link</span>
                    </h4>
                    <p className="text-stone-600 mt-1 leading-relaxed">
                      Để Zalo hiển thị **thẻ ảnh mô phỏng có hình đại diện & tiêu đề** (Rich Card giống mẫu ở Tab 7), đường link cần có tên miền công khai trên Internet (<code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-700 font-mono">https://...</code>).
                    </p>
                    <div className="mt-2.5 flex flex-col sm:flex-row gap-2 items-center">
                      <div className="w-full sm:flex-1 relative">
                        <input
                          type="url"
                          value={formData.socialShare?.customDomain || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            socialShare: { ...formData.socialShare, customDomain: e.target.value }
                          })}
                          placeholder="Dán link web online của bạn tại đây (VD: https://thiepcuoi-hieuthuy-web.vercel.app)..."
                          className="w-full px-3 py-2 rounded-xl border border-blue-300 bg-white text-xs focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        />
                      </div>
                      {formData.socialShare?.customDomain && (
                        <button
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            socialShare: { ...formData.socialShare, customDomain: '' }
                          })}
                          className="text-[11px] text-stone-500 hover:text-stone-800 shrink-0 px-2 py-1"
                        >
                          Dùng link mặc định
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 mt-1.5 italic">
                      💡 Khi đang chạy thử trên máy tính (<code className="font-mono text-amber-700">localhost:5173</code>), Zalo không cào được ảnh do máy chủ Zalo không thể truy cập máy nội bộ của bạn. Bạn hãy bấm nút <b>"💌 Copy Lời Mời Zalo"</b> ở từng khách bên dưới để gửi tin nhắn kèm lời mời trang trọng, đầy đủ nhất!
                    </p>
                  </div>
                </div>
              </div>

              {/* ADD NEW GUEST FORM */}
              <form onSubmit={handleAddGuest} className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    currentProfileKey === 'groom' ? 'text-amber-800' : 'text-rose-800'
                  }`}>
                    <Plus className="w-4 h-4" />
                    <span>
                      {currentProfileKey === 'groom' ? 'Thêm Khách Mời Mới (Bên Nhà Trai)' : 'Thêm Khách Mời Mới (Bên Nhà Gái)'}
                    </span>
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    currentProfileKey === 'groom' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                  }`}>
                    {currentProfileKey === 'groom' ? '🎩 Mẫu 1: Nhà Trai' : '👰 Mẫu 2: Nhà Gái'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Tên khách mời *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Anh Nam và Người Thương"
                      value={newGuest.name}
                      onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#70561f] bg-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-600 font-medium mb-1">Lời xưng hô / Danh xưng</label>
                    <select
                      value={newGuest.salutation}
                      onChange={(e) => setNewGuest({ ...newGuest, salutation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:border-[#70561f] bg-white text-xs"
                    >
                      <option value="Trân trọng kính mời">Trân trọng kính mời</option>
                      <option value="Kính mời">Kính mời</option>
                      <option value="Thân mời">Thân mời</option>
                      <option value="Thân ái gửi">Thân ái gửi</option>
                    </select>
                  </div>
                </div>

                {/* Nhóm khách mời (4 màu tươi sáng: Bạn học, Bạn xã hội, Đồng nghiệp, Họ hàng) */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="block text-stone-600 font-medium text-xs">
                        Nhóm khách mời:
                      </label>
                      {/* Hiển thị màu của mục đang chọn bên cạnh để nhìn dễ phân biệt */}
                      {(() => {
                        const activeCfg = GUEST_GROUP_CONFIG[newGuest.group || 'Bạn học'] || GUEST_GROUP_CONFIG['Bạn học'];
                        return (
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-xs transition-all ${activeCfg.badgeClass}`}>
                            <span>{activeCfg.icon}</span>
                            <span>Đang chọn: {activeCfg.name}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.keys(GUEST_GROUP_CONFIG).map((groupName) => {
                        const isSelected = (newGuest.group || 'Bạn học') === groupName;
                        const cfg = GUEST_GROUP_CONFIG[groupName];
                        return (
                          <button
                            key={groupName}
                            type="button"
                            onClick={() => setNewGuest({ ...newGuest, group: groupName })}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isSelected
                                ? cfg.btnSelectedClass
                                : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 shadow-xs'
                            }`}
                          >
                            <span>{cfg.icon}</span>
                            <span>{cfg.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className={`self-end sm:self-auto px-5 py-2.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0 ${
                      currentProfileKey === 'groom' ? 'bg-[#70561f] hover:bg-[#5b4618]' : 'bg-rose-700 hover:bg-rose-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-200" />
                    <span>{currentProfileKey === 'groom' ? 'Thêm Khách Nhà Trai' : 'Thêm Khách Nhà Gái'}</span>
                  </button>
                </div>
              </form>



              {/* SEARCH & GUEST LIST TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={`Tìm khách ${currentProfileKey === 'groom' ? 'Nhà Trai' : 'Nhà Gái'} theo tên hoặc nhóm...`}
                      value={guestSearch}
                      onChange={(e) => setGuestSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#70561f] bg-white"
                    />
                  </div>
                  <span className="text-xs text-stone-600 font-medium">
                    Tổng khách {currentProfileKey === 'groom' ? 'Nhà Trai' : 'Nhà Gái'}: <b>{filteredGuests.length}</b> khách
                  </span>
                </div>

                {filteredGuests.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-stone-300 p-6 space-y-2">
                    <p className="text-stone-500 text-xs font-medium">
                      Chưa có khách mời nào trong danh sách {currentProfileKey === 'groom' ? 'Nhà Trai' : 'Nhà Gái'}.
                    </p>
                    <p className="text-stone-400 text-[11px]">
                      Hãy nhập tên khách vào ô bên trên rồi bấm <b>"Thêm Khách"</b> để tạo link riêng biệt!
                    </p>
                  </div>
                ) : (
                  <div className="border border-stone-200 rounded-2xl overflow-hidden divide-y divide-stone-100 bg-white">
                    {filteredGuests.map((guest) => {
                      const guestLink = getGuestLink(guest);
                      const isBrideGuest = (currentProfileKey === 'bride' || guest?.side === 'bride' || guest?.invitedSide === 'Nhà Gái');
                      return (
                        <div key={guest.id} className="p-3 sm:p-4 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-stone-900 text-sm">
                                {guest.name}
                              </span>
                              {(() => {
                                const gGroup = guest.group || 'Bạn học';
                                const cfg = GUEST_GROUP_CONFIG[gGroup] || {
                                  icon: '👥',
                                  badgeClass: 'bg-stone-100 text-stone-700 border-stone-200'
                                };
                                return (
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 shadow-2xs ${cfg.badgeClass}`}>
                                    <span>{cfg.icon}</span>
                                    <span>{gGroup}</span>
                                  </span>
                                );
                              })()}
                            </div>
                            <p className="text-[11px] text-stone-500">
                              {guest.salutation}: <span className="font-medium text-stone-700">{guest.name}</span>
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 pt-2 sm:pt-0">
                            {/* Copy plain link */}
                            <button
                              type="button"
                              onClick={() => copyGuestLink(guest)}
                              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 text-xs shadow-sm cursor-pointer ${
                                copiedLink === guest.id
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-300'
                                  : isBrideGuest
                                    ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                              }`}
                              title="Sao chép đường link mở thiệp của khách này"
                            >
                              {copiedLink === guest.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã copy link!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>

                            {/* Copy full formal Zalo message */}
                            <button
                              type="button"
                              onClick={() => copyGuestZaloMessage(guest)}
                              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 text-xs shadow-sm cursor-pointer ${
                                copiedZaloId === guest.id
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                              }`}
                              title="Sao chép lời mời tối ưu cho Zalo (Tên khách in đậm & in nghiêng nổi bật trang trọng)"
                            >
                              {copiedZaloId === guest.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã copy Zalo!</span>
                                </>
                              ) : (
                                <>
                                  <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                                  <span>Lời Mời Zalo</span>
                                </>
                              )}
                            </button>

                            {/* Copy full formal Messenger message */}
                            <button
                              type="button"
                              onClick={() => copyGuestMessengerMessage(guest)}
                              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 text-xs shadow-sm cursor-pointer ${
                                copiedMessengerId === guest.id
                                  ? 'bg-purple-600 text-white ring-2 ring-purple-300'
                                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                              }`}
                              title="Sao chép lời mời tối ưu cho Messenger Facebook (Tên khách in đậm & in nghiêng chuẩn Markdown Facebook)"
                            >
                              {copiedMessengerId === guest.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Đã copy Messenger!</span>
                                </>
                              ) : (
                                <>
                                  <Share2 className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Lời Mời Messenger</span>
                                </>
                              )}
                            </button>

                            <a
                              href={guestLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleSaveCurrent()}
                              className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                              title="Mở thử thiệp (giao diện thực tế khách nhìn thấy, sạch 100% không menu)"
                            >
                              <Eye className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => handleDeleteGuest(guest.id)}
                              className="p-1.5 rounded-xl hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa khách mời này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          
          {/* TAB: TỔNG HỢP LỜI CHÚC (NHÀ TRAI & NHÀ GÁI) */}
          {activeTab === 'wishes' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                <div className="space-y-1">
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <MessageSquareHeart className="w-5 h-5 text-[#70561f]" />
                    <span>Tổng Hợp Lời Chúc Mừng Hạnh Phúc</span>
                  </h2>
                  <p className="text-xs text-stone-500">
                    Lưu trữ và phân loại toàn bộ lời chúc mừng từ khách mời của cả hai họ Nhà Trai và Nhà Gái.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAddWishModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-300" />
                    <span>Thêm lời chúc thủ công</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fetchCloudWishes(true)}
                    disabled={isRefreshingWishes}
                    className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="Tải lại danh sách lời chúc mới nhất từ máy chủ"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 text-[#70561f] ${isRefreshingWishes ? 'animate-spin' : ''}`} />
                    <span>{isRefreshingWishes ? 'Đang tải...' : 'Làm mới'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handlePurgeAllWishes}
                    className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 border border-rose-200"
                    title="Xóa tất cả lời chúc đang có trong hệ thống"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Xóa tất cả</span>
                  </button>
                </div>
              </div>

              {/* STATS OVERVIEW CARDS */}
              {(() => {
                const total = allUniqueWishes.length;
                const groomCount = allUniqueWishes.filter(w => w.side !== 'bride' && !w.sideLabel?.toLowerCase().includes('gái')).length;
                const brideCount = allUniqueWishes.filter(w => w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái')).length;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center gap-3 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        💌
                      </div>
                      <div>
                        <div className="text-xl font-bold text-[#70561f]">{total}</div>
                        <div className="text-[11px] font-medium text-stone-600">Tổng số lời chúc đã nhận</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center gap-3 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        🤵
                      </div>
                      <div>
                        <div className="text-xl font-bold text-blue-900">{groomCount}</div>
                        <div className="text-[11px] font-medium text-blue-700">Khách mời Họ Nhà Trai</div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex items-center gap-3 shadow-xs">
                      <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center font-bold">
                        👰
                      </div>
                      <div>
                        <div className="text-xl font-bold text-rose-900">{brideCount}</div>
                        <div className="text-[11px] font-medium text-rose-700">Khách mời Họ Nhà Gái</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* MODAL THÊM LỜI CHÚC THỦ CÔNG */}
              {showAddWishModal && (
                <div className="p-4 bg-amber-50/50 rounded-2xl border-2 border-dashed border-[#70561f]/40 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-amber-600" />
                      <span>Thêm Lời Chúc Mới (Ghi Nhận Thủ Công)</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddWishModal(false)}
                      className="p-1 rounded-lg hover:bg-stone-200 text-stone-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleAddManualWish} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên khách mời gửi chúc *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ví dụ: Bác Tuấn (Bác ruột), Bạn Lan..."
                          value={manualWish.name}
                          onChange={(e) => setManualWish(p => ({ ...p, name: e.target.value }))}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#70561f] text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Thuộc bên họ khách mời *</label>
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => setManualWish(p => ({ ...p, side: 'groom' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${manualWish.side === 'groom' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
                          >
                            <span>🤵 Họ Nhà Trai</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setManualWish(p => ({ ...p, side: 'bride' }))}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${manualWish.side === 'bride' ? 'bg-rose-600 text-white border-rose-600 shadow-sm' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'}`}
                          >
                            <span>👰 Họ Nhà Gái</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Nội dung lời chúc *</label>
                      <textarea
                        required
                        rows={2}
                        placeholder="Nhập nội dung lời chúc phúc..."
                        value={manualWish.message}
                        onChange={(e) => setManualWish(p => ({ ...p, message: e.target.value }))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:border-[#70561f] text-xs resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowAddWishModal(false)}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-medium"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold shadow-sm"
                      >
                        Lưu Lời Chúc
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* FILTER & SEARCH BAR */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
                {/* Tabs */}
                {(() => {
                  const groomCount = allUniqueWishes.filter(w => w.side !== 'bride' && !w.sideLabel?.toLowerCase().includes('gái')).length;
                  const brideCount = allUniqueWishes.filter(w => w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái')).length;

                  return (
                    <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl shrink-0">
                      <button
                        type="button"
                        onClick={() => setWishesFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${wishesFilter === 'all' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                      >
                        Tất cả ({allUniqueWishes.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWishesFilter('groom')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${wishesFilter === 'groom' ? 'bg-blue-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                      >
                        🤵 Họ Nhà Trai ({groomCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setWishesFilter('bride')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${wishesFilter === 'bride' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
                      >
                        👰 Họ Nhà Gái ({brideCount})
                      </button>
                    </div>
                  );
                })()}

                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc lời chúc..."
                    value={wishesSearch}
                    onChange={(e) => setWishesSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:outline-none focus:border-[#70561f] text-xs"
                  />
                  {wishesSearch && (
                    <button
                      type="button"
                      onClick={() => setWishesSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* LIST OF WISHES CARDS */}
              {(() => {
                const filtered = allUniqueWishes.filter(w => {
                  const isBride = w.side === 'bride' || w.sideLabel?.toLowerCase().includes('gái');
                  if (wishesFilter === 'groom' && isBride) return false;
                  if (wishesFilter === 'bride' && !isBride) return false;
                  if (wishesSearch) {
                    const q = wishesSearch.toLowerCase();
                    const n = (w.name || '').toLowerCase();
                    const m = (w.message || '').toLowerCase();
                    if (!n.includes(q) && !m.includes(q)) return false;
                  }
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
                      <div className="text-3xl">💌</div>
                      <h4 className="font-bold text-stone-700 text-sm">Chưa có lời chúc nào trong mục này</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        Khi khách gửi lời chúc trên thiệp hoặc bạn bấm "Thêm lời chúc thủ công", danh sách sẽ được tổng hợp ngay tại đây.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {filtered.map((wish, idx) => {
                      const isBride = wish.side === 'bride' || wish.sideLabel?.toLowerCase().includes('gái');
                      return (
                        <div
                          key={wish.id || idx}
                          className="p-4 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-stone-900">{wish.name}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                    isBride
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                  }`}
                                >
                                  {isBride ? '👰 Họ Nhà Gái' : '🤵 Họ Nhà Trai'}
                                </span>
                              </div>
                              <span className="text-[11px] text-stone-400 shrink-0">{formatWishDate(wish)}</span>
                            </div>

                            <p className="text-xs text-stone-700 italic bg-[#faf7f2] p-3 rounded-xl border border-[#ebdcc4] leading-relaxed">
                              "{wish.message}"
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                            <button
                              type="button"
                              onClick={() => handleToggleWishSide(wish.id)}
                              className="text-[11px] text-stone-500 hover:text-amber-800 flex items-center gap-1 font-medium transition-colors"
                              title="Chuyển phân loại họ giữa Nhà Trai và Nhà Gái"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-stone-400" />
                              <span>Chuyển sang {isBride ? 'Họ Nhà Trai' : 'Họ Nhà Gái'}</span>
                            </button>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(`"${wish.message}" - ${wish.name}`);
                                  setSaveStatus('Đã sao chép lời chúc!');
                                  setTimeout(() => setSaveStatus(''), 2000);
                                }}
                                className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                                title="Sao chép lời chúc này"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteWish(wish)}
                                className="p-1.5 rounded-lg hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors"
                                title="Xóa lời chúc"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}


          {/* TAB: CẶP ĐÔI & GIA ĐÌNH */}
          {activeTab === 'couple' && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
                <Heart className="w-5 h-5 text-[#70561f]" />
                <span>Thông Tin Cô Dâu, Chú Rể & Phụ Mẫu Hai Bên</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
                {currentProfileKey === 'bride' ? (
                  <>
                    {/* Bride Info First for Bride Profile */}
                    <div className="bg-rose-50/50 p-4 sm:p-5 rounded-2xl border-2 border-rose-200 space-y-3">
                      <h3 className="font-bold uppercase tracking-wider text-rose-800 text-xs flex items-center justify-between">
                        <span>THÔNG TIN CÔ DÂU (NHÀ GÁI)</span>
                        <span className="text-[10px] bg-rose-200/80 text-rose-900 px-2 py-0.5 rounded-full">Chính</span>
                      </h3>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Họ và tên đầy đủ cô dâu</label>
                        <input
                          type="text"
                          value={formData.bride?.name || ''}
                          onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, name: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Tên thường gọi / Nickname cô dâu</label>
                        <input
                          type="text"
                          value={formData.bride?.nickname || ''}
                          onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, nickname: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-rose-200">
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân phụ (Bố cô dâu)</label>
                          <input
                            type="text"
                            value={formData.bride?.father || ''}
                            onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, father: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân mẫu (Mẹ cô dâu)</label>
                          <input
                            type="text"
                            value={formData.bride?.mother || ''}
                            onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, mother: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Groom Info Second */}
                    <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
                      <h3 className="font-bold uppercase tracking-wider text-amber-800 text-xs">
                        THÔNG TIN CHÚ RỂ (NHÀ TRAI)
                      </h3>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Họ và tên đầy đủ chú rể</label>
                        <input
                          type="text"
                          value={formData.groom?.name || ''}
                          onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, name: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Tên thường gọi / Nickname chú rể</label>
                        <input
                          type="text"
                          value={formData.groom?.nickname || ''}
                          onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, nickname: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân phụ (Bố chú rể)</label>
                          <input
                            type="text"
                            value={formData.groom?.father || ''}
                            onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, father: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân mẫu (Mẹ chú rể)</label>
                          <input
                            type="text"
                            value={formData.groom?.mother || ''}
                            onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, mother: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Groom Info First for Groom Profile */}
                    <div className="bg-amber-50/50 p-4 sm:p-5 rounded-2xl border-2 border-amber-200 space-y-3">
                      <h3 className="font-bold uppercase tracking-wider text-amber-800 text-xs flex items-center justify-between">
                        <span>THÔNG TIN CHÚ RỂ (NHÀ TRAI)</span>
                        <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full">Chính</span>
                      </h3>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Họ và tên đầy đủ chú rể</label>
                        <input
                          type="text"
                          value={formData.groom?.name || ''}
                          onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, name: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Tên thường gọi / Nickname chú rể</label>
                        <input
                          type="text"
                          value={formData.groom?.nickname || ''}
                          onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, nickname: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân phụ (Bố chú rể)</label>
                          <input
                            type="text"
                            value={formData.groom?.father || ''}
                            onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, father: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân mẫu (Mẹ chú rể)</label>
                          <input
                            type="text"
                            value={formData.groom?.mother || ''}
                            onChange={(e) => setFormData({ ...formData, groom: { ...formData.groom, mother: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bride Info Second */}
                    <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-3">
                      <h3 className="font-bold uppercase tracking-wider text-rose-800 text-xs">
                        THÔNG TIN CÔ DÂU (NHÀ GÁI)
                      </h3>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Họ và tên đầy đủ cô dâu</label>
                        <input
                          type="text"
                          value={formData.bride?.name || ''}
                          onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, name: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Tên thường gọi / Nickname cô dâu</label>
                        <input
                          type="text"
                          value={formData.bride?.nickname || ''}
                          onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, nickname: e.target.value } })}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200">
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân phụ (Bố cô dâu)</label>
                          <input
                            type="text"
                            value={formData.bride?.father || ''}
                            onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, father: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-500 text-xs mb-1">Thân mẫu (Mẹ cô dâu)</label>
                          <input
                            type="text"
                            value={formData.bride?.mother || ''}
                            onChange={(e) => setFormData({ ...formData, bride: { ...formData.bride, mother: e.target.value } })}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          
          {/* TAB: SỰ KIỆN & ĐỊA ĐIỂM */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
                <Calendar className="w-5 h-5 text-[#70561f]" />
                <span>Lịch Trình Sự Kiện & Địa Điểm Google Maps</span>
              </h2>

              <div className="space-y-4">
                {(formData.events || []).map((ev, index) => (
                  <div key={ev.id || index} className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-xs sm:text-sm">
                    <span className="font-bold text-[#70561f] uppercase tracking-wider text-xs">
                      Sự kiện #{index + 1}: {ev.title}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Tên sự kiện</label>
                        <input
                          type="text"
                          value={ev.title}
                          onChange={(e) => {
                            const newEvents = [...formData.events];
                            newEvents[index].title = e.target.value;
                            setFormData({ ...formData, events: newEvents });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Thời gian</label>
                        <input
                          type="text"
                          value={ev.time}
                          onChange={(e) => {
                            const newEvents = [...formData.events];
                            newEvents[index].time = e.target.value;
                            setFormData({ ...formData, events: newEvents });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-[#70561f]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Địa điểm / Tên nhà hàng</label>
                        <input
                          type="text"
                          value={ev.venue}
                          onChange={(e) => {
                            const newEvents = [...formData.events];
                            newEvents[index].venue = e.target.value;
                            setFormData({ ...formData, events: newEvents });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-600 font-medium mb-1">Địa chỉ chi tiết</label>
                        <input
                          type="text"
                          value={ev.address}
                          onChange={(e) => {
                            const newEvents = [...formData.events];
                            newEvents[index].address = e.target.value;
                            setFormData({ ...formData, events: newEvents });
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-600 font-medium mb-1">Link chỉ đường Google Maps</label>
                      <input
                        type="text"
                        value={ev.mapUrl || ''}
                        onChange={(e) => {
                          const newEvents = [...formData.events];
                          newEvents[index].mapUrl = e.target.value;
                          setFormData({ ...formData, events: newEvents });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          
          {/* TAB: ALBUM ẢNH & HIỆU ỨNG (BÓC TÁCH TỪNG VỊ TRÍ THEO YÊU CẦU ẢNH 2) */}
          {activeTab === 'gallery' && (
            <div className="space-y-8">
              <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#70561f]" />
                    <span>Album Ảnh Cưới & Chuyển Cảnh Animation</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Bóc tách rõ ràng từng vị trí ảnh trên thiệp • Tùy chỉnh hiệu ứng chuyển cảnh cho ảnh và chữ riêng biệt • Chọn màu nền ruột thiệp
                  </p>
                </div>
              </div>

              {/* STORAGE GUARANTEE & AUTO SYNC BANNER */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#70561f] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-stone-900">Bộ nhớ IndexedDB + Tự động nén ảnh sắc nét</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Lưu vĩnh viễn</span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Ảnh tải lên từ điện thoại/máy tính tự động được tối ưu chuẩn Retina và lưu an toàn, không bao giờ lo bị mất khi F5 hoặc mở lại.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 shadow-2xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Cài đặt độc lập (Nhà Trai & Nhà Gái riêng biệt)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyData('media')}
                    className="px-3 py-1.5 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Chủ động sao chép toàn bộ ảnh & album sang mẫu còn lại khi bạn muốn"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-amber-300" />
                    <span>Sao chép sang mẫu còn lại</span>
                  </button>
                </div>
              </div>

              {/* 1. MỤC 1: ẢNH MỞ ĐẦU THIỆP (HERO BANNER) */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-amber-600" />
                    <span>1. Ảnh Mở Đầu Thiệp (Hero Banner Photo)</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">Vị trí: Ngay phần trên cùng khi vừa mở thiệp</span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
                  <div className="w-36 h-28 sm:w-44 sm:h-32 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-md bg-stone-900 shrink-0 relative group">
                    <img
                      src={formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
                      alt="Ảnh mở đầu thiệp"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-2 text-xs flex-1">
                    <p className="text-stone-600 leading-relaxed">
                      Đây là bức ảnh chân dung lớn đầu tiên mà khách mời nhìn thấy sau khi mở phong bì thiệp cưới.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white font-semibold cursor-pointer shadow flex items-center gap-1.5 transition-all hover:scale-102">
                        <Upload className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tải ảnh mở đầu mới từ máy</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (base64) => {
                            updateMediaField('heroBannerPhoto', base64);
                            setSaveStatus('Đã cập nhật và lưu an toàn ảnh mở đầu thiệp!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          updateMediaField('heroBannerPhoto', '/templates/007/images/hero_banner.jpg');
                        }}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors"
                      >
                        Dùng ảnh mặc định
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. MỤC 2: ẢNH RIÊNG CHÚ RỂ VÀ CÔ DÂU */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <span>2. Ảnh Riêng Của Chú Rể & Ảnh Riêng Của Cô Dâu</span>
                  </h3>
                  <span className="text-[11px] text-stone-400">Vị trí: Khối thông tin Giới Thiệu Cặp Đôi</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Chú rể */}
                  <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200 flex items-center gap-3.5">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-amber-400 shadow bg-stone-900 shrink-0">
                      <img
                        src={formData.groom?.avatar || '/templates/007/images/groom.jpg'}
                        alt="Ảnh chú rể"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">🎩</span>
                        <span className="font-bold text-xs text-stone-900 truncate">Ảnh Chú Rể: {formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'}</span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-semibold cursor-pointer shadow transition-all">
                        <Upload className="w-3 h-3 text-amber-300" />
                        <span>Tải ảnh chú rể</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (base64) => {
                            updateCoupleAvatar('groom', base64);
                            setSaveStatus('Đã cập nhật và lưu ảnh chú rể!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          })}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Cô dâu */}
                  <div className="p-4 rounded-xl bg-rose-50/40 border border-rose-200 flex items-center gap-3.5">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-rose-400 shadow bg-stone-900 shrink-0">
                      <img
                        src={formData.bride?.avatar || '/templates/007/images/bride.jpg'}
                        alt="Ảnh cô dâu"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">👰</span>
                        <span className="font-bold text-xs text-stone-900 truncate">Ảnh Cô Dâu: {formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}</span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900 hover:bg-rose-800 text-white text-[11px] font-semibold cursor-pointer shadow transition-all">
                        <Upload className="w-3 h-3 text-rose-200" />
                        <span>Tải ảnh cô dâu</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (base64) => {
                            updateCoupleAvatar('bride', base64);
                            setSaveStatus('Đã cập nhật và lưu ảnh cô dâu!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          })}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. MỤC 3: ẢNH CƯỚI NGHỆ THUẬT DƯỚI PHẦN LỊCH CƯỚI */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>3. Ảnh Cưới Kỷ Niệm (Dưới Phần Lịch Cưới)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Độc lập hoàn toàn với Timeline: Luôn hiển thị trang trọng dưới lịch cưới, kể cả khi bạn ẩn mục Mốc lịch trình.
                    </p>
                  </div>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                    Luôn hiển thị dưới lịch
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-1">
                  <div className="w-40 h-36 sm:w-48 sm:h-40 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-md bg-stone-900 shrink-0 relative group">
                    <img
                      src={formData.timelineBgPhoto || '/templates/007/images/timeline_bg.jpg'}
                      alt="Ảnh nền lịch cưới"
                      style={{
                        objectPosition: formData.timelineBgPhotoPosition || 'center 15%'
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="space-y-3 text-xs flex-1">
                    <p className="text-stone-600 leading-relaxed">
                      Bức ảnh này tạo chiều sâu cảm xúc lãng mạn phía dưới bảng lịch cưới. Bố cục đã được mở rộng và tối ưu để thấy trọn vẹn khuôn mặt cô dâu & chú rể.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold cursor-pointer shadow flex items-center gap-1.5 transition-all hover:scale-102">
                        <Upload className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tải ảnh cưới mới</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (base64) => {
                            updateMediaField('timelineBgPhoto', base64);
                            setSaveStatus('Đã cập nhật và lưu ảnh cưới dưới lịch!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => updateMediaField('timelineBgPhoto', '/templates/007/images/timeline_bg.jpg')}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors"
                      >
                        Dùng ảnh mặc định
                      </button>
                    </div>

                    {/* Bộ điều khiển tiêu điểm khuôn mặt (Focal Position Selector) */}
                    <div className="pt-2 border-t border-stone-100 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-700">🎯 Căn chỉnh lấy nét khuôn mặt:</span>
                        <span className="text-[11px] text-amber-700 font-semibold">
                          {(formData.timelineBgPhotoPosition === 'center 15%' || !formData.timelineBgPhotoPosition) && 'Khuôn mặt (Khuyên dùng)'}
                          {formData.timelineBgPhotoPosition === 'center top' && 'Sát đỉnh đầu'}
                          {formData.timelineBgPhotoPosition === 'center 35%' && 'Nửa thân trên'}
                          {formData.timelineBgPhotoPosition === 'center center' && 'Chính giữa ảnh'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { id: 'center 15%', label: 'Khuôn mặt (Chuẩn)', desc: '15% từ đỉnh' },
                          { id: 'center top', label: 'Đỉnh đầu', desc: '0% từ đỉnh' },
                          { id: 'center 35%', label: 'Nửa thân trên', desc: '35% từ đỉnh' },
                          { id: 'center center', label: 'Chính giữa', desc: '50% tâm ảnh' }
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => {
                              setFormData(p => ({ ...p, timelineBgPhotoPosition: pos.id }));
                              setSaveStatus(`Đã đổi căn nét: ${pos.label}`);
                              setTimeout(() => setSaveStatus(''), 2000);
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-left border transition-all ${(formData.timelineBgPhotoPosition || 'center 15%') === pos.id ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold shadow-xs' : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                          >
                            <div className="text-[11px] leading-tight">{pos.label}</div>
                            <div className="text-[9px] text-stone-400">{pos.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. MỤC 4: ALBUM ẢNH PHẦN OUR MEMORIES */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-600" />
                      <span>4. Album Ảnh Kỷ Niệm (Our Memories)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Đang có {formData.gallery?.length || 0} ảnh trong album cưới. Kéo thả chuột hoặc bấm các nút mũi tên [◀] [▶] để di chuyển, sắp xếp thứ tự ảnh trong thiệp cưới.
                    </p>
                  </div>

                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold cursor-pointer shadow-sm transition-all hover:scale-102 self-start shrink-0">
                    <Upload className="w-3.5 h-3.5 text-amber-300" />
                    <span>+ Tải thêm ảnh từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length === 0) return;
                        setSaveStatus(`⏳ Đang tối ưu và nén ${files.length} ảnh sắc nét...`);
                        const newPhotos = [];
                        for (const file of files) {
                          try {
                            const compressed = await compressImageFile(file, 1600, 1600, 0.82);
                            newPhotos.push({
                              id: 'photo-' + Date.now() + Math.random(),
                              url: compressed,
                              caption: file.name.replace(/\.[^/.]+$/, '')
                            });
                          } catch (err) {
                            console.warn('Error compressing photo:', err);
                          }
                        }
                        const updatedGallery = [...(formData.gallery || []), ...newPhotos];
                        updateMediaField('gallery', updatedGallery);
                        setSaveStatus(`🎉 Đã thêm và lưu an toàn ${newPhotos.length} ảnh vào album!`);
                        setTimeout(() => setSaveStatus(''), 3000);
                      }}
                    />
                  </label>
                </div>

                {/* Helpful Instruction Tip for Reordering */}
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl px-3.5 py-2 text-xs text-amber-950 flex items-center gap-2 shadow-xs">
                  <span className="text-amber-600 text-sm select-none">✋</span>
                  <span>
                    <strong>Kéo thả sắp xếp thứ tự:</strong> Nhấn giữ chuột/ngón tay vào ảnh (hình bàn tay) và kéo thả trực tiếp vào vị trí bạn muốn, hoặc thao tác kéo thả trực tiếp ngay trên màn hình thiệp xem trước bên phải.
                  </span>
                </div>

                {/* Photo Grid with Drag and Drop & Order Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                  {(formData.gallery || []).map((photo, index) => {
                    const isDragging = galleryDragIdx === index;
                    const isOver = galleryDragOverIdx === index;

                    return (
                      <div
                        key={photo.id || index}
                        draggable
                        onDragStart={(e) => handleGalleryDragStart(e, index)}
                        onDragOver={(e) => handleGalleryDragOver(e, index)}
                        onDragEnd={() => { setGalleryDragIdx(null); setGalleryDragOverIdx(null); }}
                        onDrop={(e) => handleGalleryDrop(e, index)}
                        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                        className={`group relative bg-stone-50 rounded-2xl overflow-hidden border transition-all duration-200 shadow-sm flex flex-col cursor-grab active:cursor-grabbing ${
                          isDragging
                            ? 'opacity-40 scale-95 border-amber-500 border-dashed ring-2 ring-amber-400'
                            : isOver
                            ? 'ring-2 ring-amber-600 border-amber-600 scale-102 shadow-lg bg-amber-50'
                            : 'border-stone-200 hover:border-amber-400 hover:shadow-md'
                        }`}
                      >
                        {/* Photo Image Container */}
                        <div className="aspect-[4/3] w-full overflow-hidden bg-stone-900 relative">
                          <img
                            src={photo.url}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
                          />

                          {/* Order Badge at Top-Left */}
                          <div className="absolute top-2 left-2 z-10 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white/20 select-none">
                            <GripVertical className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>#{index + 1}</span>
                          </div>

                          {/* Delete Button at Top-Right */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = (formData.gallery || []).filter((_, i) => i !== index);
                              updateMediaField('gallery', updated);
                              setSaveStatus(`Đã xóa ảnh #${index + 1} khỏi album`);
                              setTimeout(() => setSaveStatus(''), 2500);
                            }}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/70 hover:bg-rose-700 text-white transition-colors shadow-md border border-white/20"
                            title="Xóa ảnh này khỏi album"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Quick Move Overlay Buttons at Bottom of Image */}
                          <div className="absolute bottom-1.5 inset-x-1.5 z-10 flex items-center justify-between gap-1 bg-black/75 backdrop-blur-xs p-1 rounded-xl border border-white/10 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveGalleryPhoto(index, index - 1);
                              }}
                              className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                                index === 0
                                  ? 'opacity-30 text-stone-400 cursor-not-allowed'
                                  : 'bg-white/90 hover:bg-white text-stone-900 shadow-xs cursor-pointer active:scale-95'
                              }`}
                              title="Di chuyển ảnh lên trước"
                            >
                              <ChevronLeft className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>Lên trước</span>
                            </button>

                            <button
                              type="button"
                              disabled={index === (formData.gallery || []).length - 1}
                              onClick={(e) => {
                                e.stopPropagation();
                                moveGalleryPhoto(index, index + 1);
                              }}
                              className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-0.5 transition-all ${
                                index === (formData.gallery || []).length - 1
                                  ? 'opacity-30 text-stone-400 cursor-not-allowed'
                                  : 'bg-white/90 hover:bg-white text-stone-900 shadow-xs cursor-pointer active:scale-95'
                              }`}
                              title="Di chuyển ảnh xuống sau"
                            >
                              <span>Xuống sau</span>
                              <ChevronRight className="w-3 h-3 text-amber-700 shrink-0" />
                            </button>
                          </div>
                        </div>

                        {/* Caption input */}
                        <div className="p-2 bg-white">
                          <input
                            type="text"
                            placeholder="Chú thích ảnh..."
                            value={photo.caption || ''}
                            onChange={(e) => {
                              const newGallery = [...(formData.gallery || [])];
                              newGallery[index].caption = e.target.value;
                              setFormData({ ...formData, gallery: newGallery });
                            }}
                            className="w-full px-2 py-1 text-[11px] border border-stone-200 rounded-lg bg-stone-50 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. MỤC 5: ẢNH CUỐI THIỆP DƯỚI CÙNG SAU COUNTDOWN & LỜI CẢM ƠN (FOOTER PHOTO) */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-amber-700" />
                      <span>5. Ảnh Cuối Thiệp (Sau Countdown & Lời Cảm Ơn)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Vị trí: Bức ảnh chân trang dưới cùng sau bảng đếm ngược, hiển thị lời cảm ơn và chữ ký cặp đôi
                    </p>
                  </div>
                  <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-lg">
                    Chân trang dưới cùng
                  </span>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-5 pt-1">
                  {/* Preview ảnh hiện tại */}
                  <div className="relative w-full md:w-56 aspect-[4/3] rounded-xl overflow-hidden border-2 border-stone-200 shadow-sm bg-stone-900 shrink-0 group">
                    <img
                      src={formData.footerBgPhoto || '/templates/007/images/footer_bg.jpg'}
                      alt="Ảnh cuối thiệp"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-2.5 text-center">
                      <p className="text-[10px] text-stone-200 italic truncate font-serif-elegant">
                        {formData.footerThankYou || 'Rất hân hạnh được đón tiếp!'}
                      </p>
                      <p className="text-xs text-[#e6b685] font-motherland truncate">
                        {formData.footerSignature || `${formData.groom?.nickname || 'Hiếu'} + ${formData.bride?.nickname || 'Thúy'}`}
                      </p>
                    </div>
                  </div>

                  {/* Nút hành động và chỉnh sửa chữ */}
                  <div className="space-y-3 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3.5 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white font-semibold cursor-pointer shadow flex items-center gap-1.5 transition-all hover:scale-102 text-xs">
                        <Upload className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tải ảnh cuối thiệp mới từ máy</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (base64) => {
                            updateMediaField('footerBgPhoto', base64);
                            setSaveStatus('Đã cập nhật và lưu an toàn ảnh cuối thiệp!');
                            setTimeout(() => setSaveStatus(''), 2500);
                          })}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          updateMediaField('footerBgPhoto', '/templates/007/images/footer_bg.jpg');
                          setSaveStatus('Đã khôi phục ảnh cuối thiệp mặc định!');
                          setTimeout(() => setSaveStatus(''), 2500);
                        }}
                        className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-xs transition-colors"
                      >
                        Dùng ảnh mặc định
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Lời cảm ơn hiển thị trên ảnh
                        </label>
                        <input
                          type="text"
                          value={formData.footerThankYou ?? 'Rất hân hạnh được đón tiếp!'}
                          placeholder="Rất hân hạnh được đón tiếp!"
                          onChange={(e) => {
                            updateMediaField('footerThankYou', e.target.value);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                          Chữ ký tên dâu rể dưới ảnh
                        </label>
                        <input
                          type="text"
                          value={formData.footerSignature ?? `${formData.groom?.nickname || 'Hiếu'} + ${formData.bride?.nickname || 'Thúy'}`}
                          placeholder={`${formData.groom?.nickname || 'Hiếu'} + ${formData.bride?.nickname || 'Thúy'}`}
                          onChange={(e) => {
                            updateMediaField('footerSignature', e.target.value);
                          }}
                          className="w-full px-3 py-1.5 text-xs border border-stone-200 rounded-xl bg-white focus:outline-hidden focus:ring-1 focus:ring-amber-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. HIỆU ỨNG CHUYỂN CẢNH CHO ẢNH (8 MẪU ĐỘC QUYỀN CHUYỂN ĐỘNG CHẬM & XEM THỬ TRỰC TIẾP) */}
              <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-700" />
                      <span>6. Hiệu Ứng Chuyển Cảnh Cho Ảnh (Photo Animation) - Mẫu Đặc Quyền ⭐ & Đa Dạng</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Tổng hợp mẫu hiệu ứng chuyển cảnh ảnh điện ảnh chuẩn Cocohappii bản gốc ⭐ và các phong cách chuyển động nghệ thuật
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 px-2.5 py-1 bg-amber-100/80 rounded-xl border border-amber-300">
                    Đang chọn: {
                      formData.photoAnimationEffect === 'cocohappii' ? '⭐ Cocohappii Bản Gốc (Đặc Quyền)' :
                      formData.photoAnimationEffect === 'kenburns' ? '1. Ken Burns Điện Ảnh' :
                      formData.photoAnimationEffect === 'blurFade' ? '2. Mờ Ảo & Sương Khói' :
                      formData.photoAnimationEffect === 'float3d' ? '3. Nổi 3D Bồng Bềnh' :
                      formData.photoAnimationEffect === 'zoomPulse' ? '4. Thu Phóng Nhịp Tim' :
                      formData.photoAnimationEffect === 'curtainSlide' ? '5. Rèm Kính Lướt Mở' :
                      formData.photoAnimationEffect === 'flipCard3d' ? '6. Lật Cánh Thiệp 3D' :
                      formData.photoAnimationEffect === 'vignetteFocus' ? '7. Tiêu Điểm Tỏa Sáng' :
                      formData.photoAnimationEffect === 'colorAwaken' ? '8. Thức Tỉnh Màu Sắc' : '9. Giữ Nguyên (Tĩnh)'
                    }
                  </span>
                </div>

                {/* Helpful Instruction Tip */}
                <div className="bg-amber-100/80 border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-amber-950 flex items-center gap-2.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Xem Thử Trực Tiếp:</strong> Bấm vào thẻ hoặc bấm nút <strong>[▶️ Xem Thử Ảnh]</strong> để hệ thống tự động phát lại chuyển động ảnh trên điện thoại bên phải với tốc độ chậm có điểm nhấn!
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      id: 'cocohappii',
                      title: '⭐ Cocohappii Bản Gốc (Đặc Quyền)',
                      badge: '⭐ Đặc Quyền VIP',
                      desc: 'Hiệu ứng nguyên bản chuẩn 100% Cocohappii: Ảnh chú rể xoay trượt góc trái (rotateInDownLeft), ảnh cô dâu xoay góc phải (rotateInDownRight), album ảnh lướt so le trái phải cực kỳ sang trọng.'
                    },
                    {
                      id: 'kenburns',
                      title: '1. Ken Burns Điện Ảnh',
                      badge: 'Chậm 8s',
                      desc: 'Phóng to lia chậm 3D 8s như phim điện ảnh Hollywood, tạo chiều sâu thị giác mê hoặc.'
                    },
                    {
                      id: 'blurFade',
                      title: '2. Mờ Ảo & Sương Khói',
                      badge: '2.2s',
                      desc: 'Từ sương khói mờ ảo tan dần hiện lên từng chi tiết ảnh sắc sảo và lãng mạn.'
                    },
                    {
                      id: 'float3d',
                      title: '3. Nổi 3D Bồng Bềnh',
                      badge: 'Chậm 6s',
                      desc: 'Ảnh nghiêng góc 3D đa chiều và bồng bềnh 6s như nổi hẳn trên bề mặt thiệp cưới.'
                    },
                    {
                      id: 'zoomPulse',
                      title: '4. Thu Phóng Nhịp Tim',
                      badge: '4.5s',
                      desc: 'Ảnh co giãn êm ái theo nhịp tim tình yêu kết hợp hào quang ánh kim ấm áp.'
                    },
                    {
                      id: 'curtainSlide',
                      title: '5. Rèm Kính Lướt Mở',
                      badge: '2.2s',
                      desc: 'Màn rèm kính gạt mở từ trái qua phải phơi sáng toàn bộ bức ảnh nghệ thuật.'
                    },
                    {
                      id: 'flipCard3d',
                      title: '6. Lật Cánh Thiệp 3D',
                      badge: '2.4s',
                      desc: 'Cánh ảnh lật xoay 3D từ 90 độ xuất hiện đầy bất ngờ và ấn tượng hoàng gia.'
                    },
                    {
                      id: 'vignetteFocus',
                      title: '7. Tiêu Điểm Tỏa Sáng',
                      badge: 'Chậm 5s',
                      desc: 'Tương phản ánh sáng quét chậm 5s tập trung tiêu điểm vào trung tâm cô dâu chú rể.'
                    },
                    {
                      id: 'colorAwaken',
                      title: '8. Thức Tỉnh Màu Sắc',
                      badge: '2.6s',
                      desc: 'Từ tông đen trắng nghệ thuật chuyển màu rực rỡ sống động như thức tỉnh tình yêu.'
                    },
                    {
                      id: 'none',
                      title: '9. Giữ Nguyên (Tĩnh)',
                      badge: 'Tĩnh',
                      desc: 'Ảnh giữ nguyên kích thước và vị trí tĩnh, không áp dụng hiệu ứng chuyển động.'
                    }
                  ].map((eff) => {
                    const isSelected = (formData.photoAnimationEffect || 'kenburns') === eff.id;
                    return (
                      <div
                        key={eff.id}
                        onClick={() => triggerPhotoAnimationTest(eff.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-100/70 border-[#70561f] shadow-md ring-2 ring-amber-400/80'
                            : 'bg-white border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-stone-900">{eff.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-[#70561f] text-white' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {eff.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 leading-relaxed">{eff.desc}</p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-stone-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="radio"
                              name="photoAnimationEffect"
                              checked={isSelected}
                              onChange={() => triggerPhotoAnimationTest(eff.id)}
                              className="w-4 h-4 accent-[#70561f]"
                            />
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#70561f]' : 'text-stone-400'}`}>
                              {isSelected ? '✓ Đang kích hoạt' : 'Bấm để chọn'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerPhotoAnimationTest(eff.id);
                            }}
                            className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              isSelected
                                ? 'bg-[#70561f] text-white hover:bg-[#594418]'
                                : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-200'
                            }`}
                          >
                            <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-700 fill-amber-700'}`} />
                            <span>▶️ Xem Thử Ảnh</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 7. HIỆU ỨNG CHUYỂN CẢNH CHO CHỮ KHI CUỘN THIỆP (8 MẪU ĐỘC QUYỀN CHUYỂN ĐỘNG CHẬM & XEM THỬ TRỰC TIẾP) */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800 flex items-center gap-2">
                      <Type className="w-4 h-4 text-[#70561f]" />
                      <span>7. Hiệu Ứng Chuyển Cảnh Cho Chữ Khi Cuộn Thiệp (Text Animation) - Mẫu Đặc Quyền ⭐ & Đa Dạng</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Kéo cuộn trang đến đâu thì từng dòng chữ sẽ xuất hiện với hiệu ứng chuyển động tương ứng, hỗ trợ hiệu ứng bản gốc Cocohappii ⭐
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-800 px-2.5 py-1 bg-white rounded-xl border border-stone-300">
                    Đang chọn: {
                      formData.textAnimationEffect === 'cocohappii' ? '⭐ Cocohappii Bản Gốc (Đặc Quyền)' :
                      formData.textAnimationEffect === 'slideUp' ? '1. Lướt Lên Mềm Mại' :
                      formData.textAnimationEffect === 'blurFade' ? '2. Mờ Ảo Tách Sương' :
                      formData.textAnimationEffect === 'shimmer' ? '3. Dập Chữ Ánh Kim 24K' :
                      formData.textAnimationEffect === 'popScale' ? '4. Nảy Nhẹ Hoàng Gia' :
                      formData.textAnimationEffect === 'typewriter' ? '5. Nét Bút Thư Pháp' :
                      formData.textAnimationEffect === 'waveBounce' ? '6. Sóng Chữ Nhấp Nhô' :
                      formData.textAnimationEffect === 'glowPulse' ? '7. Nhịp Đèn Cung Đình' :
                      formData.textAnimationEffect === 'spreadSpacing' ? '8. Giãn Khoảng Cách' : '9. Giữ Nguyên (Tĩnh)'
                    }
                  </span>
                </div>

                {/* Helpful Instruction Tip */}
                <div className="bg-stone-100 border border-stone-300 rounded-xl px-3.5 py-2 text-xs text-stone-800 flex items-center gap-2.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-[#70561f] shrink-0" />
                  <span>
                    <strong>Xem Thử Trực Tiếp:</strong> Bấm vào thẻ hoặc bấm nút <strong>[▶️ Xem Thử Chữ]</strong> để cuộn tới và quan sát chuyển động chữ trực tiếp trên điện thoại bên phải!
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      id: 'cocohappii',
                      title: '⭐ Cocohappii Bản Gốc (Đặc Quyền)',
                      badge: '⭐ Đặc Quyền VIP',
                      desc: 'Hiệu ứng nguyên bản chuẩn 100% Cocohappii: Tên chú rể lướt từ trái sang (fadeInLeftSlow), ký tự & trồi lên từ dưới (fadeInUpSlow), tên cô dâu lướt từ phải sang (fadeInRightSlow).'
                    },
                    {
                      id: 'slideUp',
                      title: '1. Lướt Lên Mềm Mại',
                      badge: '1.8s',
                      desc: 'Dòng chữ từ dưới trượt lên êm ái kèm độ nhòe tan dần khi cuộn tới vị trí đó.'
                    },
                    {
                      id: 'blurFade',
                      title: '2. Mờ Ảo Tách Sương',
                      badge: '2.0s',
                      desc: 'Chữ từ sương khói mờ ảo ngưng đọng dần thành nét chữ sắc nét và thanh lịch.'
                    },
                    {
                      id: 'shimmer',
                      title: '3. Dập Chữ Ánh Kim 24K',
                      badge: 'Lấp Lánh 3.5s',
                      desc: 'Vệt ánh kim vàng hoàng gia chảy liên tục lấp lánh như ép kim nhũ vàng 24K.'
                    },
                    {
                      id: 'popScale',
                      title: '4. Nảy Nhẹ Hoàng Gia',
                      badge: '1.8s',
                      desc: 'Chữ bung nở nhẹ nhàng tạo điểm nhấn thị giác sang trọng khi cuộn tới.'
                    },
                    {
                      id: 'typewriter',
                      title: '5. Nét Bút Thư Pháp',
                      badge: '2.2s',
                      desc: 'Mô phỏng nét bút lông thư pháp uyển chuyển vạch từng dòng chữ bay bổng.'
                    },
                    {
                      id: 'waveBounce',
                      title: '6. Sóng Chữ Nhấp Nhô',
                      badge: 'Chậm 4s',
                      desc: 'Từng dòng chữ nhấp nhô mềm mại theo chu kỳ 4s như sóng nước dịu dàng.'
                    },
                    {
                      id: 'glowPulse',
                      title: '7. Nhịp Đèn Cung Đình',
                      badge: '3.5s',
                      desc: 'Chữ thở chậm tỏa vầng sáng vàng hoàng cung sang trọng và ấm cúng.'
                    },
                    {
                      id: 'spreadSpacing',
                      title: '8. Giãn Khoảng Cách',
                      badge: '4.5s',
                      desc: 'Khoảng cách giữa các ký tự tự động giãn mở tinh tế quý phái chuẩn thiệp hoàng gia.'
                    },
                    {
                      id: 'none',
                      title: '9. Giữ Nguyên (Tĩnh)',
                      badge: 'Mặc Định',
                      desc: 'Các dòng chữ hiển thị ngay lập tức, không có hiệu ứng chuyển động khi cuộn trang.'
                    }
                  ].map((eff) => {
                    const isSelected = (formData.textAnimationEffect || 'slideUp') === eff.id;
                    return (
                      <div
                        key={eff.id}
                        onClick={() => triggerTextAnimationTest(eff.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-50/70 border-[#70561f] shadow-md ring-2 ring-amber-400/80'
                            : 'bg-white border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-stone-900">{eff.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                              isSelected ? 'bg-[#70561f] text-white' : 'bg-stone-100 text-stone-600'
                            }`}>
                              {eff.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 leading-relaxed">{eff.desc}</p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-stone-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="radio"
                              name="textAnimationEffect"
                              checked={isSelected}
                              onChange={() => triggerTextAnimationTest(eff.id)}
                              className="w-4 h-4 accent-[#70561f]"
                            />
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#70561f]' : 'text-stone-400'}`}>
                              {isSelected ? '✓ Đang kích hoạt' : 'Bấm để chọn'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerTextAnimationTest(eff.id);
                            }}
                            className={`w-full py-1.5 px-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              isSelected
                                ? 'bg-[#70561f] text-white hover:bg-[#594418]'
                                : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-200'
                            }`}
                          >
                            <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-700 fill-amber-700'}`} />
                            <span>▶️ Xem Thử Chữ</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 8. MỤC RIÊNG: LỰA CHỌN MÀU NỀN RUỘT THIỆP BÊN TRONG (THEO YÊU CẦU ẢNH 2) */}
              <div className="p-5 bg-gradient-to-br from-stone-50 to-amber-50/30 rounded-2xl border border-stone-200 space-y-4">
                <div>
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                    <Palette className="w-4 h-4 text-amber-700" />
                    <span>8. Lựa Chọn Màu Nền Ruột Thiệp Bên Trong</span>
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Thay đổi màu nền của toàn bộ phần nội dung thiệp bên trong (phần sau khi khách mở phong bì ra)
                  </p>
                </div>

                {/* Swatches List */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {[
                      { name: 'Kem Ngọc Trai (Mặc định)', color: '#faf7f2', border: 'border-stone-300' },
                      { name: 'Trắng Tinh Khôi', color: '#ffffff', border: 'border-stone-300' },
                      { name: 'Hồng Phấn Pastel', color: '#fff0f0', border: 'border-rose-200' },
                      { name: 'Xanh Bơ Sage Quý Tộc', color: '#edf5ed', border: 'border-emerald-200' },
                      { name: 'Vàng Hoàng Gia Cổ Điển', color: '#fbf3e0', border: 'border-amber-200' },
                      { name: 'Đỏ Rượu Vintage Nhạt', color: '#fbeaea', border: 'border-rose-300' },
                      { name: 'Xanh Midnight Nhạt', color: '#e8eff9', border: 'border-blue-200' },
                    ].map((palette) => {
                      const isSelected = (formData.bgColor || '#faf7f2').toLowerCase() === palette.color.toLowerCase();
                      return (
                        <button
                          key={palette.color}
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, bgColor: palette.color }));
                            setPreviewEnvelopeOpen(true);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
                            isSelected
                              ? 'ring-2 ring-[#70561f] border-stone-900 bg-white shadow-md'
                              : 'bg-white hover:bg-stone-50 border border-stone-200'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full ${palette.border} border shadow-inner shrink-0`}
                            style={{ backgroundColor: palette.color }}
                          ></span>
                          <span className={isSelected ? 'text-[#70561f] font-bold' : 'text-stone-700'}>
                            {palette.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#70561f] ml-0.5" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom color picker */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-stone-600 font-semibold">Hoặc tự chọn màu bất kỳ:</span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-300 shadow-sm">
                      <input
                        type="color"
                        value={formData.bgColor || '#faf7f2'}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, bgColor: e.target.value }));
                          setPreviewEnvelopeOpen(true);
                        }}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0"
                      />
                      <input
                        type="text"
                        value={formData.bgColor || '#faf7f2'}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, bgColor: e.target.value }));
                          setPreviewEnvelopeOpen(true);
                        }}
                        className="w-20 text-xs font-mono font-semibold uppercase bg-transparent text-stone-800"
                        placeholder="#faf7f2"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUÀ CƯỚI & HỘP MỪNG CƯỚI (MENU MỚI THEO YÊU CẦU NGƯỜI DÙNG) */}
          {activeTab === 'gift' && (
            <div className="space-y-6">
              {/* Header Tab */}
              <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Gift className="w-5 h-5 text-[#70561f]" />
                    <span>Quản Lý Quà Cưới & Hộp Mừng Cưới</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Sửa các dòng chữ trong mục Hộp mừng cưới • Tải lên ảnh số tài khoản / mã QR ngân hàng riêng của Cô dâu và Chú rể
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewGiftModal(true)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[#70561f] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
                    title="Mở xem thử cửa sổ Hộp Mừng Cưới"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#70561f]" />
                    <span>Xem Thử Hộp Quà</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveCurrent}
                    className="px-4 py-1.5 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Save className="w-3.5 h-3.5 text-amber-300" />
                    <span>Lưu Quà Cưới</span>
                  </button>
                </div>
              </div>

              {/* CARD 1: SỬA CÁC DÒNG CHỮ TRONG MỤC HỘP MỪNG CƯỚI */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                    <span>1. CÁC DÒNG CHỮ HIỂN THỊ (HỘP MỪNG CƯỚI)</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Tiêu đề chính:
                    </label>
                    <input
                      type="text"
                      value={formData.giftHeading || 'Hộp mừng cưới'}
                      onChange={(e) => setFormData({ ...formData, giftHeading: e.target.value })}
                      placeholder="Hộp mừng cưới"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-bold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Tên nút bấm:
                    </label>
                    <input
                      type="text"
                      value={formData.giftButtonLabel || 'Mở Hộp Mừng Cưới'}
                      onChange={(e) => setFormData({ ...formData, giftButtonLabel: e.target.value })}
                      placeholder="Mở Hộp Mừng Cưới"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-semibold text-stone-900"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <label className="block text-stone-700 font-semibold mb-1">
                    Lời nhắn cảm ơn / Dòng phụ đề:
                  </label>
                  <textarea
                    rows={2}
                    value={formData.giftSubtitle || 'Cảm ơn tình cảm của mọi người đã dành cho chúng mình!'}
                    onChange={(e) => setFormData({ ...formData, giftSubtitle: e.target.value })}
                    placeholder="Cảm ơn tình cảm của mọi người đã dành cho chúng mình!"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs"
                  />
                </div>
              </div>

              {/* CARD 2: TÀI KHOẢN & ẢNH MÃ QR NGÂN HÀNG CỦA CHÚ RỂ (NHÀ TRAI) */}
              <div className="p-5 rounded-2xl bg-stone-50 border-2 border-amber-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-amber-900 flex items-center gap-2">
                    <span className="text-base">🤵</span>
                    <span>2. ẢNH SỐ TÀI KHOẢN & MÃ QR CHÚ RỂ (HỌ NHÀ TRAI)</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    {formData.groom?.nickname || formData.groom?.name || 'Chú rể'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Upload Image Box */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <label className="block text-stone-700 font-semibold text-xs mb-2 self-start">
                      Ảnh số tài khoản / Mã QR Chú Rể:
                    </label>

                    {formData.banking?.groomBank?.qrImage ? (
                      <div className="w-full bg-white p-3 rounded-2xl border-2 border-amber-300 shadow-sm flex flex-col items-center">
                        <div className="w-full max-h-52 overflow-hidden rounded-xl flex items-center justify-center bg-stone-50 mb-3 border border-stone-100">
                          <img
                            src={formData.banking.groomBank.qrImage}
                            alt="Ảnh số tài khoản Chú Rể"
                            className="w-full max-h-52 object-contain rounded-lg"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full">
                          <label className="flex-1 py-1.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-[#70561f] text-xs font-semibold text-center cursor-pointer transition-all">
                            <span>Đổi ảnh khác</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleFileUpload(e, (base64) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    banking: {
                                      ...(prev.banking || {}),
                                      groomBank: {
                                        ...(prev.banking?.groomBank || {}),
                                        qrImage: base64
                                      }
                                    }
                                  }));
                                  setSaveStatus('Đã cập nhật ảnh số tài khoản Chú Rể!');
                                  setTimeout(() => setSaveStatus(''), 2500);
                                });
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                banking: {
                                  ...(prev.banking || {}),
                                  groomBank: {
                                    ...(prev.banking?.groomBank || {}),
                                    qrImage: ''
                                  }
                                }
                              }));
                              setSaveStatus('Đã xóa ảnh tài khoản Chú Rể!');
                              setTimeout(() => setSaveStatus(''), 2000);
                            }}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-600 text-stone-500 border border-stone-200 transition-all"
                            title="Xóa ảnh này"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer border-2 border-dashed border-amber-300 hover:border-[#70561f] rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-white hover:bg-amber-50/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <QrCode className="w-6 h-6 text-[#70561f]" />
                        </div>
                        <span className="text-xs font-bold text-stone-800 group-hover:text-[#70561f]">
                          Tải lên ảnh số tài khoản / QR Chú Rể
                        </span>
                        <span className="text-[11px] text-stone-500 mt-1">
                          Hỗ trợ ảnh chụp màn hình ngân hàng, ảnh mã QR (JPG, PNG)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleFileUpload(e, (base64) => {
                              setFormData(prev => ({
                                ...prev,
                                banking: {
                                  ...(prev.banking || {}),
                                  groomBank: {
                                    ...(prev.banking?.groomBank || {}),
                                    qrImage: base64
                                  }
                                }
                              }));
                              setSaveStatus('Đã tải lên ảnh tài khoản Chú Rể thành công!');
                              setTimeout(() => setSaveStatus(''), 2500);
                            });
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Text details for Groom */}
                  <div className="md:col-span-7 space-y-3 text-xs">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Tên Ngân hàng:
                      </label>
                      <input
                        type="text"
                        value={formData.banking?.groomBank?.bankName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            banking: {
                              ...(prev.banking || {}),
                              groomBank: {
                                ...(prev.banking?.groomBank || {}),
                                bankName: val
                              }
                            }
                          }));
                        }}
                        placeholder="MBBank (Quân Đội), Vietcombank..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Số tài khoản:
                        </label>
                        <input
                          type="text"
                          value={formData.banking?.groomBank?.accountNo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              banking: {
                                ...(prev.banking || {}),
                                groomBank: {
                                  ...(prev.banking?.groomBank || {}),
                                  accountNo: val
                                }
                              }
                            }));
                          }}
                          placeholder="99999988888"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono font-bold text-[#70561f]"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Tên chủ tài khoản:
                        </label>
                        <input
                          type="text"
                          value={formData.banking?.groomBank?.accountName || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setFormData(prev => ({
                              ...prev,
                              banking: {
                                ...(prev.banking || {}),
                                groomBank: {
                                  ...(prev.banking?.groomBank || {}),
                                  accountName: val
                                }
                              }
                            }));
                          }}
                          placeholder="HOANG DINH HIEU"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Chi nhánh (tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={formData.banking?.groomBank?.branch || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            banking: {
                              ...(prev.banking || {}),
                              groomBank: {
                                ...(prev.banking?.groomBank || {}),
                                branch: val
                              }
                            }
                          }));
                        }}
                        placeholder="Hà Nội"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: TÀI KHOẢN & ẢNH MÃ QR NGÂN HÀNG CỦA CÔ DÂU (NHÀ GÁI) */}
              <div className="p-5 rounded-2xl bg-stone-50 border-2 border-rose-200/80 space-y-4">
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-rose-900 flex items-center gap-2">
                    <span className="text-base">👰</span>
                    <span>3. ẢNH SỐ TÀI KHOẢN & MÃ QR CÔ DÂU (HỌ NHÀ GÁI)</span>
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                    {formData.bride?.nickname || formData.bride?.name || 'Cô dâu'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                  {/* Upload Image Box */}
                  <div className="md:col-span-5 flex flex-col items-center">
                    <label className="block text-stone-700 font-semibold text-xs mb-2 self-start">
                      Ảnh số tài khoản / Mã QR Cô Dâu:
                    </label>

                    {formData.banking?.brideBank?.qrImage ? (
                      <div className="w-full bg-white p-3 rounded-2xl border-2 border-rose-300 shadow-sm flex flex-col items-center">
                        <div className="w-full max-h-52 overflow-hidden rounded-xl flex items-center justify-center bg-stone-50 mb-3 border border-stone-100">
                          <img
                            src={formData.banking.brideBank.qrImage}
                            alt="Ảnh số tài khoản Cô Dâu"
                            className="w-full max-h-52 object-contain rounded-lg"
                          />
                        </div>

                        <div className="flex items-center gap-2 w-full">
                          <label className="flex-1 py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 text-xs font-semibold text-center cursor-pointer transition-all">
                            <span>Đổi ảnh khác</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                handleFileUpload(e, (base64) => {
                                  setFormData(prev => ({
                                    ...prev,
                                    banking: {
                                      ...(prev.banking || {}),
                                      brideBank: {
                                        ...(prev.banking?.brideBank || {}),
                                        qrImage: base64
                                      }
                                    }
                                  }));
                                  setSaveStatus('Đã cập nhật ảnh số tài khoản Cô Dâu!');
                                  setTimeout(() => setSaveStatus(''), 2500);
                                });
                              }}
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                banking: {
                                  ...(prev.banking || {}),
                                  brideBank: {
                                    ...(prev.banking?.brideBank || {}),
                                    qrImage: ''
                                  }
                                }
                              }));
                              setSaveStatus('Đã xóa ảnh tài khoản Cô Dâu!');
                              setTimeout(() => setSaveStatus(''), 2000);
                            }}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-600 text-stone-500 border border-stone-200 transition-all"
                            title="Xóa ảnh này"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="w-full cursor-pointer border-2 border-dashed border-rose-300 hover:border-rose-600 rounded-2xl p-5 flex flex-col items-center justify-center text-center bg-white hover:bg-rose-50/50 transition-all group">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                          <QrCode className="w-6 h-6 text-rose-600" />
                        </div>
                        <span className="text-xs font-bold text-stone-800 group-hover:text-rose-700">
                          Tải lên ảnh số tài khoản / QR Cô Dâu
                        </span>
                        <span className="text-[11px] text-stone-500 mt-1">
                          Hỗ trợ ảnh chụp màn hình ngân hàng, ảnh mã QR (JPG, PNG)
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            handleFileUpload(e, (base64) => {
                              setFormData(prev => ({
                                ...prev,
                                banking: {
                                  ...(prev.banking || {}),
                                  brideBank: {
                                    ...(prev.banking?.brideBank || {}),
                                    qrImage: base64
                                  }
                                }
                              }));
                              setSaveStatus('Đã tải lên ảnh tài khoản Cô Dâu thành công!');
                              setTimeout(() => setSaveStatus(''), 2500);
                            });
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {/* Text details for Bride */}
                  <div className="md:col-span-7 space-y-3 text-xs">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Tên Ngân hàng:
                      </label>
                      <input
                        type="text"
                        value={formData.banking?.brideBank?.bankName || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            banking: {
                              ...(prev.banking || {}),
                              brideBank: {
                                ...(prev.banking?.brideBank || {}),
                                bankName: val
                              }
                            }
                          }));
                        }}
                        placeholder="Techcombank, Vietinbank..."
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Số tài khoản:
                        </label>
                        <input
                          type="text"
                          value={formData.banking?.brideBank?.accountNo || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFormData(prev => ({
                              ...prev,
                              banking: {
                                ...(prev.banking || {}),
                                brideBank: {
                                  ...(prev.banking?.brideBank || {}),
                                  accountNo: val
                                }
                              }
                            }));
                          }}
                          placeholder="19033336666"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-mono font-bold text-rose-700"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Tên chủ tài khoản:
                        </label>
                        <input
                          type="text"
                          value={formData.banking?.brideBank?.accountName || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setFormData(prev => ({
                              ...prev,
                              banking: {
                                ...(prev.banking || {}),
                                brideBank: {
                                  ...(prev.banking?.brideBank || {}),
                                  accountName: val
                                }
                              }
                            }));
                          }}
                          placeholder="LE THANH THUY"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Chi nhánh (tùy chọn):
                      </label>
                      <input
                        type="text"
                        value={formData.banking?.brideBank?.branch || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            banking: {
                              ...(prev.banking || {}),
                              brideBank: {
                                ...(prev.banking?.brideBank || {}),
                                branch: val
                              }
                            }
                          }));
                        }}
                        placeholder="Hà Nội"
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUẢN LÝ NHẠC NỀN (THEO YÊU CẦU ẢNH 3: UP MP3/MP4, TICK CHỌN, XÓA NHẠC) */}
          {activeTab === 'music' && (
            <div className="space-y-6">
              <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Music className="w-5 h-5 text-[#70561f]" />
                    <span>Quản Lý Nhạc Nền Thiệp Cưới (MP3 & MP4)</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Tải lên file nhạc MP3, MP4 từ máy tính • Tick chọn bài muốn phát • Bấm biểu tượng thùng rác để xóa bỏ bài hát không thích
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRestoreDefaultTracks}
                  className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-all self-start"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục bài hát mẫu</span>
                </button>
              </div>

              {/* Music On/Off Toggle */}
              <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="font-semibold text-stone-800 text-xs sm:text-sm block">
                    Bật nhạc nền tự động phát
                  </span>
                  <span className="text-[11px] text-stone-500">
                    Tự động phát giai điệu lãng mạn khi khách mời mở phong bì thiệp cưới
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.music?.enabled !== false}
                  onChange={(e) => setFormData({
                    ...formData,
                    music: { ...formData.music, enabled: e.target.checked }
                  })}
                  className="w-5 h-5 accent-[#70561f] cursor-pointer"
                />
              </div>

              {/* UPLOAD CUSTOM MP3 / MP4 FILE SECTION (ẢNH 3) */}
              <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-700" />
                    <span>Tải Lên File Nhạc MP3 & Video Nhạc MP4 Của Bạn</span>
                  </h3>
                  <span className="text-[11px] text-amber-800 font-semibold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                    Hỗ trợ MP3, MP4, M4A, WAV
                  </span>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  Bạn có file nhạc MP3 hoặc trích xuất âm thanh từ file video MP4 trên máy tính? Bấm nút bên dưới để tải trực tiếp lên hệ thống:
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <label className="px-5 py-3 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold cursor-pointer shadow-md flex items-center gap-2 transition-all hover:scale-102">
                    <Upload className="w-4 h-4 text-amber-300" />
                    <span>Chọn file MP3 / MP4 từ máy tính</span>
                    <input
                      type="file"
                      accept="audio/*,video/mp4,video/*,.mp3,.mp4,.wav,.m4a"
                      className="hidden"
                      onChange={handleMusicUpload}
                    />
                  </label>
                </div>
              </div>

              {/* PLAYLIST OF SONGS WITH RADIO SELECT, PLAY & DELETE BUTTON */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-stone-800 flex items-center gap-2">
                    <Music className="w-3.5 h-3.5 text-stone-500" />
                    <span>Danh Sách Bài Hát (Tick Chọn Bài Muốn Dùng • Bấm Thùng Rác Để Xóa):</span>
                  </h3>
                  <span className="text-[11px] text-stone-500 font-medium">
                    {(formData.music?.presetTracks || []).length} bài hát
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(formData.music?.presetTracks || []).map((track) => {
                    const isSelected = formData.music?.activeTrackId
                      ? formData.music.activeTrackId === track.id
                      : Boolean(formData.music?.customTrackUrl && (formData.music.customTrackUrl === track.url || formData.music.customTrackName === track.title));
                    const isPreviewing = (previewTrackId && previewTrackId === track.id) || previewAudio === track.url;
                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between gap-3 text-xs ${
                          isSelected
                            ? 'bg-amber-50/80 border-[#70561f] ring-2 ring-amber-300/80 shadow-md'
                            : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <input
                            type="radio"
                            name="musicTrackSelection"
                            checked={isSelected}
                            onChange={() => handleSelectTrack(track)}
                            className="w-4 h-4 accent-[#70561f] cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-stone-900 truncate">{track.title}</p>
                              {track.isCustom && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 shrink-0">
                                  Tải lên
                                </span>
                              )}
                              {isSelected && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#70561f] text-white shrink-0">
                                  Đang Dùng
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-stone-500 truncate">{track.artist}</p>
                          </div>
                        </div>

                        {/* Action buttons: Listen & Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePreviewPlay(track);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
                              isPreviewing
                                ? 'bg-[#70561f] text-white'
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                            }`}
                          >
                            {isPreviewing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isPreviewing ? 'Tạm dừng' : 'Nghe thử'}</span>
                          </button>

                          {/* Delete button (Xóa bài hát không thích) */}
                          <button
                            type="button"
                            onClick={(e) => handleDeleteTrack(track.id, e)}
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-rose-100 text-stone-400 hover:text-rose-600 border border-stone-200 transition-colors"
                            title="Xóa bài hát này khỏi danh sách"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {(formData.music?.presetTracks || []).length === 0 && (
                    <div className="p-6 bg-stone-50 rounded-2xl border border-dashed border-stone-300 text-center space-y-2">
                      <p className="text-xs text-stone-500">Danh sách nhạc đang trống.</p>
                      <button
                        type="button"
                        onClick={handleRestoreDefaultTracks}
                        className="px-3.5 py-1.5 rounded-xl bg-[#70561f] text-white text-xs font-semibold shadow"
                      >
                        Khôi phục lại bài hát mẫu
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          
          {/* TAB: CẤU HÌNH SOCIAL SHARE */}
          {activeTab === 'social' && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
                <Share2 className="w-5 h-5 text-[#70561f]" />
                <span>Cấu Hình Thông Tin Khi Gửi Link Qua Zalo / Facebook</span>
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-4 text-xs sm:text-sm">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      🔗 Tên miền / Link Web Thiệp Cưới Online (Public URL)
                    </label>
                    <input
                      type="url"
                      value={formData.socialShare?.customDomain || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialShare: { ...formData.socialShare, customDomain: e.target.value }
                      })}
                      placeholder="VD: https://thiepcuoi-hieuthuy.vercel.app hoặc domain riêng..."
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Nhập link web online đã xuất bản của bạn vào đây. Hệ thống sẽ tự động dùng link này khi bạn bấm Copy Link hoặc Copy Lời Mời Zalo để gửi cho khách!
                    </p>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Tiêu đề link khi gửi (og:title)
                    </label>
                    <input
                      type="text"
                      value={formData.socialShare?.title || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialShare: { ...formData.socialShare, title: e.target.value }
                      })}
                      placeholder="VD: Thư mời cưới Thanh Thúy ♥ Đình Hiếu"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Mô tả link (og:description)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.socialShare?.description || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        socialShare: { ...formData.socialShare, description: e.target.value }
                      })}
                      placeholder="VD: Sự hiện diện của quý khách là niềm vinh dự của gia đình chúng tôi"
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Ảnh đại diện thumbnail (og:image)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.socialShare?.thumbnail || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          socialShare: { ...formData.socialShare, thumbnail: e.target.value }
                        })}
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs truncate"
                      />
                      <label className="px-3 py-2 rounded-xl bg-stone-900 text-white cursor-pointer hover:bg-stone-800 flex items-center gap-1 text-xs shrink-0">
                        <Upload className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tải ảnh</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, (b64) => setFormData({
                            ...formData,
                            socialShare: { ...formData.socialShare, thumbnail: b64 }
                          }))}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live Card Preview */}
                <div className="bg-stone-50 p-4 sm:p-5 rounded-3xl border border-stone-200 space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
                    <Eye className="w-4 h-4 text-[#70561f]" />
                    <span>Mô Phỏng Thẻ Tin Nhắn Zalo / Messenger</span>
                  </h3>

                  <div className="bg-white rounded-2xl shadow-md border border-stone-200/80 overflow-hidden max-w-sm mx-auto">
                    <div className="px-3.5 pt-3 pb-1 text-blue-600 text-xs font-mono break-all hover:underline">
                      {formData.socialShare?.customDomain 
                        ? (currentProfileKey === 'bride' 
                            ? `${formData.socialShare.customDomain.replace(/\/+$/, '')}/co-dau?to=Mẹ+Nga`
                            : `${formData.socialShare.customDomain.replace(/\/+$/, '')}/chu-re?to=Anh+Nam`)
                        : (currentProfileKey === 'bride'
                            ? `https://thiepcuoi-hieuthuy-web.vercel.app/co-dau?to=Mẹ+Nga`
                            : `https://thiepcuoi-hieuthuy-web.vercel.app/chu-re?to=Anh+Nam`)}
                    </div>

                    <div className="aspect-[1.91/1] w-full bg-stone-900 overflow-hidden flex items-center justify-center">
                      <img
                        src={formData.socialShare?.thumbnail || (currentProfileKey === 'bride' ? formData.bride?.heroImage : formData.groom?.heroImage) || '/templates/007/images/og_banner.jpg'}
                        alt="OG Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-3.5 bg-stone-50/70 border-t border-stone-100">
                      <h4 className="font-bold text-stone-900 text-sm leading-snug line-clamp-2">
                        {formData.socialShare?.title || (currentProfileKey === 'bride' ? 'Thư mời cưới Thanh Thúy ♥ Đình Hiếu' : 'Thư mời cưới Đình Hiếu ♥ Thanh Thúy')}
                      </h4>
                      <p className="text-stone-500 text-xs mt-1 leading-relaxed line-clamp-2">
                        {formData.socialShare?.description || (currentProfileKey === 'bride' ? 'Trân trọng kính mời quý khách đến chung vui lễ thành hôn của Thanh Thúy & Đình Hiếu.' : 'Thiệp cưới online của Đình Hiếu ♥ Thanh Thúy nơi gửi gắm lời mời trân trọng và câu chuyện tình yêu đong đầy ý nghĩa.')}
                      </p>
                    </div>
                  </div>

                  {/* Nút sao chép link thử nghiệm & link chung */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-sm mx-auto pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        await handleSaveCurrent();
                        const sampleUrl = formData.socialShare?.customDomain 
                          ? (currentProfileKey === 'bride' 
                              ? `${formData.socialShare.customDomain.replace(/\/+$/, '')}/co-dau?to=Mẹ+Nga`
                              : `${formData.socialShare.customDomain.replace(/\/+$/, '')}/chu-re?to=Anh+Nam`)
                          : (currentProfileKey === 'bride'
                              ? `https://thiepcuoi-hieuthuy-web.vercel.app/co-dau?to=Mẹ+Nga`
                              : `https://thiepcuoi-hieuthuy-web.vercel.app/chu-re?to=Anh+Nam`);
                        navigator.clipboard.writeText(sampleUrl);
                        setCopiedLink('preview-sample');
                        setTimeout(() => setCopiedLink(''), 2500);
                      }}
                      className="w-full sm:w-auto flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      {copiedLink === 'preview-sample' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã copy link gửi thử!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy link gửi thử (kèm tên khách)</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await handleSaveCurrent();
                        const generalUrl = formData.socialShare?.customDomain 
                          ? (currentProfileKey === 'bride' 
                              ? `${formData.socialShare.customDomain.replace(/\/+$/, '')}/co-dau`
                              : `${formData.socialShare.customDomain.replace(/\/+$/, '')}/chu-re`)
                          : (currentProfileKey === 'bride'
                              ? `https://thiepcuoi-hieuthuy-web.vercel.app/co-dau`
                              : `https://thiepcuoi-hieuthuy-web.vercel.app/chu-re`);
                        navigator.clipboard.writeText(generalUrl);
                        setCopiedLink('preview-card');
                        setTimeout(() => setCopiedLink(''), 2500);
                      }}
                      className="w-full sm:w-auto flex-1 py-2 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      {copiedLink === 'preview-card' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã copy link thiệp!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Link Thiệp Chung</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-w-sm mx-auto pt-1 space-y-2">
                    <a
                      href={`https://developers.facebook.com/tools/debug/?q=${encodeURIComponent(
                        formData.socialShare?.customDomain 
                          ? (currentProfileKey === 'bride' 
                              ? `${formData.socialShare.customDomain.replace(/\/+$/, '')}/co-dau` 
                              : `${formData.socialShare.customDomain.replace(/\/+$/, '')}/chu-re`)
                          : (currentProfileKey === 'bride'
                              ? `https://thiepcuoi-hieuthuy-web.vercel.app/co-dau`
                              : `https://thiepcuoi-hieuthuy-web.vercel.app/chu-re`)
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      title="Mở Meta Sharing Debugger để ép Facebook xóa cache và tải lại thẻ xem trước ngay lập tức"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>⚡ Xóa Cache Facebook Messenger (Sharing Debugger)</span>
                    </a>

                    <a
                      href={`https://developers.zalo.me/tools/debug-sharing?url=${encodeURIComponent(
                        formData.socialShare?.customDomain 
                          ? (currentProfileKey === 'bride' 
                              ? `${formData.socialShare.customDomain.replace(/\/+$/, '')}/co-dau` 
                              : `${formData.socialShare.customDomain.replace(/\/+$/, '')}/chu-re`)
                          : (currentProfileKey === 'bride'
                              ? `https://thiepcuoi-hieuthuy-web.vercel.app/co-dau`
                              : `https://thiepcuoi-hieuthuy-web.vercel.app/chu-re`)
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer"
                      title="Mở Zalo Debug Sharing để ép Zalo xóa cache và tải lại thẻ xem trước ngay lập tức"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>⚡ Xóa Cache Zalo (Debug Sharing Zalo)</span>
                    </a>
                  </div>

                  {/* Clarification Notice on Why Localhost Only Shows Raw Link */}
                  <div className="p-3.5 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-900 leading-relaxed space-y-1.5">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Tại sao khi dán link vào Zalo hiện tại chỉ thấy chữ link local?</span>
                    </div>
                    <p className="text-[11px] text-stone-700">
                      • <b>Nguyên nhân kỹ thuật:</b> Zalo và Facebook chỉ cào được thẻ ảnh mô phỏng khi đường link chạy trên Internet công khai (<code className="bg-amber-100 px-1 py-0.2 rounded font-mono text-amber-900">https://...</code>). Khi chạy thử trên máy tính cá nhân (<code className="bg-amber-100 px-1 py-0.2 rounded font-mono text-amber-900">localhost:5173</code>), máy chủ Zalo không thể truy cập vào máy của bạn để lấy ảnh.
                    </p>
                    <p className="text-[11px] text-stone-700">
                      • <b>Cách hiển thị chuẩn 100%:</b> Sau khi xuất bản web lên mạng (qua Vercel / Netlify / Cloudflare hoặc nhập link public vào ô bên trái), gửi qua Zalo sẽ <b>tự động hiện khung thẻ ảnh mô phỏng đẹp y hệt hình trên</b>!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* TAB: CHỌN MẪU BÌA & CHỈNH SỬA THÔNG TIN BÌA (THEO YÊU CẦU ẢNH 4 & ẢNH 5) */}
          {activeTab === 'templates' && (
            <div className="space-y-8">
              <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#70561f]" />
                    <span>Chọn Mẫu Bìa Phong Bì & Tùy Chỉnh Toàn Diện</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-1">
                    Bấm trực tiếp vào mẫu bìa để kích hoạt & xem trước bên cạnh • Bấm thùng rác để xóa bỏ • Tùy chỉnh hiệu ứng mở bìa & màu sắc bìa
                  </p>
                </div>

                {availableCoverStyles.length < 4 && (
                  <button
                    type="button"
                    onClick={handleRestoreAllCoverStyles}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-all self-start"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Khôi phục lại đủ 4 mẫu bìa</span>
                  </button>
                )}
              </div>

              {/* CẤU HÌNH: CHẾ ĐỘ HIỂN THỊ KHI MỞ LINK THIỆP */}
              <div className="p-4 sm:p-5 bg-stone-900 text-stone-100 rounded-3xl border border-amber-400/50 shadow-md space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Chế Độ Mở Thiệp Cho Khách Mời</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950">
                          Khuyên Dùng
                        </span>
                      </h3>
                      <p className="text-xs text-stone-300">
                        Chọn cách thiệp cưới hiển thị khi khách mời bấm vào link thiệp được gửi qua Zalo/Facebook:
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        coverConfig: {
                          ...(prev.coverConfig || {}),
                          showCoverFirst: false
                        }
                      }));
                      setPreviewEnvelopeOpen(true);
                      setSaveStatus('Đã chọn: Mở thẳng vào Ruột thiệp Cocohappii!');
                      setTimeout(() => setSaveStatus(''), 2500);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      !formData.coverConfig?.showCoverFirst
                        ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400/60 text-white'
                        : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-amber-300" />
                        <span>Mở Thẳng Vào Ruột Thiệp</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/30 text-amber-200">
                        Giống 100% bản xem trước
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Khách bấm link sẽ thấy ngay trang thiệp cưới Cocohappii lộng lẫy (Ảnh đôi, Sự kiện, Lịch cưới, Timeline, Album...). Vẫn có nút &quot;Xem Bìa&quot; ở trên cùng để mở bìa phong bì bất cứ lúc nào!
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        coverConfig: {
                          ...(prev.coverConfig || {}),
                          showCoverFirst: true
                        }
                      }));
                      setPreviewEnvelopeOpen(false);
                      setSaveStatus('Đã chọn: Hiện Bìa Phong Bì trước!');
                      setTimeout(() => setSaveStatus(''), 2500);
                    }}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      formData.coverConfig?.showCoverFirst
                        ? 'bg-amber-400/20 border-amber-400 ring-2 ring-amber-400/60 text-white'
                        : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-amber-300" />
                        <span>Hiện Bìa Phong Bì Trước</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-700 text-stone-300">
                        Mở nắp phong bì
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed">
                      Khách mở link sẽ thấy phong bì thiệp cá nhân hóa trước. Khi khách bấm &quot;Xem thiệp ngay&quot;, phong bì sẽ từ từ mở ra để lộ ruột thiệp bên trong theo hiệu ứng đã chọn.
                    </p>
                  </button>
                </div>
              </div>

              {/* BỔ SUNG YÊU CẦU 5: NHẬN DIỆN & TẠO MẪU BÌA TỪ LINK WEB HOẶC FILE ẢNH */}
              <div className="p-5 sm:p-6 bg-gradient-to-br from-amber-50/80 via-stone-50 to-emerald-50/50 rounded-3xl border-2 border-amber-300 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#70561f] to-amber-600 text-white flex items-center justify-center shadow-md shrink-0">
                      <Sparkles className="w-5 h-5 text-amber-200" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                        <span>Nhận Diện & Tạo Mẫu Bìa Từ Link Web Hoặc File Ảnh</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                          Tính năng mới
                        </span>
                      </h3>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Dán link web thiệp cưới bất kỳ hoặc tải ảnh mẫu bìa từ máy tính để hệ thống tự động phân tích và tạo ngay mẫu bìa đồng bộ vào danh sách lựa chọn của bạn.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Link Suggestion Pills */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-stone-500 font-semibold text-[11px]">Gợi ý link mẫu:</span>
                  <button
                    type="button"
                    onClick={() => setImportUrl('https://s.27biggroup.com/wedingA9')}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-900 font-medium text-[11px] shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    <span>27BigGroup WedingA9 (Cổng Xanh Ngọc)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportUrl('https://cocohappii.com/invite/hoanganh-huongtra-wedding/T17O7J')}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-medium text-[11px] shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    <span>Cocohappii (Bìa Sáp Vàng)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportUrl('https://www.lovecard.click/thiepso26')}
                    className="px-2.5 py-1 rounded-xl bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 font-medium text-[11px] shadow-sm flex items-center gap-1.5 transition-all"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                    <span>LoveCard 26 (Phong Bì Đỏ Hoa)</span>
                  </button>
                </div>

                {/* Input Fields */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-1">
                  <div className="lg:col-span-7 flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-stone-300 shadow-sm focus-within:border-[#70561f] focus-within:ring-2 focus-within:ring-amber-200">
                    <LinkIcon className="w-4 h-4 text-stone-400 shrink-0" />
                    <input
                      type="url"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      placeholder="Dán link web mẫu (VD: https://s.27biggroup.com/wedingA9)..."
                      className="w-full text-xs text-stone-800 placeholder-stone-400 bg-transparent focus:outline-none"
                    />
                    {importUrl && (
                      <button
                        type="button"
                        onClick={() => setImportUrl('')}
                        className="text-stone-400 hover:text-stone-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="lg:col-span-5 flex items-center gap-2">
                    <label className="flex-1 px-3.5 py-2.5 rounded-2xl bg-white hover:bg-stone-50 border border-dashed border-stone-300 hover:border-stone-400 text-stone-700 font-medium text-xs cursor-pointer shadow-sm flex items-center justify-center gap-2 transition-all">
                      <Upload className="w-4 h-4 text-[#70561f]" />
                      <span className="truncate max-w-[160px]">
                        {importFile ? importFile.name : 'Hoặc tải file ảnh mẫu từ máy'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setImportFile(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                    {importFile && (
                      <button
                        type="button"
                        onClick={() => setImportFile(null)}
                        className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs shrink-0"
                        title="Hủy bỏ file"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Submit action */}
                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isAnalyzing || (!importUrl.trim() && !importFile)}
                    onClick={handleAnalyzeAndCreateCover}
                    className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                      isAnalyzing || (!importUrl.trim() && !importFile)
                        ? 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                        : 'bg-gradient-to-r from-[#70561f] to-amber-700 hover:from-[#584318] hover:to-amber-800 text-white shadow-amber-900/20 hover:shadow-lg active:scale-95'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Đang Phân Tích & Tạo Mẫu Bìa...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>✨ Phân Tích & Tạo Mẫu Bìa Ngay</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* GRID OF AVAILABLE COVER STYLES: LARGE FULL-BLEED CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. MẪU 1: BÌA SÁP VÀNG HOÀNG GIA (Cocohappii) */}
                {availableCoverStyles.includes('style1') && (
                  <div
                    onClick={() => handleSelectCover('style1')}
                    className={`rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative shadow-md hover:shadow-xl group ${
                      activeCoverStyle === 'style1'
                        ? 'border-[#70561f] bg-amber-50/40 ring-4 ring-amber-300/70 shadow-xl'
                        : 'border-stone-200 bg-white hover:border-[#70561f]/50'
                    }`}
                  >
                    {/* Active Ribbon Badge */}
                    {activeCoverStyle === 'style1' && (
                      <div className="absolute top-3 left-3 z-30 bg-[#70561f] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-300" />
                        <span>Đang Chọn Làm Bìa Thiệp</span>
                      </div>
                    )}

                    {/* Delete button (Thùng rác đỏ) */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCoverStyle('style1', e)}
                      className="absolute top-3 right-3 z-30 p-2 rounded-2xl bg-white/90 hover:bg-rose-50 text-stone-400 hover:text-rose-600 shadow-md border border-stone-200 transition-colors"
                      title="Xóa hẳn mẫu bìa này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* FULL-SIZE COVER MOCKUP (CHUẨN THEO ẢNH 3 - COCOHAPPII) */}
                    <div className="p-4 sm:p-5">
                      <div
                        style={{ backgroundColor: formData.coverConfig?.style1?.bgColor || '#fbe8ea' }}
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 relative flex flex-col justify-between p-2.5 border border-amber-300/40 shadow-inner transition-colors duration-500"
                      >
                        {/* Upper photo with bright natural filter */}
                        <div className="relative h-24 w-full rounded-xl overflow-hidden">
                          <img
                            src={formData.coverConfig?.style1?.photo || formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
                            alt=""
                            className="w-full h-full object-cover object-[center_20%] filter brightness-[0.92] group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent"></div>
                        </div>

                        {/* White arched card with melted gold wax seal */}
                        <div className="relative -mt-6 bg-white rounded-t-2xl rounded-b-xl p-2 text-center shadow-xl border border-[#c4a97d] flex flex-col items-center">
                          <div className="-mt-4 w-6 h-6 rounded-full bg-gradient-to-br from-[#ffd875] via-[#d4af67] to-[#784f18] flex items-center justify-center p-0.5 shadow-md">
                            <div className="w-full h-full rounded-full bg-gradient-to-b from-[#e5bc64] to-[#966b1a] flex items-center justify-center">
                              <span className="text-[8px] text-amber-100">✦</span>
                            </div>
                          </div>
                          <span className="text-[8px] text-[#737373] font-avo font-normal mt-1 mb-1 block">
                            {formData.coverConfig?.style1?.subTitle || 'The Wedding Of'}
                          </span>
                          <div className="font-motherland text-base font-bold text-[#78350f] leading-normal pt-0.5 my-1 flex items-center justify-center gap-1.5 truncate max-w-full">
                            <span>{formData.groom?.nickname || 'Đình Hiếu'}</span>
                            <span className="text-amber-700 text-xs">&</span>
                            <span>{formData.bride?.nickname || 'Thanh Thúy'}</span>
                          </div>
                          <span className="text-[8px] text-[#222] font-avo font-semibold tracking-wider">
                            {formData.coverConfig?.style1?.date || formData.saveTheDateDay || '20.09.2026'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-stone-900 flex items-center justify-between">
                          <span>Mẫu 1: Bìa Sáp Vàng Hoàng Gia</span>
                          <span className="text-xs text-amber-800 font-medium bg-amber-100 px-2 py-0.5 rounded-full">Cocohappii</span>
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Thiệp vòm cung thanh lịch lồng ấn sáp vàng đồng, cành nguyệt quế mềm mại và tên cô dâu chú rể trên một dòng sắc nét.
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer: Tick Chọn Mẫu Này (Full Width - Bỏ nút Sửa Chi Tiết theo yêu cầu) */}
                    <div className="p-3.5 bg-stone-50 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCover('style1');
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          activeCoverStyle === 'style1'
                            ? 'bg-[#70561f] text-white shadow-md ring-2 ring-amber-300'
                            : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-300'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${activeCoverStyle === 'style1' ? 'text-amber-300' : 'text-stone-400'}`} />
                        <span>{activeCoverStyle === 'style1' ? '✓ Đang Dùng Làm Bìa Thiệp' : 'Tick Chọn Mẫu Này'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. MẪU 2: PHONG BÌ ĐỎ HOA TƯƠI (LoveCard 26) */}
                {availableCoverStyles.includes('style2') && (
                  <div
                    onClick={() => handleSelectCover('style2')}
                    className={`rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative shadow-md hover:shadow-xl group ${
                      activeCoverStyle === 'style2'
                        ? 'border-rose-700 bg-rose-50/40 ring-4 ring-rose-300/70 shadow-xl'
                        : 'border-stone-200 bg-white hover:border-rose-700/50'
                    }`}
                  >
                    {/* Active Ribbon Badge */}
                    {activeCoverStyle === 'style2' && (
                      <div className="absolute top-3 left-3 z-30 bg-rose-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-rose-200" />
                        <span>Đang Chọn Làm Bìa Thiệp</span>
                      </div>
                    )}

                    {/* Delete button (Thùng rác đỏ) */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCoverStyle('style2', e)}
                      className="absolute top-3 right-3 z-30 p-2 rounded-2xl bg-white/90 hover:bg-rose-50 text-stone-400 hover:text-rose-600 shadow-md border border-stone-200 transition-colors"
                      title="Xóa hẳn mẫu bìa này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* FULL-SIZE COVER MOCKUP */}
                    <div className="p-4 sm:p-5">
                      <div
                        style={{ backgroundColor: formData.coverConfig?.style2?.bgColor || '#faf7f2' }}
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 relative flex flex-col items-center justify-center p-4 border border-rose-200/60 shadow-inner transition-colors duration-500"
                      >
                        {/* Mini 3D envelope adapting to chosen color */}
                        <div
                          style={{ backgroundColor: (formData.coverConfig?.style2?.envelopeColor && formData.coverConfig?.style2?.envelopeColor !== '#faf7f2' && formData.coverConfig?.style2?.envelopeColor !== '#faf8f4' && formData.coverConfig?.style2?.envelopeColor !== '#ffffff') ? formData.coverConfig?.style2?.envelopeColor : '#8c111e' }}
                          className="relative w-36 aspect-[1.35] rounded-xl shadow-xl border border-black/20 flex items-center justify-center group-hover:scale-105 transition-transform duration-500 overflow-hidden"
                        >
                          <div className="absolute top-0 inset-x-0 h-[52%] bg-black/25 [clip-path:polygon(0_0,100%_0,50%_100%)] border-b border-amber-300/40"></div>
                          <img
                            src="/templates/007/images/decor-flower-bouquet1.png"
                            alt=""
                            className="absolute -top-3.5 -left-3.5 w-11 pointer-events-none drop-shadow"
                          />
                          <img
                            src="/templates/007/images/decor-flower-bouquet2.png"
                            alt=""
                            className="absolute -bottom-3.5 -right-3.5 w-11 pointer-events-none drop-shadow"
                          />
                        </div>
                        <div className="font-motherland text-base font-bold text-[#785437] mt-2.5 flex items-center justify-center gap-1.5 leading-tight truncate max-w-full">
                          <span>{formData.groom?.nickname || 'Đình Hiếu'}</span>
                          <span className="font-serif-elegant font-normal text-xs text-[#785437]">-</span>
                          <span>{formData.bride?.nickname || 'Thanh Thúy'}</span>
                        </div>
                        <span className="text-[9px] font-avo font-semibold text-[#6d5b4b] uppercase tracking-widest mt-0.5">
                          {formData.coverConfig?.style2?.subTitle || 'SAVE THE DATE'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-stone-900 flex items-center justify-between">
                          <span>Mẫu 2: Phong Bì Đỏ Hoa Tươi</span>
                          <span className="text-xs text-rose-800 font-medium bg-rose-100 px-2 py-0.5 rounded-full">LoveCard 26</span>
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Phong bì đỏ nhung 3D kết hoa cưới các góc, chữ thư pháp lãng mạn và cánh thiệp truyền thống ngọt ngào.
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer: Tick Chọn Mẫu Này (Full Width - Bỏ nút Sửa Chi Tiết theo yêu cầu) */}
                    <div className="p-3.5 bg-stone-50 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCover('style2');
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          activeCoverStyle === 'style2'
                            ? 'bg-rose-800 text-white shadow-md ring-2 ring-rose-300'
                            : 'bg-white hover:bg-rose-50 text-stone-700 border border-stone-300'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${activeCoverStyle === 'style2' ? 'text-rose-200' : 'text-stone-400'}`} />
                        <span>{activeCoverStyle === 'style2' ? '✓ Đang Dùng Làm Bìa Thiệp' : 'Tick Chọn Mẫu Này'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. MẪU 3: CỔNG XANH NGỌC & ẤN TRIỆN (27BigGroup A9) */}
                {availableCoverStyles.includes('style3') && (
                  <div
                    onClick={() => handleSelectCover('style3')}
                    className={`rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative shadow-md hover:shadow-xl group ${
                      activeCoverStyle === 'style3'
                        ? 'border-emerald-700 bg-emerald-50/40 ring-4 ring-emerald-300/70 shadow-xl'
                        : 'border-stone-200 bg-white hover:border-emerald-700/50'
                    }`}
                  >
                    {/* Active Ribbon Badge */}
                    {activeCoverStyle === 'style3' && (
                      <div className="absolute top-3 left-3 z-30 bg-emerald-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Đang Chọn Làm Bìa Thiệp</span>
                      </div>
                    )}

                    {/* Delete button (Thùng rác đỏ) */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCoverStyle('style3', e)}
                      className="absolute top-3 right-3 z-30 p-2 rounded-2xl bg-white/90 hover:bg-rose-50 text-stone-400 hover:text-rose-600 shadow-md border border-stone-200 transition-colors"
                      title="Xóa hẳn mẫu bìa này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* FULL-SIZE COVER MOCKUP */}
                    <div className="p-4 sm:p-5">
                      <div
                        style={{ backgroundColor: formData.coverConfig?.style3?.bgColor || '#183120' }}
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 relative flex flex-col items-center justify-center p-4 border border-amber-300/40 shadow-inner transition-colors duration-500"
                      >
                        {/* Mini royal arched portal window with photo */}
                        <div className="relative z-10 w-20 h-24 rounded-t-full rounded-b-lg border-2 border-amber-300 shadow-md overflow-hidden mx-auto my-1 flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          <img
                            src={formData.coverConfig?.style3?.photo || formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
                            alt=""
                            className="w-full h-full object-cover object-[center_12%] filter brightness-[0.98]"
                          />
                          <div className="absolute inset-x-0 bottom-1 h-3 bg-red-900 border-y border-amber-300/80"></div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-800 border border-amber-300 flex items-center justify-center text-[7px] text-amber-200">囍</div>
                        </div>
                        <span className="text-[9px] font-avo font-semibold text-amber-200 mt-1.5 mb-1 relative z-10 block tracking-wider">
                          ✦ {formData.coverConfig?.style3?.headerTitle || 'THIỆP MỜI CƯỚI'} ✦
                        </span>
                        <div className="font-motherland text-sm font-bold text-amber-100 relative z-10 mt-1 mb-1 leading-normal pt-0.5 flex items-center justify-center gap-1.5 drop-shadow">
                          <span>{formData.groom?.nickname || 'Đình Hiếu'}</span>
                          <span className="font-serif-elegant italic text-xs text-amber-300 font-bold">&</span>
                          <span>{formData.bride?.nickname || 'Thanh Thúy'}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-stone-900 flex items-center justify-between">
                          <span>Mẫu 3: Cổng Xanh Ngọc & Ấn Triện</span>
                          <span className="text-xs text-emerald-800 font-medium bg-emerald-100 px-2 py-0.5 rounded-full">27BigGroup A9</span>
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Nền xanh ngọc bích quý phái, cành trúc thanh tao, ấn triện đỏ lồng ảnh và dải ruy băng hoàng gia mở đôi cánh cửa.
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer: Tick Chọn Mẫu Này (Full Width - Bỏ nút Sửa Chi Tiết theo yêu cầu) */}
                    <div className="p-3.5 bg-stone-50 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCover('style3');
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          activeCoverStyle === 'style3'
                            ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-300'
                            : 'bg-white hover:bg-emerald-50 text-stone-700 border border-stone-300'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${activeCoverStyle === 'style3' ? 'text-emerald-200' : 'text-stone-400'}`} />
                        <span>{activeCoverStyle === 'style3' ? '✓ Đang Dùng Làm Bìa Thiệp' : 'Tick Chọn Mẫu Này'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. MẪU 4: BÌA SÁP TỐI GIẢN (Ảnh số 5 - Save our date / Thanh Sơn & Diệu Nhi) */}
                {availableCoverStyles.includes('style4') && (
                  <div
                    onClick={() => handleSelectCover('style4')}
                    className={`rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative shadow-md hover:shadow-xl group ${
                      activeCoverStyle === 'style4'
                        ? 'border-amber-700 bg-amber-50/40 ring-4 ring-amber-300/70 shadow-xl'
                        : 'border-stone-200 bg-white hover:border-amber-700/50'
                    }`}
                  >
                    {/* Active Ribbon Badge */}
                    {activeCoverStyle === 'style4' && (
                      <div className="absolute top-3 left-3 z-30 bg-amber-800 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-amber-200" />
                        <span>Đang Chọn Làm Bìa Thiệp</span>
                      </div>
                    )}

                    {/* Delete button (Thùng rác đỏ) */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCoverStyle('style4', e)}
                      className="absolute top-3 right-3 z-30 p-2 rounded-2xl bg-white/90 hover:bg-rose-50 text-stone-400 hover:text-rose-600 shadow-md border border-stone-200 transition-colors"
                      title="Xóa hẳn mẫu bìa này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* FULL-SIZE COVER MOCKUP (CHUẨN THEO ẢNH 1 - SAVE OUR DATE) */}
                    <div className="p-4 sm:p-5">
                      <div
                        style={{ backgroundColor: formData.coverConfig?.style4?.bgColor || '#fbf5ed' }}
                        className="w-full aspect-[4/3] rounded-2xl overflow-hidden mb-4 relative flex flex-col justify-between p-3 border border-amber-300/40 shadow-inner group-hover:scale-101 transition-all duration-500"
                      >
                        {/* Vertical blue line on right */}
                        <div className="absolute top-0 bottom-0 right-[22%] -translate-x-1/2 w-[1.5px] bg-[#dbe5ee] pointer-events-none"></div>

                        {/* Top: Save our date in script before vertical line */}
                        <div className="text-left select-none pl-1 pr-[26%]">
                          <span className="font-motherland text-base text-[#6f563d] block leading-none whitespace-nowrap">
                            Save our date
                          </span>
                        </div>

                        {/* Middle: Stacked names and wax seal on vertical line */}
                        <div className="relative flex items-center justify-between my-auto pl-1 pr-2">
                          <div className="text-left font-motherland text-xs text-[#483827] leading-tight select-none pr-8">
                            <p className="truncate max-w-[85px]">{formData.groom?.nickname || 'Đình Hiếu'}</p>
                            <p className="font-serif-elegant italic text-[10px] text-amber-700 my-0.5">&</p>
                            <p className="truncate max-w-[85px]">{formData.bride?.nickname || 'Thanh Thúy'}</p>
                          </div>

                          {/* Mini bronze wax seal centered directly ON vertical line */}
                          <div className="absolute right-[22%] translate-x-1/2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gradient-to-br from-[#d9b876] via-[#ab8343] to-[#4e340d] p-0.5 shadow-md flex items-center justify-center">
                            <div className="w-full h-full rounded-full border border-[#deb977] flex items-center justify-center">
                              <span className="text-[6px] text-[#e6c888]">🌿</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Salutation & Guest */}
                        <div className="text-left pl-1 pr-[26%] font-serif italic text-[8px] text-stone-600 leading-tight">
                          <p>Trân trọng kính mời</p>
                          <p className="text-stone-800 font-semibold truncate">Quý khách</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-base text-stone-900 flex items-center justify-between">
                          <span>Mẫu 4: Bìa Sáp Tối Giản</span>
                          <span className="text-xs text-amber-800 font-medium bg-amber-100 px-2 py-0.5 rounded-full">Save our date</span>
                        </h3>
                        <p className="text-xs text-stone-500 leading-relaxed">
                          Thiệp tối giản phong cách Hàn Quốc, chữ Save our date thư pháp uốn lượn, ấn sáp đồng cành ô liu và dải chỉ xanh thanh lịch.
                        </p>
                      </div>
                    </div>

                    {/* Card Actions Footer: Tick Chọn Mẫu Này (Full Width - Bỏ nút Sửa Chi Tiết theo yêu cầu) */}
                    <div className="p-3.5 bg-stone-50 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectCover('style4');
                        }}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                          activeCoverStyle === 'style4'
                            ? 'bg-amber-800 text-white shadow-md ring-2 ring-amber-300'
                            : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-300'
                        }`}
                      >
                        <Check className={`w-4 h-4 ${activeCoverStyle === 'style4' ? 'text-amber-200' : 'text-stone-400'}`} />
                        <span>{activeCoverStyle === 'style4' ? '✓ Đang Dùng Làm Bìa Thiệp' : 'Tick Chọn Mẫu Này'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 5. CÁC MẪU BÌA TỰ TẠO / NHẬN DIỆN THÊM (CUSTOM STYLES TỪ LINK HOẶC FILE ẢNH) */}
                {availableCoverStyles.filter(id => !['style1', 'style2', 'style3', 'style4'].includes(id)).map(customId => {
                  const customData = formData.coverConfig?.[customId] || {};
                  return (
                    <div
                      key={customId}
                      onClick={() => handleSelectCover(customId)}
                      className={`rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between overflow-hidden relative shadow-md hover:shadow-xl group ${
                        activeCoverStyle === customId
                          ? 'border-indigo-600 bg-indigo-50/40 ring-4 ring-indigo-300/70 shadow-xl'
                          : 'border-stone-200 bg-white hover:border-indigo-400'
                      }`}
                    >
                      {activeCoverStyle === customId && (
                        <div className="absolute top-3 left-3 z-30 bg-indigo-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-indigo-200" />
                          <span>Đang Chọn Làm Bìa Thiệp</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteCoverStyle(customId, e)}
                        className="absolute top-3 right-3 z-30 p-2 rounded-2xl bg-white/90 hover:bg-rose-50 text-stone-400 hover:text-rose-600 shadow-md border border-stone-200 transition-colors"
                        title="Xóa hẳn mẫu bìa này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="p-4 sm:p-5">
                        <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden bg-stone-900 mb-4 relative flex flex-col items-center justify-center p-4 border border-stone-700 shadow-inner">
                          {customData.photo && (
                            <img
                              src={customData.photo}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover filter brightness-75 group-hover:scale-105 transition-transform duration-500"
                            />
                          )}
                          <div className="absolute inset-0 bg-black/40"></div>
                          <div className="relative z-10 text-center">
                            <span className="text-xs uppercase tracking-wider text-amber-300 font-sans-clean block font-bold">
                              {customData.headerTitle || 'MẪU BÌA TỰ TẠO'}
                            </span>
                            <span className="text-base font-serif-elegant font-bold text-white block mt-1">
                              {customData.names || `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} & ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`}
                            </span>
                            <span className="text-xs text-stone-300 block mt-0.5">
                              {customData.date || formData.saveTheDateDay || '26.12.2026'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <h3 className="font-bold text-base text-stone-900 flex items-center justify-between">
                            <span>{customData.headerTitle || 'Mẫu Bìa Tự Tạo'}</span>
                            <span className="text-xs text-indigo-800 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">Tùy biến</span>
                          </h3>
                          <p className="text-xs text-stone-500 leading-relaxed">
                            Mẫu bìa tùy chỉnh được tạo từ link hoặc tải ảnh mẫu từ máy tính của bạn.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-stone-50 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectCover(customId);
                          }}
                          className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                            activeCoverStyle === customId
                              ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-300'
                              : 'bg-white hover:bg-indigo-50 text-stone-700 border border-stone-300'
                          }`}
                        >
                          <Check className={`w-4 h-4 ${activeCoverStyle === customId ? 'text-indigo-200' : 'text-stone-400'}`} />
                          <span>{activeCoverStyle === customId ? '✓ Đang Dùng Làm Bìa Thiệp' : 'Tick Chọn Mẫu Này'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* BỔ SUNG: 8 HIỆU ỨNG CHUYỂN CẢNH KHI MỞ BÌA / PHONG BÌ (CHẬM & CÓ ĐIỂM NHẤN - YÊU CẦU 2) */}
              <div className="p-5 bg-amber-50/40 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <Film className="w-4 h-4 text-amber-700" />
                      <span>8 Hiệu Ứng Chuyển Cảnh Khi Mở Bìa Phong Bì (Cover Opening Animation)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Tổng hợp 8 mẫu hiệu ứng mở bìa phong bì độc quyền, di chuyển chậm rãi (1.6s) rõ nét tạo điểm nhấn tuyệt đẹp
                    </p>
                  </div>
                  <span className="text-xs font-bold text-amber-900 px-2.5 py-1 bg-amber-100/80 rounded-xl border border-amber-300">
                    Đang chọn: {
                      formData.coverConfig?.coverAnimationEffect === 'waxFlap' ? '1. Mở Nắp Sáp 3D (Cocohappii)' :
                      formData.coverConfig?.coverAnimationEffect === 'splitDoor' ? '2. Cổng Cung Đình (27BigGroup A9)' :
                      formData.coverConfig?.coverAnimationEffect === 'flowerBloom' ? '3. Cánh Hoa Rơi (LoveCard 26)' :
                      formData.coverConfig?.coverAnimationEffect === 'ribbonUntie' ? '4. Tháo Ruy Băng Vàng Kim' :
                      formData.coverConfig?.coverAnimationEffect === 'curtainReveal' ? '5. Kéo Rèm Nhung Đỏ' :
                      formData.coverConfig?.coverAnimationEffect === 'scrollUnroll' ? '6. Trải Chiếu Chỉ Hoàng Gia' :
                      formData.coverConfig?.coverAnimationEffect === 'envelopeSlide' ? '7. Rút Thiệp Khỏi Phong Bì' :
                      formData.coverConfig?.coverAnimationEffect === 'zoomFade' ? '8. Phóng To Điện Ảnh' : 'Mở Tức Thì'
                    }
                  </span>
                </div>

                {/* Helpful Instruction Tip */}
                <div className="bg-amber-100/80 border border-amber-300 rounded-xl px-3.5 py-2 text-xs text-amber-950 flex items-center gap-2.5 shadow-xs">
                  <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Hiệu Ứng Chuyển Động Chậm:</strong> Bấm trực tiếp vào từng thẻ hoặc bấm nút <strong>[▶️ Xem Thử Mở Bìa]</strong>, bìa thiệp sẽ mở chậm rãi và sống động ngay trên điện thoại bên phải!
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 pt-1">
                  {[
                    {
                      id: 'waxFlap',
                      title: '1. Mở Nắp Sáp 3D Hoàng Gia',
                      badge: 'Cocohappii',
                      badgeColor: 'bg-amber-100 text-amber-800',
                      desc: 'Nắp phong bì lật mở 3D chân thực 180° từ từ về phía sau, bóc con dấu sáp niêm phong hé lộ thiệp.'
                    },
                    {
                      id: 'splitDoor',
                      title: '2. Cổng Đôi Cung Đình Mở 2 Bên',
                      badge: '27BigGroup A9',
                      badgeColor: 'bg-emerald-100 text-emerald-800',
                      desc: 'Hai cánh cổng cung điện trượt mở êm ái sang 2 bên như mở ra cánh cửa hạnh phúc lộng lẫy.'
                    },
                    {
                      id: 'flowerBloom',
                      title: '3. Cánh Hoa Rơi & Nở Bung',
                      badge: 'LoveCard 26',
                      badgeColor: 'bg-rose-100 text-rose-800',
                      desc: 'Cánh hoa hồng và hoa đào rơi chao lượn khắp màn hình, phong bì bung nở bừng sáng ngập tràn hoa tươi.'
                    },
                    {
                      id: 'ribbonUntie',
                      title: '4. Tháo Dải Ruy Băng Vàng Kim',
                      badge: 'Quý Tộc',
                      badgeColor: 'bg-amber-100 text-amber-900',
                      desc: 'Chiếc nơ ruy băng hoàng gia từ từ tháo bung ra 2 bên, dải lụa bay lượn mềm mại tỏa ánh hào quang.'
                    },
                    {
                      id: 'curtainReveal',
                      title: '5. Kéo Rèm Nhung Đỏ Cung Đình',
                      badge: 'Sân Khấu',
                      badgeColor: 'bg-red-100 text-red-900',
                      desc: 'Hai dải rèm nhung đỏ xếp ly hoàng gia từ từ kéo dạt sang hai bên, ánh đèn sân khấu bừng sáng hé lộ thiệp.'
                    },
                    {
                      id: 'scrollUnroll',
                      title: '6. Trải Cuộn Chiếu Chỉ Hoàng Gia',
                      badge: 'Cổ Điển',
                      badgeColor: 'bg-amber-100 text-amber-900',
                      desc: 'Bìa thiệp mở cuộn từ tâm ra 2 phía trên - dưới như cuộn tơ lụa chiếu chỉ cung đình mở ra tin hỷ sự.'
                    },
                    {
                      id: 'envelopeSlide',
                      title: '7. Rút Cánh Thiệp Ra Khỏi Phong Bì',
                      badge: 'Chân Thực',
                      badgeColor: 'bg-sky-100 text-sky-900',
                      desc: 'Nắp phong bì mở ra, ruột thiệp từ từ trượt nhô lên cao ra khỏi lòng phong bì một cách sống động.'
                    },
                    {
                      id: 'zoomFade',
                      title: '8. Phóng To Điện Ảnh Hollywood',
                      badge: 'Điện Ảnh',
                      badgeColor: 'bg-purple-100 text-purple-900',
                      desc: 'Bìa thiệp từ từ phóng to 160% với chiều sâu điện ảnh, hiệu ứng mờ ảo lướt mượt mà vào ruột thiệp.'
                    },
                    {
                      id: 'none',
                      title: '9. Mở Tức Thì (Tĩnh)',
                      badge: 'Nhanh Chóng',
                      badgeColor: 'bg-stone-100 text-stone-600',
                      desc: 'Bìa mở ngay lập tức không qua hiệu ứng chuyển động, hiển thị ruột thiệp ngay tức thì.'
                    }
                  ].map((eff) => {
                    const isSelected = (formData.coverConfig?.coverAnimationEffect || 'waxFlap') === eff.id;
                    return (
                      <div
                        key={eff.id}
                        onClick={() => triggerOpeningAnimationTest(eff.id)}
                        className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-amber-100/70 border-[#70561f] shadow-md ring-2 ring-amber-400/80'
                            : 'bg-white border-stone-200 hover:border-amber-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-xs text-stone-900">{eff.title}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${eff.badgeColor || 'bg-stone-100 text-stone-600'}`}>
                              {eff.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-500 leading-relaxed">{eff.desc}</p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-stone-200/60 space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="radio"
                              name="coverAnimationEffect"
                              checked={isSelected}
                              onChange={() => triggerOpeningAnimationTest(eff.id)}
                              className="w-4 h-4 accent-[#70561f]"
                            />
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-[#70561f]' : 'text-stone-400'}`}>
                              {isSelected ? '✓ Đang kích hoạt' : 'Bấm để chọn'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerOpeningAnimationTest(eff.id);
                            }}
                            className={`w-full py-1.5 px-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                              isSelected
                                ? 'bg-[#70561f] text-white hover:bg-[#594418]'
                                : 'bg-white hover:bg-amber-50 text-stone-700 border border-stone-200'
                            }`}
                          >
                            <Play className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300 fill-amber-300' : 'text-amber-700 fill-amber-700'}`} />
                            <span>▶️ Xem Thử Mở Bìa</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* BỔ SUNG: LỰA CHỌN MÀU BÌA / PHONG BÌ (TÁCH BIỆT TỪNG MẪU BÌA, KHÔNG ĐỒNG BỘ NHAU) */}
              {(() => {
                const targetStyleId = editingCoverTab || formData.templateStyle || formData.coverConfig?.activeStyle || 'style1';
                const styleTitles = {
                  style1: 'Mẫu 1: Bìa Sáp Vàng',
                  style2: 'Mẫu 2: Phong Bì Đỏ',
                  style3: 'Mẫu 3: Cổng Xanh Ngọc',
                  style4: 'Mẫu 4: Bìa Sáp Tối Giản'
                };
                const currentStyleName = styleTitles[targetStyleId] || formData.coverConfig?.[targetStyleId]?.headerTitle || 'Mẫu Bìa Tùy Chọn';

                const currentCoverColor = (
                  targetStyleId === 'style1' ? (formData.coverConfig?.style1?.bgColor || '#fbe8ea') :
                  targetStyleId === 'style2' ? ((formData.coverConfig?.style2?.envelopeColor && formData.coverConfig?.style2?.envelopeColor !== '#faf7f2' && formData.coverConfig?.style2?.envelopeColor !== '#faf8f4') ? formData.coverConfig?.style2?.envelopeColor : '#8c111e') :
                  targetStyleId === 'style3' ? (formData.coverConfig?.style3?.bgColor || '#183120') :
                  targetStyleId === 'style4' ? (formData.coverConfig?.style4?.bgColor || '#fbf5ed') :
                  (formData.coverConfig?.[targetStyleId]?.bgColor || '#faf7f2')
                );

                const handleApplyColor = async (colorHex, colorLabel) => {
                  let updates = {};
                  if (targetStyleId === 'style2') {
                    updates = {
                      envelopeColor: colorHex,
                      bgColor: '#faf8f4' // Giữ nền thiệp sạch sẽ để phong bì nổi bật
                    };
                  } else {
                    updates = {
                      bgColor: colorHex
                    };
                  }

                  const updatedForm = {
                    ...formData,
                    coverConfig: {
                      ...(formData.coverConfig || {}),
                      [targetStyleId]: {
                        ...(formData.coverConfig?.[targetStyleId] || {}),
                        ...updates
                      }
                    }
                  };
                  setFormData(updatedForm);
                  setPreviewEnvelopeOpen(false);
                  setSaveStatus(`Đang đồng bộ màu cho ${currentStyleName}... ⏳`);

                  // Persist to all profiles and sync to Cloud Redis
                  const updatedAll = {
                    ...allProfiles,
                    activeProfile: currentProfileKey,
                    [currentProfileKey]: updatedForm
                  };
                  setAllProfiles(updatedAll);
                  if (onSaveProfile) {
                    await onSaveProfile(currentProfileKey, updatedForm);
                  } else if (onSaveAllProfiles) {
                    await onSaveAllProfiles(updatedAll);
                  }
                  if (typeof broadcastProfileUpdate === 'function') {
                    broadcastProfileUpdate(updatedAll, 'studio_color_changed');
                  }
                  setSaveStatus(`✅ Đã áp dụng màu ${colorLabel || colorHex} & đồng bộ lên link thiệp!`);
                  setTimeout(() => setSaveStatus(''), 2500);
                };

                return (
                  <div className="p-5 bg-gradient-to-br from-stone-50 to-amber-50/30 rounded-2xl border border-stone-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                          <Palette className="w-4 h-4 text-amber-700" />
                          <span>Lựa Chọn Bảng Màu Riêng Biệt Cho Từng Mẫu Bìa Thiệp Cưới</span>
                        </h3>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          Mỗi mẫu bìa (Mẫu 1, 2, 3, 4) hoàn toàn tách bạch màu sắc theo ý muốn của bạn, không bị đồng bộ đè lên nhau
                        </p>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300 self-start sm:self-auto shrink-0 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Màu sắc độc lập từng thiệp</span>
                      </span>
                    </div>

                    {/* COVER SWITCHER TABS FOR COLOR PALETTE */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                        <span>Bấm chọn mẫu thiệp bạn muốn đổi màu:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 bg-stone-100/80 p-1.5 rounded-xl border border-stone-200">
                        {[
                          { id: 'style1', name: 'Mẫu 1: Bìa Sáp Vàng', color: formData.coverConfig?.style1?.bgColor || '#fbe8ea' },
                          { id: 'style2', name: 'Mẫu 2: Phong Bì Đỏ', color: ((formData.coverConfig?.style2?.envelopeColor && formData.coverConfig?.style2?.envelopeColor !== '#faf7f2' && formData.coverConfig?.style2?.envelopeColor !== '#faf8f4') ? formData.coverConfig?.style2?.envelopeColor : '#8c111e') },
                          { id: 'style3', name: 'Mẫu 3: Cổng Xanh Ngọc', color: formData.coverConfig?.style3?.bgColor || '#183120' },
                          { id: 'style4', name: 'Mẫu 4: Bìa Sáp Tối Giản', color: formData.coverConfig?.style4?.bgColor || '#fbf5ed' },
                        ].filter(item => availableCoverStyles.includes(item.id)).map(item => {
                          const isTarget = targetStyleId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditingCoverTab(item.id);
                                setPreviewEnvelopeOpen(false);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                                isTarget
                                  ? 'bg-[#70561f] text-white shadow-md ring-2 ring-amber-300'
                                  : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-xs shrink-0"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{item.name}</span>
                              {isTarget && (
                                <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-md font-bold">
                                  ✓ Đang chọn
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active target banner */}
                    <div className="bg-amber-100/70 border border-amber-300/80 px-3.5 py-2 rounded-xl text-xs text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
                        <span>Đang chọn màu cho: <strong className="text-[#70561f] font-bold">{currentStyleName}</strong></span>
                      </span>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {targetStyleId === 'style2' && (
                          <button
                            type="button"
                            onClick={() => handleApplyColor('#8c111e', 'Đỏ Nhung Nguyên Bản')}
                            className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-900 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm cursor-pointer transition-all"
                            title="Khôi phục lại màu đỏ nhung nguyên bản cho Mẫu 2"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-200" />
                            <span>↺ Đặt Lại Màu Đỏ Nguyên Bản</span>
                          </button>
                        )}
                        <span className="font-mono text-[11px] font-bold bg-white/80 px-2 py-0.5 rounded-md border border-amber-300 text-stone-800">
                          {currentCoverColor.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Swatches List */}
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2.5">
                        {[
                          { name: 'Đỏ Nhung Nguyên Bản', color: '#8c111e', border: 'border-rose-900' },
                          { name: 'Đỏ Rượu Vang Ruby', color: '#6e0d1c', border: 'border-rose-950' },
                          { name: 'Đỏ Mận Quý Phái', color: '#7f1d1d', border: 'border-red-900' },
                          { name: 'Kem Ngọc Trai', color: '#faf7f2', border: 'border-stone-300' },
                          { name: 'Xanh Ngọc Lục Bảo', color: '#183120', border: 'border-emerald-900' },
                          { name: 'Xanh Navy Dạ Hội', color: '#152238', border: 'border-blue-900' },
                          { name: 'Xanh Rêu Sage Quý Phái', color: '#3c4f41', border: 'border-emerald-800' },
                          { name: 'Hồng Phấn Dịu Ngọt', color: '#fbe8ea', border: 'border-rose-200' },
                          { name: 'Nâu Sáp Da Bò Cổ Điển', color: '#4a3728', border: 'border-amber-900' },
                          { name: 'Trắng Ngà Hoàng Gia', color: '#f5f2eb', border: 'border-stone-300' },
                          { name: 'Be Cát Tự Nhiên', color: '#fbf5ed', border: 'border-amber-200' },
                          { name: 'Xanh Mint Pastel', color: '#e8f3ed', border: 'border-emerald-200' },
                        ].map((palette) => {
                          const isSelected = currentCoverColor.toLowerCase() === palette.color.toLowerCase();
                          return (
                            <button
                              key={palette.color}
                              type="button"
                              onClick={() => handleApplyColor(palette.color, palette.name)}
                              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all shadow-sm ${
                                isSelected
                                  ? 'ring-2 ring-[#70561f] border-stone-900 bg-white shadow-md'
                                  : 'bg-white hover:bg-stone-50 border border-stone-200'
                              }`}
                            >
                              <span
                                className={`w-4 h-4 rounded-full ${palette.border} border shadow-inner shrink-0`}
                                style={{ backgroundColor: palette.color }}
                              ></span>
                              <span className={isSelected ? 'text-[#70561f] font-bold' : 'text-stone-700'}>
                                {palette.name}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#70561f] ml-0.5" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom color picker */}
                      <div className="flex items-center gap-3 pt-2">
                        <span className="text-xs text-stone-600 font-semibold">Tự chọn màu riêng cho {currentStyleName}:</span>
                        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-300 shadow-sm">
                          <input
                            type="color"
                            value={currentCoverColor}
                            onChange={(e) => handleApplyColor(e.target.value)}
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={currentCoverColor}
                            onChange={(e) => handleApplyColor(e.target.value)}
                            className="w-20 text-xs font-mono font-semibold uppercase bg-transparent text-stone-800"
                            placeholder="#faf7f2"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* DEDICATED EDIT PANEL FOR COVER CONTENT & PHOTOS */}
              <div className="mt-8 pt-6 border-t border-stone-200 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/50 p-4 rounded-2xl border border-amber-200">
                  <div>
                    <h3 className="font-bold text-sm text-[#70561f] flex items-center gap-2">
                      <Sliders className="w-4 h-4" />
                      <span>
                        Chỉnh Sửa Câu Chữ & Ảnh Bìa: {
                          editingCoverTab === 'style1' ? 'Mẫu 1 (Bìa Sáp Vàng)' :
                          editingCoverTab === 'style2' ? 'Mẫu 2 (Phong Bì Đỏ)' :
                          editingCoverTab === 'style3' ? 'Mẫu 3 (Cổng Xanh Ngọc)' :
                          'Mẫu 4 (Bìa Sáp Tối Giản)'
                        }
                      </span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Bấm chuyển qua lại giữa các tab bên dưới để sửa thông tin cho từng mẫu bìa phong bì:
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-sm self-start">
                    {availableCoverStyles.includes('style1') && (
                      <button
                        type="button"
                        onClick={() => setEditingCoverTab('style1')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          editingCoverTab === 'style1'
                            ? 'bg-[#70561f] text-white shadow-sm'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Mẫu 1 (Sáp Vàng)
                      </button>
                    )}
                    {availableCoverStyles.includes('style2') && (
                      <button
                        type="button"
                        onClick={() => setEditingCoverTab('style2')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          editingCoverTab === 'style2'
                            ? 'bg-rose-800 text-white shadow-sm'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Mẫu 2 (Phong Bì Đỏ)
                      </button>
                    )}
                    {availableCoverStyles.includes('style3') && (
                      <button
                        type="button"
                        onClick={() => setEditingCoverTab('style3')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          editingCoverTab === 'style3'
                            ? 'bg-emerald-800 text-white shadow-sm'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Mẫu 3 (Cổng Xanh)
                      </button>
                    )}
                    {availableCoverStyles.includes('style4') && (
                      <button
                        type="button"
                        onClick={() => setEditingCoverTab('style4')}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          editingCoverTab === 'style4'
                            ? 'bg-amber-800 text-white shadow-sm'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        Mẫu 4 (Bìa Tối Giản)
                      </button>
                    )}
                  </div>
                </div>

                {/* EDIT FORM: STYLE 1 (BÌA SÁP VÀNG) */}
                {editingCoverTab === 'style1' && availableCoverStyles.includes('style1') && (
                  <div className="space-y-4 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[#70561f]">
                      1. Thông Tin Chữ & Ảnh Bìa Mẫu 1 (Sáp Vàng Hoàng Gia)
                    </h4>

                    {/* PHOTO PICKER FOR STYLE 1 */}
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                      <label className="block text-stone-700 font-bold text-xs">
                        Ảnh Nền Phía Sau Bìa Sáp Vàng:
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-stone-300 shadow-md bg-stone-900 shrink-0">
                          <img
                            src={formData.coverConfig?.style1?.photo || formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
                            alt="Ảnh bìa mẫu 1"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold cursor-pointer shadow flex items-center gap-1.5 transition-all">
                              <Upload className="w-3.5 h-3.5 text-amber-300" />
                              <span>Tải ảnh từ máy tính</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleCoverPhotoUpload('style1', e)}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => updateCoverField('style1', 'photo', formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg')}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-medium border border-stone-300 shadow-sm"
                            >
                              Dùng ảnh banner chính
                            </button>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Khuyên dùng ảnh cưới chụp dọc (tỷ lệ 3:4 hoặc 9:16) để bìa hiển thị đẹp nhất.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng chữ nhỏ trên tên:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style1?.subTitle ?? 'The Wedding Of'}
                          onChange={(e) => updateCoverField('style1', 'subTitle', e.target.value)}
                          placeholder="The Wedding Of"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên Dâu Rể hiển thị trên bìa:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style1?.names ?? `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} ♥ ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`}
                          onChange={(e) => updateCoverField('style1', 'names', e.target.value)}
                          placeholder="Đình Hiếu ♥ Thanh Thúy"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-[#70561f]"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Ngày cưới kẹp giữa lá nguyệt quế:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style1?.date ?? formData.saveTheDateDay ?? '26.12.2026'}
                          onChange={(e) => updateCoverField('style1', 'date', e.target.value)}
                          placeholder="26.12.2026"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng chữ lời mời:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style1?.greetingLabel ?? 'TRÂN TRỌNG KÍNH MỜI'}
                          onChange={(e) => updateCoverField('style1', 'greetingLabel', e.target.value)}
                          placeholder="TRÂN TRỌNG KÍNH MỜI"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-stone-700 font-semibold mb-1">Chữ trên nút bấm mở bìa:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style1?.buttonText ?? 'Xem thiệp ngay'}
                          onChange={(e) => updateCoverField('style1', 'buttonText', e.target.value)}
                          placeholder="Xem thiệp ngay"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT FORM: STYLE 2 (PHONG BÌ ĐỎ HOA TƯƠI) */}
                {editingCoverTab === 'style2' && availableCoverStyles.includes('style2') && (
                  <div className="space-y-4 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-rose-800">
                      2. Thông Tin Chữ Bìa Mẫu 2 (Phong Bì Đỏ Hoa Tươi)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Lời mời phía trên cùng:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.greetingLabel ?? 'TRÂN TRỌNG KÍNH MỜI'}
                          onChange={(e) => updateCoverField('style2', 'greetingLabel', e.target.value)}
                          placeholder="TRÂN TRỌNG KÍNH MỜI"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng chữ hướng dẫn mở thiệp:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.hintText ?? 'NHẤN VÀO THIỆP ĐỂ MỞ'}
                          onChange={(e) => updateCoverField('style2', 'hintText', e.target.value)}
                          placeholder="NHẤN VÀO THIỆP ĐỂ MỞ"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên Dâu Rể (Font thư pháp):</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.names ?? `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} - ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`}
                          onChange={(e) => updateCoverField('style2', 'names', e.target.value)}
                          placeholder="Đình Hiếu - Thanh Thúy"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-rose-900"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tiêu đề ngày cưới:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.subTitle ?? 'SAVE THE DATE'}
                          onChange={(e) => updateCoverField('style2', 'subTitle', e.target.value)}
                          placeholder="SAVE THE DATE"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Ngày cưới hiển thị:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.date ?? formData.saveTheDateDay ?? '26.12.2026'}
                          onChange={(e) => updateCoverField('style2', 'date', e.target.value)}
                          placeholder="26.12.2026"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Chữ trên nút bấm mở bìa:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style2?.buttonText ?? 'Mở Thiệp Ngay'}
                          onChange={(e) => updateCoverField('style2', 'buttonText', e.target.value)}
                          placeholder="Mở Thiệp Ngay"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-rose-800"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT FORM: STYLE 3 (CỔNG XANH NGỌC & ẤN TRIỆN) */}
                {editingCoverTab === 'style3' && availableCoverStyles.includes('style3') && (
                  <div className="space-y-4 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-800">
                      3. Thông Tin Chữ & Ảnh Bìa Mẫu 3 (Cổng Xanh Ngọc & Ấn Triện)
                    </h4>

                    {/* PHOTO PICKER FOR STYLE 3 CIRCULAR SEAL */}
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-3">
                      <label className="block text-emerald-900 font-bold text-xs">
                        Ảnh Lồng Bên Trong Ấn Triện Tròn Đỏ:
                      </label>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-amber-400 p-0.5 bg-red-900 shadow-lg shrink-0">
                          <img
                            src={formData.coverConfig?.style3?.photo || formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg'}
                            alt="Ảnh ấn triện mẫu 3"
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="px-3 py-1.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-semibold cursor-pointer shadow flex items-center gap-1.5 transition-all">
                              <Upload className="w-3.5 h-3.5 text-amber-300" />
                              <span>Tải ảnh ấn triện từ máy</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleCoverPhotoUpload('style3', e)}
                              />
                            </label>

                            <button
                              type="button"
                              onClick={() => updateCoverField('style3', 'photo', formData.heroBannerPhoto || '/templates/007/images/hero_banner.jpg')}
                              className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 font-medium border border-stone-300 shadow-sm"
                            >
                              Dùng ảnh banner chính
                            </button>
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Ảnh sẽ được bo tròn lồng vào ấn triện đỏ có viền vàng kim quý phái.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tiêu đề trên cùng:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style3?.headerTitle ?? 'THIỆP MỜI CƯỚI'}
                          onChange={(e) => updateCoverField('style3', 'headerTitle', e.target.value)}
                          placeholder="THIỆP MỜI CƯỚI"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-semibold text-emerald-900"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên Dâu Rể (Font thư pháp):</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style3?.names ?? `${formData.groom?.nickname || formData.groom?.name || 'Đình Hiếu'} & ${formData.bride?.nickname || formData.bride?.name || 'Thanh Thúy'}`}
                          onChange={(e) => updateCoverField('style3', 'names', e.target.value)}
                          placeholder="Đình Hiếu & Thanh Thúy"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-amber-700"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Dòng chữ hướng dẫn mở cửa:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style3?.hintText ?? 'Chạm vào ấn đỏ để mở cánh cửa'}
                          onChange={(e) => updateCoverField('style3', 'hintText', e.target.value)}
                          placeholder="Chạm vào ấn đỏ để mở cánh cửa"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white italic"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Lời chào khách:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style3?.greetingLabel ?? 'Trân trọng kính mời'}
                          onChange={(e) => updateCoverField('style3', 'greetingLabel', e.target.value)}
                          placeholder="Trân trọng kính mời"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-stone-700 font-semibold mb-1">Chữ trên bảng vàng mở thiệp:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style3?.buttonText ?? 'MỞ THIỆP'}
                          onChange={(e) => updateCoverField('style3', 'buttonText', e.target.value)}
                          placeholder="MỞ THIỆP"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold uppercase tracking-wider"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* EDIT FORM: STYLE 4 (BÌA SÁP TỐI GIẢN - ẢNH 5) */}
                {editingCoverTab === 'style4' && availableCoverStyles.includes('style4') && (
                  <div className="space-y-4 p-5 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-2">
                      <span>4. Thông Tin Chữ & Bìa Mẫu 4 (Save Our Date - Ảnh 5)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Chữ nghệ thuật trên cùng:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style4?.subTitle ?? 'Save our date'}
                          onChange={(e) => updateCoverField('style4', 'subTitle', e.target.value)}
                          placeholder="Save our date"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-serif-elegant italic text-base"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Chữ trên nút mở thiệp bo tròn:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style4?.buttonText ?? 'MỞ THIỆP'}
                          onChange={(e) => updateCoverField('style4', 'buttonText', e.target.value)}
                          placeholder="MỞ THIỆP"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold uppercase tracking-wider"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên Chú Rể (Xếp dòng trên):</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style4?.groomName ?? formData.groom?.name ?? 'Đình Hiếu'}
                          onChange={(e) => updateCoverField('style4', 'groomName', e.target.value)}
                          placeholder="Đình Hiếu"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Tên Cô Dâu (Xếp dòng dưới):</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style4?.brideName ?? formData.bride?.name ?? 'Thanh Thúy'}
                          onChange={(e) => updateCoverField('style4', 'brideName', e.target.value)}
                          placeholder="Thanh Thúy"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-stone-900"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Lời chào khách mời:</label>
                        <input
                          type="text"
                          value={formData.coverConfig?.style4?.greetingLabel ?? 'Trân trọng kính mời'}
                          onChange={(e) => updateCoverField('style4', 'greetingLabel', e.target.value)}
                          placeholder="Trân trọng kính mời"
                          className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">Màu dải ruy băng:</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={formData.coverConfig?.style4?.ribbonColor || '#b8cddc'}
                            onChange={(e) => updateCoverField('style4', 'ribbonColor', e.target.value)}
                            className="w-9 h-9 rounded-lg border border-stone-300 cursor-pointer p-0"
                          />
                          <input
                            type="text"
                            value={formData.coverConfig?.style4?.ribbonColor || '#b8cddc'}
                            onChange={(e) => updateCoverField('style4', 'ribbonColor', e.target.value)}
                            className="w-28 px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs font-mono uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: HẠ TẦNG ĐA ĐÁM MÂY & SAO LƯU (SUPABASE, CLOUDINARY, CLOUDFLARE R2, REDIS) */}
          {activeTab === 'cloud' && (
            <div className="space-y-6 animate-fade-in">
              <div className="border-b border-stone-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                    <Database className="w-5 h-5 text-[#70561f]" />
                    <span>Hạ Tầng Lưu Trữ & Đa Đám Mây (High Availability)</span>
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Trang bị hệ thống lưu trữ 5 tầng song song (Upstash Redis, Cloudinary CDN, Supabase, Cloudflare R2, Offline Cache) đảm bảo 100% không bao giờ mất dữ liệu và không sập app.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={checkCloudHealth}
                  disabled={isCheckingCloud}
                  className="px-3.5 py-2 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingCloud ? 'animate-spin' : ''}`} />
                  <span>{isCheckingCloud ? 'Đang kiểm tra...' : 'Kiểm tra kết nối đám mây'}</span>
                </button>
              </div>

              {/* 1. BẢNG TRẠNG THÁI 5 TẦNG LƯU TRỮ ĐA ĐÁM MÂY */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Layer 1: Upstash Redis */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700">
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-stone-900">Upstash Redis Cloud</h4>
                        <span className="text-[10px] text-stone-500 font-mono">In-Memory Database</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đang Kết Nối (Active)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Bộ nhớ đệm siêu tốc phản hồi &lt;10ms, lưu trữ cấu hình thiệp và đồng bộ hóa lời chúc mừng tức thì giữa khách mời và cô dâu chú rể.
                  </p>
                  <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                    <span>Cluster: Global Edge</span>
                    <span>Tốc độ: 10,000 req/ngày miễn phí</span>
                  </div>
                </div>

                {/* Layer 2: Cloudinary Media CDN */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Cloud className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-stone-900">Cloudinary Media CDN</h4>
                        <span className="text-[10px] text-stone-500 font-mono">Auto WebP/AVIF CDN</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã Tích Hợp (Ready)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Tối ưu hóa và nén hình ảnh album cưới chuẩn WebP/AVIF, phân phối qua mạng CDN toàn cầu giúp khách mở ảnh trên mạng 4G/5G cực nhanh.
                  </p>
                  <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                    <span>Băng thông: 25GB/tháng miễn phí</span>
                    <span>CDN: Fastly/Akamai</span>
                  </div>
                </div>

                {/* Layer 3: Supabase PostgreSQL */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                        <Database className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-stone-900">Supabase Cloud Database</h4>
                        <span className="text-[10px] text-stone-500 font-mono">PostgreSQL Relational DB</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã Tích Hợp (Dual-Sync)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Cơ sở dữ liệu quan hệ PostgreSQL đóng vai trò kho lưu trữ dự phòng tầng 2. Bất cứ khi nào lưu thiệp hoặc nhận lời chúc, hệ thống sẽ ghi đồng thời vào cả Redis và Supabase.
                  </p>
                  <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                    <span>Lưu trữ: 500MB DB + 1GB Storage</span>
                    <span>Sao lưu: Dự phòng tự động</span>
                  </div>
                </div>

                {/* Layer 4: Cloudflare R2 */}
                <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col justify-between space-y-2 hover:border-amber-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-stone-900">Cloudflare R2 Object Storage</h4>
                        <span className="text-[10px] text-stone-500 font-mono">S3-Compatible (Zero Egress)</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Đã Tích Hợp (Zero Egress)</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 leading-relaxed">
                    Lưu trữ các file nhạc nền đám cưới (.m4a, .mp3) và file ảnh gốc chất lượng cao với phí tải băng thông là 0 đồng (miễn phí không giới hạn lượt nghe/tải).
                  </p>
                  <div className="pt-1 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 font-mono">
                    <span>Dung lượng: 10GB miễn phí/tháng</span>
                    <span>Băng thông tải: 0đ không giới hạn</span>
                  </div>
                </div>
              </div>

              {/* 2. KHỐI CÔNG CỤ SAO LƯU DỰ PHÒNG & KHÔI PHỤC TOÀN DIỆN (DISASTER RECOVERY) */}
              <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50/40 rounded-2xl border border-amber-200 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#70561f] flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Bộ Công Cụ Sao Lưu Dự Phòng & Khôi Phục (Disaster Recovery)</span>
                    </h3>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Đảm bảo an toàn 100% dữ liệu cưới: Tải về máy bản sao lưu độc lập bất cứ lúc nào và khôi phục chỉ với 1 cú click chuột.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-full border border-amber-300">
                    Bảo vệ 2 chiều
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Backup Button */}
                  <div className="p-4 bg-white rounded-xl border border-amber-200 flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                        <FileJson className="w-4 h-4 text-[#70561f]" />
                        <span>1. Tải Về File Sao Lưu Toàn Diện (.JSON)</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                        Tải về máy tính một file snapshot đầy đủ chứa toàn bộ cấu hình thiệp (nhà trai/gái, ảnh bìa, danh sách bài hát, danh sách khách mời và toàn bộ lời chúc).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadFullBackup}
                      className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-amber-300" />
                      <span>Tải Về Bản Sao Lưu (.JSON)</span>
                    </button>
                  </div>

                  {/* Restore Button */}
                  <div className="p-4 bg-white rounded-xl border border-amber-200 flex flex-col justify-between space-y-3 shadow-xs">
                    <div>
                      <h4 className="font-bold text-xs text-stone-900 flex items-center gap-1.5">
                        <RotateCcw className="w-4 h-4 text-emerald-600" />
                        <span>2. Khôi Phục Hệ Thống Từ File Sao Lưu</span>
                      </h4>
                      <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                        Chọn file `.json` đã tải về trước đó để khôi phục lại 100% nguyên trạng hệ thống thiệp cưới ngay lập tức trong trường hợp có chỉnh sửa nhầm lẫn.
                      </p>
                    </div>

                    <label className="w-full py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer text-center">
                      <Upload className="w-4 h-4 text-emerald-200" />
                      <span>Chọn File .JSON Để Khôi Phục</span>
                      <input
                        type="file"
                        accept=".json,application/json"
                        onChange={handleRestoreFromFile}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. TỰ CHỌN CẤU HÌNH API RIÊNG (OPTIONAL CUSTOM CREDENTIALS) */}
              <div className="p-5 bg-white rounded-2xl border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs uppercase tracking-wider text-[#70561f] flex items-center gap-2">
                      <Key className="w-4 h-4 text-amber-600" />
                      <span>Cấu Hình Tài Khoản Đám Mây Cá Nhân (Tùy Chọn)</span>
                    </h3>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Hệ thống đã có sẵn Upstash Redis Cloud &amp; IndexedDB chạy vĩnh viễn. Nếu bạn muốn kết nối thêm tài khoản Supabase / Cloudinary cá nhân của bạn, hãy nhập thông tin bên dưới:
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-1 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Cloudinary Cloud Name:</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: my-wedding-cloud"
                        value={cloudCustomConfig.cloudinaryCloud || ''}
                        onChange={(e) => {
                          const updated = { ...cloudCustomConfig, cloudinaryCloud: e.target.value };
                          setCloudCustomConfig(updated);
                          localStorage.setItem('wedding_custom_cloud_config', JSON.stringify(updated));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Cloudinary Upload Preset (Unsigned):</label>
                      <input
                        type="text"
                        placeholder="Ví dụ: wedding_photos"
                        value={cloudCustomConfig.cloudinaryPreset || ''}
                        onChange={(e) => {
                          const updated = { ...cloudCustomConfig, cloudinaryPreset: e.target.value };
                          setCloudCustomConfig(updated);
                          localStorage.setItem('wedding_custom_cloud_config', JSON.stringify(updated));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Supabase Project URL:</label>
                      <input
                        type="text"
                        placeholder="https://xyzcompany.supabase.co"
                        value={cloudCustomConfig.supabaseUrl || ''}
                        onChange={(e) => {
                          const updated = { ...cloudCustomConfig, supabaseUrl: e.target.value };
                          setCloudCustomConfig(updated);
                          localStorage.setItem('wedding_custom_cloud_config', JSON.stringify(updated));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">Supabase Anon Key:</label>
                      <input
                        type="password"
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        value={cloudCustomConfig.supabaseKey || ''}
                        onChange={(e) => {
                          const updated = { ...cloudCustomConfig, supabaseKey: e.target.value };
                          setCloudCustomConfig(updated);
                          localStorage.setItem('wedding_custom_cloud_config', JSON.stringify(updated));
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          
          {/* TAB: XUẤT BẢN & FILE ĐỘC LẬP */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2 border-b border-stone-200 pb-3">
                <Download className="w-5 h-5 text-[#70561f]" />
                <span>Xuất Bản & Chia Sẻ File Độc Lập</span>
              </h2>

              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3">
                <h3 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Gửi File Mở Ra Xem Bình Thường (Single-file HTML)</span>
                </h3>

                <p className="text-xs text-emerald-800 leading-relaxed">
                  Tất cả các dòng chữ bạn vừa sửa sẽ được lưu vào máy và có thể xuất ra file <b>thiep-cuoi-offline.html</b> độc lập. Chỉ cần gửi file này qua Zalo/Drive, người nhận click đúp là mở ra xem được ngay!
                </p>

                <div className="pt-2 flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      const jsonStr = JSON.stringify(formData, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `du-lieu-thiep-cuoi-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-2 shadow"
                  >
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>Tải File Sao Lưu Dữ Liệu (JSON)</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          </fieldset>

          {/* TAB: PHÊ DUYỆT & PHÂN QUYỀN (SUPER ADMIN) */}
          {activeTab === 'approval' && (
            <UserApprovalManager currentUser={currentUser} />
          )}

        </main>
      </div>

      {/* RIGHT COLUMN: REAL-TIME LIVE PREVIEW (PHONE FRAME) */}
      {showPreview && (
        <div className="w-full lg:w-[410px] xl:w-[450px] 2xl:w-[480px] shrink-0 sticky top-16 self-start flex flex-col h-[calc(100vh-80px)] min-h-[640px] bg-stone-900 rounded-[38px] p-3 shadow-2xl border-4 border-stone-800">
          
          {/* Phone Header bar */}
          <div className="flex items-center justify-between pb-2 px-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                currentProfileKey === 'groom'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-rose-500 text-white'
              }`}>
                {currentProfileKey === 'groom' ? '🎩 Xem: Thiệp Nhà Trai' : '👰 Xem: Thiệp Nhà Gái'}
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold animate-pulse">● Live Sync</span>
            </div>

            <div className="flex items-center gap-1">
              {/* Envelope toggle */}
              <button
                onClick={() => {
                  const nextState = !previewEnvelopeOpen;
                  setPreviewEnvelopeOpen(nextState);
                  if (previewScrollRef.current) {
                    previewScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
                  }
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 shadow-sm ${
                  !previewEnvelopeOpen
                    ? 'bg-amber-400 text-stone-950 ring-1 ring-amber-300 font-bold'
                    : 'bg-stone-800 hover:bg-stone-700 text-amber-300'
                }`}
                title={previewEnvelopeOpen ? "Nhấn để xem Mẫu Bìa Phong Bì đang chọn" : "Nhấn để mở xem Nội dung Ruột thiệp bên trong"}
              >
                {!previewEnvelopeOpen ? (
                  <>
                    <FileText className="w-3.5 h-3.5" />
                    <span>Xem Ruột Thiệp</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Xem Bìa Phong Bì</span>
                  </>
                )}
              </button>

              {/* External Link */}
              <a
                href={`?side=${currentProfileKey}&open=1`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleSaveCurrent()}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors"
                title="Mở thiệp toàn màn hình trong tab mới"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Close Preview */}
              <button
                onClick={() => setShowPreview(false)}
                className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-rose-400 transition-colors"
                title="Ẩn khung xem trước"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Section Jump Navigation */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 px-1 text-[10px] text-stone-300 border-t border-stone-800 scrollbar-none mb-1.5">
            <span className="text-stone-500 shrink-0 font-medium mr-0.5">Cuộn đến:</span>
            <button
              onClick={() => scrollToSection('#card-banner')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Đầu trang
            </button>
            <button
              onClick={() => scrollToSection('#card-info')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Sự Kiện
            </button>
            <button
              onClick={() => scrollToSection('#card-calendar')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Lịch
            </button>
            <button
              onClick={() => scrollToSection('#card-timelines')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Timeline
            </button>
            <button
              onClick={() => scrollToSection('#card-album')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Album
            </button>
            <button
              onClick={() => scrollToSection('#card-gift')}
              className="px-2 py-0.5 rounded-md bg-stone-800 hover:bg-amber-600 hover:text-white shrink-0 transition-colors"
            >
              Mừng Cưới
            </button>
          </div>

          {/* Phone Screen Container with Real-time GuestView */}
          <div ref={previewScrollRef} className="flex-1 overflow-y-auto overflow-x-hidden rounded-[28px] bg-[#252525] relative scroll-smooth border border-stone-800 shadow-inner">
            <GuestView
              data={{ ...formData, profileType: currentProfileKey }}
              activeProfileKey={currentProfileKey}
              isPreview={true}
              initialEnvelopeOpen={previewEnvelopeOpen}
              onEnvelopeToggle={(isOpen) => setPreviewEnvelopeOpen(isOpen)}
              onStyleChange={(style) => {
                setFormData(p => ({
                  ...p,
                  templateStyle: style,
                  coverConfig: {
                    ...(p.coverConfig || {}),
                    activeStyle: style
                  }
                }));
                setEditingCoverTab(style);
              }}
              testAnimationTrigger={testAnimationCount}
              testPhotoAnimTrigger={testPhotoAnimCount}
              testTextAnimTrigger={testTextAnimCount}
              onUpdateData={(updated) => {
                setFormData(updated);
                if (updated.gallery) {
                  updateMediaField('gallery', updated.gallery);
                }
              }}
              onReorderGallery={(newGallery) => {
                updateMediaField('gallery', newGallery);
              }}
              onAddWish={(newWish) => {
                const enriched = {
                  id: 'wish-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
                  side: currentProfileKey,
                  sideLabel: currentProfileKey === 'bride' ? 'Nhà Gái' : 'Nhà Trai',
                  createdAt: 'Vừa xong',
                  timestamp: Date.now(),
                  ...newWish
                };
                handleSaveUnifiedWishes([enriched, ...allUniqueWishes]);
              }}
            />
          </div>
        </div>
      )}
    </div>

    {/* MODAL: SAO CHÉP DỮ LIỆU SANG MẪU THIỆP KIA */}
    {showCopyModal && (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="font-serif-elegant font-bold text-lg text-stone-900 flex items-center gap-2">
              <Copy className="w-5 h-5 text-[#70561f]" />
              <span>Sao Chép Sang {currentProfileKey === 'groom' ? 'Thiệp Nhà Gái (Mẫu 2)' : 'Thiệp Nhà Trai (Mẫu 1)'}</span>
            </h3>
            <button
              onClick={() => setShowCopyModal(false)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-stone-600 my-4 leading-relaxed">
            Bạn đang chỉnh sửa <b>{currentProfileKey === 'groom' ? 'Mẫu 1: Thiệp Nhà Trai' : 'Mẫu 2: Thiệp Nhà Gái'}</b>. Hãy chọn thông tin bạn muốn sao chép sang mẫu thiệp còn lại để không phải nhập lại từ đầu:
          </p>

          <div className="space-y-3">
            <button
              onClick={() => handleCopyData('all')}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-stone-200 hover:border-[#70561f] hover:bg-amber-50/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900 group-hover:text-[#70561f]">
                  1. Sao chép toàn bộ thông tin
                </span>
                <ArrowRightLeft className="w-4 h-4 text-stone-400 group-hover:text-[#70561f]" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Sao chép toàn bộ nội dung, ảnh, nhạc. Sau đó bạn chỉ việc đổi lại địa chỉ và tiêu đề sự kiện riêng.
              </p>
            </button>

            <button
              onClick={() => handleCopyData('media')}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-stone-200 hover:border-[#70561f] hover:bg-amber-50/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900 group-hover:text-[#70561f]">
                  2. Chỉ sao chép Album ảnh & Nhạc nền
                </span>
                <Camera className="w-4 h-4 text-stone-400 group-hover:text-[#70561f]" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Giữ nguyên thông tin lễ cưới của mẫu kia, chỉ đồng bộ toàn bộ ảnh cưới và bài hát MP3.
              </p>
            </button>

            <button
              onClick={() => handleCopyData('couple')}
              className="w-full text-left p-3.5 rounded-2xl border-2 border-stone-200 hover:border-[#70561f] hover:bg-amber-50/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900 group-hover:text-[#70561f]">
                  3. Chỉ sao chép Thông tin cặp đôi & Gia đình
                </span>
                <Heart className="w-4 h-4 text-stone-400 group-hover:text-[#70561f]" />
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Đồng bộ tên, ảnh chân dung cô dâu chú rể và thông tin phụ mẫu hai bên gia đình.
              </p>
            </button>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() => setShowCopyModal(false)}
              className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )}

    {/* POP-UP NHỎ GỌN THÔNG BÁO ĐÃ LƯU (KHÔNG CHE MÀN HÌNH) */}
    {saveStatus && (
      <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none transition-all animate-bounce-in drop-shadow-xl">
        <div className="bg-stone-900/92 text-white backdrop-blur-md px-4 py-2 rounded-full border border-emerald-500/50 shadow-2xl flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </span>
          <span className="text-xs font-semibold text-stone-100 whitespace-nowrap">
            {saveStatus}
          </span>
        </div>
      </div>
    )}

    {/* PREVIEW WEDDING GIFT MODAL */}
    <WeddingGiftModal
      isOpen={previewGiftModal}
      onClose={() => setPreviewGiftModal(false)}
      banking={formData.banking}
      groom={formData.groom}
      bride={formData.bride}
    />

  </div>
  );
}
