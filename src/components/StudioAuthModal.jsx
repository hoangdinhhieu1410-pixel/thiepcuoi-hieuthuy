import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, Mail, Lock, UserCheck, AlertCircle, Clock, ArrowRight, ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'hoangdinhhieu1410@gmail.com';
const GOOGLE_CLIENT_ID = '305909808631-hgd2ju2ktrhvik9vp1juue67ld749abu.apps.googleusercontent.com';

export function StudioAuthModal({ onAuthenticated, onCancelToGuest }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showManualLogin, setShowManualLogin] = useState(false);

  // Check if a saved session already exists
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('wedding_auth_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.email) {
          verifyUserStatus(savedUser.email);
        }
      }
    } catch (e) {
      console.warn('Session parse error:', e);
    }
  }, []);

  const verifyUserStatus = async (email) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/auth-users?email=${encodeURIComponent(email)}&requester=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.user) {
        if (data.user.status === 'approved') {
          localStorage.setItem('wedding_auth_user', JSON.stringify(data.user));
          onAuthenticated(data.user, data.allUsers || []);
          return;
        } else if (data.user.status === 'pending') {
          setPendingUser(data.user);
        } else if (data.user.status === 'blocked') {
          setIsBlocked(true);
          localStorage.removeItem('wedding_auth_user');
        }
      } else {
        localStorage.removeItem('wedding_auth_user');
        if (pendingUser) {
          setErrorMsg('Tài khoản đã bị xóa khỏi hệ thống.');
          setPendingUser(null);
        }
      }
    } catch (err) {
      console.error('Verify user status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit login to API
  const submitLogin = useCallback(async (emailAddr, displayName, pictureUrl, credentialToken) => {
    const cleanEmail = emailAddr.trim().toLowerCase();
    setIsLoading(true);
    setErrorMsg('');
    setIsBlocked(false);

    try {
      const res = await fetch('/api/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          email: cleanEmail,
          name: displayName || (cleanEmail === SUPER_ADMIN_EMAIL ? 'Hoàng Đình Hiếu' : cleanEmail.split('@')[0]),
          picture: pictureUrl || null,
          token: credentialToken || null
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.blocked) {
          setIsBlocked(true);
        } else {
          setErrorMsg(data.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
        }
        return;
      }

      const user = data.user;
      if (user.status === 'approved') {
        localStorage.setItem('wedding_auth_user', JSON.stringify(user));
        onAuthenticated(user, data.allUsers || []);
      } else if (user.status === 'pending') {
        setPendingUser(user);
        localStorage.setItem('wedding_auth_user', JSON.stringify(user));
      }
    } catch (err) {
      console.error('Login submit error:', err);
      setErrorMsg('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticated]);

  const submitLoginRef = useRef(submitLogin);
  submitLoginRef.current = submitLogin;

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const setupGoogle = () => {
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: (response) => {
              try {
                if (!response || !response.credential) {
                  setErrorMsg('Google không trả về thông tin xác thực.');
                  return;
                }
                // JWT base64url decode
                const base64Url = response.credential.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
                const jsonPayload = decodeURIComponent(
                  atob(padded)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
                );
                const payload = JSON.parse(jsonPayload);
                const googleEmail = payload.email?.toLowerCase().trim();
                const googleName = payload.name;
                const googlePicture = payload.picture;

                if (!googleEmail) {
                  setErrorMsg('Không thể lấy email từ tài khoản Google.');
                  return;
                }

                submitLoginRef.current(googleEmail, googleName, googlePicture, response.credential);
              } catch (err) {
                console.error('[Google GIS] Decode error:', err);
                setErrorMsg('Lỗi giải mã token Google. Vui lòng thử lại.');
              }
            },
            itp_support: true,
            use_fedcm_for_prompt: false,
          });

          // Render official Google button exactly like in user's screenshot
          const btnElem = document.getElementById('google-signin-btn');
          if (btnElem) {
            btnElem.innerHTML = '';
            window.google.accounts.id.renderButton(btnElem, {
              theme: 'outline',
              size: 'large',
              width: 350,
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
            });
          }

          // Optional Google One-Tap prompt
          try {
            window.google.accounts.id.prompt();
          } catch (e) {}
        } catch (e) {
          console.warn('GIS initialize warning:', e);
        }
      }
    };

    if (window.google?.accounts?.id) {
      setupGoogle();
    } else {
      let script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
      script.addEventListener('load', setupGoogle);
    }
  }, []);

  const handleManualLogin = (e) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail');
      return;
    }
    submitLogin(cleanEmail, nameInput);
  };

  const handleQuickSuperAdmin = () => {
    submitLogin(SUPER_ADMIN_EMAIL, 'Hoàng Đình Hiếu');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0c101c]/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans">
      <div className="w-full max-w-[450px]">
        {/* App Branding (matching user's screenshot) */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-3.5 rounded-2xl bg-gradient-to-br from-[#1DD1C4] via-[#33DECF] to-teal-500 flex items-center justify-center text-3xl shadow-xl shadow-teal-500/20 ring-1 ring-white/20">
            📊
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Dashboard B2B
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-1">
            Studio Thiệp Cưới — Quản lý vận hành &amp; Thiết kế
          </p>
        </div>

        {/* PENDING APPROVAL SCREEN (Exact format from user's Dashboard) */}
        {pendingUser && !isBlocked && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-7 sm:p-8 shadow-2xl text-center space-y-5 animate-fade-in">
            <div className="text-5xl animate-pulse">⏳</div>
            <div>
              <h2 className="text-lg font-bold text-white mb-2">
                Đang chờ phê duyệt quyền truy cập
              </h2>
              <div className="inline-block bg-white/10 px-3 py-1 rounded-full text-xs font-mono text-[#33DECF] font-semibold mb-3">
                {pendingUser.email}
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                Tài khoản của bạn đã được ghi nhận vào hệ thống.
                <br /><br />
                Vui lòng liên hệ Super Admin <strong className="text-[#33DECF]">hoangdinhhieu1410@gmail.com</strong> để kích hoạt tài khoản của bạn.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => verifyUserStatus(pendingUser.email)}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#1DD1C4] to-[#33DECF] hover:opacity-95 text-stone-950 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Kiểm tra lại trạng thái</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPendingUser(null);
                  localStorage.removeItem('wedding_auth_user');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 text-xs font-medium transition-all cursor-pointer"
              >
                Đổi tài khoản khác
              </button>
            </div>
          </div>
        )}

        {/* BLOCKED / DELETED SCREEN */}
        {isBlocked && (
          <div className="bg-white/5 backdrop-blur-xl border border-rose-500/30 rounded-[24px] p-7 sm:p-8 shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="text-5xl text-rose-500">🚫</div>
            <div>
              <h2 className="text-lg font-bold text-white mb-1">
                Truy cập bị từ chối
              </h2>
              <p className="text-xs text-white/60">
                Tài khoản này đã bị xóa hoặc từ chối khỏi hệ thống.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBlocked(false);
                localStorage.removeItem('wedding_auth_user');
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer"
            >
              Đăng nhập bằng tài khoản khác
            </button>
          </div>
        )}

        {/* MAIN LOGIN CARD (Exact 1:1 match with user's Image 1 & Image 2) */}
        {!pendingUser && !isBlocked && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[24px] p-7 sm:p-9 shadow-2xl space-y-6">
            {/* Header in Card */}
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5 tracking-tight">
                Chọn tài khoản để đăng nhập
              </h2>
              <p className="text-xs text-white/50">
                Đăng nhập bằng tài khoản Google của bạn
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Sign-In Button Container */}
            <div className="flex flex-col items-center justify-center min-h-[44px]">
              <div id="google-signin-btn" className="flex justify-center w-full" />
            </div>

            {/* Quick Super Admin Instant Pill */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-400 font-bold">👑 Super Admin:</span>
                <span className="font-mono text-white/80 text-[11px] truncate max-w-[170px] sm:max-w-[190px]">
                  {SUPER_ADMIN_EMAIL}
                </span>
              </div>
              <button
                type="button"
                disabled={isLoading}
                onClick={handleQuickSuperAdmin}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                Vào Ngay
              </button>
            </div>

            {/* Lock notice at bottom of card (Exact text from user's image) */}
            <div className="text-xs text-white/40 flex items-center justify-center gap-1.5 text-center px-2">
              <Lock className="w-3.5 h-3.5 text-amber-400/70 flex-shrink-0" />
              <span>Đăng nhập cần được Quản trị viên phê duyệt trước khi truy cập được dữ liệu.</span>
            </div>

            {/* Toggle manual login */}
            <div className="pt-2 border-t border-white/10 text-center">
              <button
                type="button"
                onClick={() => setShowManualLogin(!showManualLogin)}
                className="text-[11px] text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                {showManualLogin ? '▲ Thu gọn đăng nhập thủ công' : '▼ Nhập địa chỉ Gmail khác thủ công'}
              </button>
            </div>

            {/* Manual Gmail Input (Expandable) */}
            {showManualLogin && (
              <form onSubmit={handleManualLogin} className="space-y-3 pt-1 animate-fade-in">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Nhập địa chỉ Gmail..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white placeholder-white/30 text-xs focus:ring-2 focus:ring-[#33DECF] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Xác nhận đăng nhập với Gmail này</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* Back to Guest Link */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={onCancelToGuest}
            className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors cursor-pointer hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại xem thiệp cưới (Dành cho khách mời • Không cần đăng nhập)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudioAuthModal;
