import React, { useState, useEffect } from 'react';
import { ShieldCheck, Mail, Lock, UserCheck, AlertCircle, Clock, ArrowRight, ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'hoangdinhhieu1410@gmail.com';

export function StudioAuthModal({ onAuthenticated, onCancelToGuest }) {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingUser, setPendingUser] = useState(null);
  const [isBlocked, setIsBlocked] = useState(false);

  // Check if a saved session already exists or if we should check pending status
  useEffect(() => {
    try {
      const savedUserStr = localStorage.getItem('wedding_auth_user');
      if (savedUserStr) {
        const savedUser = JSON.parse(savedUserStr);
        if (savedUser?.email) {
          // Verify with cloud
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
        // User not found or deleted from Redis
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

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMsg('Địa chỉ email không đúng định dạng');
      return;
    }

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
          name: nameInput.trim() || (cleanEmail === SUPER_ADMIN_EMAIL ? 'Hoàng Đình Hiếu' : cleanEmail.split('@')[0])
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
  };

  const handleQuickSuperAdmin = () => {
    setEmailInput(SUPER_ADMIN_EMAIL);
    setNameInput('Hoàng Đình Hiếu');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-stone-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative">
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#5a4417] via-[#70561f] to-[#8c111e] p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-6 -mt-6 w-28 h-28 rounded-full bg-white/10 blur-xl"></div>
          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner border border-white/30">
            <ShieldCheck className="w-8 h-8 text-amber-200" />
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-elegant font-bold tracking-wide">
            Studio Quản Trị & Thiết Kế Thiệp
          </h2>
          <p className="text-amber-100/90 text-xs mt-1">
            Hệ thống phân quyền & Bảo mật đăng nhập Gmail
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* PENDING APPROVAL SCREEN */}
          {pendingUser && !isBlocked && (
            <div className="bg-amber-50/80 border border-amber-300 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-700 animate-spin" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">
                    Đang Chờ Phê Duyệt Truy Cập
                  </h3>
                  <p className="text-xs text-amber-800">
                    Tài khoản của bạn đã được gửi yêu cầu tới Super Admin.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-amber-200 text-xs space-y-1.5">
                <div className="flex justify-between text-stone-600">
                  <span>Tài khoản:</span>
                  <span className="font-semibold text-stone-900">{pendingUser.email}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Trạng thái:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                    Chờ duyệt quyền (Chỉ xem / Chỉnh sửa)
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Người phê duyệt:</span>
                  <span className="font-semibold text-stone-800">Hoàng Đình Hiếu (Super Admin)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => verifyUserStatus(pendingUser.email)}
                  className="flex-1 py-2.5 px-4 bg-[#70561f] hover:bg-[#5a4417] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Kiểm tra lại phê duyệt</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingUser(null);
                    localStorage.removeItem('wedding_auth_user');
                  }}
                  className="py-2.5 px-4 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Đổi tài khoản khác
                </button>
              </div>
            </div>
          )}

          {/* BLOCKED / DELETED SCREEN */}
          {isBlocked && (
            <div className="bg-rose-50 border border-rose-300 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-rose-700" />
                </div>
                <div>
                  <h3 className="font-bold text-rose-900 text-sm">
                    Truy Cập Bị Từ Chối
                  </h3>
                  <p className="text-xs text-rose-700">
                    Tài khoản email này đã bị từ chối hoặc xóa khỏi hệ thống. Bạn không có quyền truy cập vào Vercel Studio.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsBlocked(false);
                  localStorage.removeItem('wedding_auth_user');
                }}
                className="w-full py-2.5 px-4 bg-rose-800 hover:bg-rose-900 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Đăng nhập bằng tài khoản khác
              </button>
            </div>
          )}

          {/* LOGIN FORM (Shown when not pending and not blocked) */}
          {!pendingUser && !isBlocked && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Super Admin Quick Pill */}
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <span className="text-amber-600 font-bold">👑 Super Admin:</span>
                  <span className="font-mono font-semibold text-[11px]">{SUPER_ADMIN_EMAIL}</span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickSuperAdmin}
                  className="px-2.5 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Chọn nhanh
                </button>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Địa chỉ Gmail của bạn:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="ví dụ: hoangdinhhieu1410@gmail.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#70561f] focus:border-transparent text-sm transition-all bg-stone-50/50"
                  />
                </div>
              </div>

              {/* Full Name Input (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Họ và tên hiển thị (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Hoàng Đình Hiếu"
                  className="w-full px-4 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#70561f] focus:border-transparent text-sm transition-all bg-stone-50/50"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Đang kiểm tra quyền truy cập...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-amber-300" />
                    <span>Đăng Nhập Vào Hệ Thống</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Role explanation */}
              <div className="pt-2 border-t border-stone-200 text-[11px] text-stone-500 space-y-1">
                <div className="flex items-center gap-1.5 text-stone-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quy định phân quyền truy cập:</span>
                </div>
                <p>• <strong>Super Admin ({SUPER_ADMIN_EMAIL}):</strong> Toàn quyền cao nhất điều chỉnh toàn bộ hệ thống & phê duyệt tài khoản.</p>
                <p>• <strong>Tài khoản khác:</strong> Cần được Super Admin phê duyệt với quyền <em>Chỉ xem</em> hoặc <em>Chỉnh sửa</em> mới được vào.</p>
              </div>
            </form>
          )}

          {/* Link back to Guest Card */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onCancelToGuest}
              className="inline-flex items-center gap-1.5 text-xs text-[#70561f] hover:text-[#5a4417] font-semibold hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại xem thiệp cưới (Dành cho khách mời • Không cần đăng nhập)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudioAuthModal;
