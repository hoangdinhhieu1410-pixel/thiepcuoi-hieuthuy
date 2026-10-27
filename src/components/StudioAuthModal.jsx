import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, AlertCircle, Clock, ArrowLeft, RefreshCw, Sparkles, Heart } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'hoangdinhhieu1410@gmail.com';
const GOOGLE_CLIENT_ID = '305909808631-hgd2ju2ktrhvik9vp1juue67ld749abu.apps.googleusercontent.com';

export function StudioAuthModal({ onAuthenticated, onCancelToGuest }) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

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

          // Render official Google button
          const btnElem = document.getElementById('google-signin-btn');
          if (btnElem) {
            btnElem.innerHTML = '';
            window.google.accounts.id.renderButton(btnElem, {
              theme: 'outline',
              size: 'large',
              width: 340,
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

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#fcf9f2] via-[#f7f0e4] to-[#f4e8dc] flex items-center justify-center p-4 overflow-y-auto animate-fade-in font-sans relative">
      {/* Decorative colorful ambient glows */}
      <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-rose-300/30 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-1/4 w-80 h-80 rounded-full bg-amber-300/35 blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-10 w-60 h-60 rounded-full bg-orange-300/25 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-[460px] relative z-10">
        {/* App Branding: Colorful, fresh & elegant wedding theme */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-18 sm:h-18 mx-auto mb-3.5 rounded-3xl bg-gradient-to-tr from-rose-500 via-amber-400 to-pink-500 p-0.5 shadow-xl shadow-rose-500/25 ring-4 ring-white">
            <div className="w-full h-full rounded-[22px] bg-white flex items-center justify-center text-3xl sm:text-4xl shadow-inner">
              💍
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif-elegant font-bold text-stone-900 tracking-tight flex items-center justify-center gap-2">
            <span>Studio Thiết Kế Thiệp Cưới</span>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </h1>
          <p className="text-xs sm:text-sm text-[#70561f] font-medium mt-1">
            Đình Hiếu ♥ Thanh Thúy — Quản Trị Hệ Thống
          </p>
        </div>

        {/* PENDING APPROVAL SCREEN (Fresh light theme) */}
        {pendingUser && !isBlocked && (
          <div className="bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-[32px] p-7 sm:p-9 shadow-2xl shadow-stone-300/50 text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center text-3xl text-amber-600 animate-bounce">
              ⏳
            </div>
            <div>
              <h2 className="text-lg font-serif-elegant font-bold text-stone-900 mb-1.5">
                Đang chờ phê duyệt quyền truy cập
              </h2>
              <div className="inline-block bg-amber-50 border border-amber-200 px-3.5 py-1 rounded-full text-xs font-mono text-amber-900 font-semibold mb-3">
                {pendingUser.email}
              </div>
              <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
                Tài khoản của bạn đã được ghi nhận. Vui lòng liên hệ Super Admin <strong className="text-[#70561f] font-semibold">{SUPER_ADMIN_EMAIL}</strong> để kích hoạt quyền truy cập.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => verifyUserStatus(pendingUser.email)}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-[#70561f] to-amber-600 hover:from-[#5a4417] hover:to-amber-700 text-white font-bold text-xs shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
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
                className="w-full py-2.5 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Đổi tài khoản khác
              </button>
            </div>
          </div>
        )}

        {/* BLOCKED / DELETED SCREEN (Light theme) */}
        {isBlocked && (
          <div className="bg-white/95 backdrop-blur-2xl border border-rose-300 rounded-[32px] p-7 sm:p-9 shadow-2xl text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 text-3xl flex items-center justify-center">
              🚫
            </div>
            <div>
              <h2 className="text-lg font-serif-elegant font-bold text-rose-900 mb-1">
                Truy cập bị từ chối
              </h2>
              <p className="text-xs text-stone-600">
                Tài khoản này đã bị xóa hoặc từ chối khỏi hệ thống.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsBlocked(false);
                localStorage.removeItem('wedding_auth_user');
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all cursor-pointer shadow-md"
            >
              Đăng nhập bằng tài khoản khác
            </button>
          </div>
        )}

        {/* MAIN LOGIN CARD: Bright, clean, luxury white with colorful accents */}
        {!pendingUser && !isBlocked && (
          <div className="bg-white/95 backdrop-blur-2xl border border-stone-200/90 rounded-[32px] p-7 sm:p-9 shadow-2xl shadow-stone-300/40 space-y-6">
            {/* Header in Card */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-serif-elegant font-bold text-stone-900 tracking-tight">
                Chọn tài khoản để đăng nhập
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                Đăng nhập bằng tài khoản Google của bạn
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Google Sign-In Button Container (Center) */}
            <div className="flex flex-col items-center justify-center min-h-[46px] my-2">
              <div id="google-signin-btn" className="flex justify-center w-full" />
            </div>

            {/* Lock notice at bottom of card */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-[11px] sm:text-xs text-amber-900 flex items-center justify-center gap-2 text-center">
              <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>Đăng nhập cần được Quản trị viên phê duyệt trước khi truy cập được dữ liệu.</span>
            </div>
          </div>
        )}

        {/* Back to Guest Link */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onCancelToGuest}
            className="inline-flex items-center gap-1.5 text-xs text-[#70561f] hover:text-[#5a4417] font-semibold transition-colors cursor-pointer hover:underline"
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
