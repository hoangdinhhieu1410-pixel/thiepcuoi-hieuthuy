import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Users, UserCheck, UserX, Clock, Trash2, Edit3, Eye,
  CheckCircle, AlertCircle, Plus, RefreshCw, Key, Shield, Check, X
} from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'hoangdinhhieu1410@gmail.com';

export function UserApprovalManager({ currentUser }) {
  const [usersList, setUsersList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [notification, setNotification] = useState(null);

  // Proactive add user form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('editor'); // default to editor or viewer

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/auth-users?email=${encodeURIComponent(SUPER_ADMIN_EMAIL)}&requester=${encodeURIComponent(SUPER_ADMIN_EMAIL)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.allUsers)) {
        setUsersList(data.allUsers);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
      showToast('Lỗi khi tải danh sách người dùng', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Auto refresh every 10 seconds to detect new pending approval requests
    const interval = setInterval(fetchUsers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Approve user
  const handleApprove = async (targetEmail, role) => {
    setActionLoading(`approve-${targetEmail}`);
    try {
      const res = await fetch('/api/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requesterEmail: SUPER_ADMIN_EMAIL,
          targetEmail,
          role
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã phê duyệt ${targetEmail} với quyền ${role === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}`);
        if (data.allUsers) setUsersList(data.allUsers);
        else fetchUsers();
      } else {
        showToast(data.error || 'Phê duyệt thất bại', 'error');
      }
    } catch (err) {
      console.error('Approve error:', err);
      showToast('Lỗi khi phê duyệt tài khoản', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Change Role
  const handleChangeRole = async (targetEmail, newRole) => {
    setActionLoading(`role-${targetEmail}`);
    try {
      const res = await fetch('/api/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'change_role',
          requesterEmail: SUPER_ADMIN_EMAIL,
          targetEmail,
          role: newRole
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã đổi quyền của ${targetEmail} thành ${newRole === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}`);
        if (data.allUsers) setUsersList(data.allUsers);
        else fetchUsers();
      } else {
        showToast(data.error || 'Cập nhật quyền thất bại', 'error');
      }
    } catch (err) {
      console.error('Change role error:', err);
      showToast('Lỗi kết nối khi cập nhật quyền', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle Delete User (Revoke Access Completely)
  const handleDeleteUser = async (targetEmail) => {
    if (targetEmail === SUPER_ADMIN_EMAIL) {
      showToast('Không thể xóa tài khoản Super Admin!', 'error');
      return;
    }

    const confirm = window.confirm(
      `XÁC NHẬN XÓA EMAIL KHỎI HỆ THỐNG:\n\n` +
      `Bạn có chắc chắn muốn xóa email [${targetEmail}] khỏi ứng dụng?\n\n` +
      `Tài khoản này sẽ ngay lập tức bị ngắt kết nối và không thể đăng nhập vào Vercel!`
    );

    if (!confirm) return;

    setActionLoading(`delete-${targetEmail}`);
    try {
      const res = await fetch('/api/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          requesterEmail: SUPER_ADMIN_EMAIL,
          targetEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `Đã xóa hoàn toàn email ${targetEmail} khỏi hệ thống!`);
        if (data.allUsers) setUsersList(data.allUsers);
        else fetchUsers();
      } else {
        showToast(data.error || 'Xóa email thất bại', 'error');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      showToast('Lỗi kết nối khi xóa tài khoản', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // Proactive Add / Pre-approve Form Submit
  const handleAddNewUser = async (e) => {
    e.preventDefault();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Vui lòng nhập địa chỉ email hợp lệ', 'error');
      return;
    }

    setActionLoading('add-new');
    try {
      const res = await fetch('/api/auth-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          requesterEmail: SUPER_ADMIN_EMAIL,
          targetEmail: cleanEmail,
          name: newName.trim() || cleanEmail.split('@')[0],
          role: newRole
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã cấp quyền sẵn cho email ${cleanEmail} với quyền "${newRole === 'editor' ? 'Chỉnh sửa' : 'Chỉ xem'}"`);
        setNewEmail('');
        setNewName('');
        if (data.allUsers) setUsersList(data.allUsers);
        else fetchUsers();
      } else {
        showToast(data.error || 'Cấp quyền thất bại', 'error');
      }
    } catch (err) {
      console.error('Add user error:', err);
      showToast('Lỗi kết nối khi thêm tài khoản', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingUsers = usersList.filter(u => u.status === 'pending');
  const approvedUsers = usersList.filter(u => u.status === 'approved');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-[10000] px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs font-semibold animate-fade-in ${
          notification.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-800'
            : 'bg-emerald-50 border-emerald-300 text-emerald-800'
        }`}>
          {notification.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#70561f] to-amber-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif-elegant font-bold text-stone-900 flex items-center gap-2">
                <span>Phê Duyệt & Quản Lý Phân Quyền</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-sans font-bold">
                  Super Admin
                </span>
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Duyệt đăng nhập Gmail vào Vercel • Phân quyền Chỉ xem / Chỉnh sửa • Xóa email thu hồi truy cập
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-700' : 'text-stone-500'}`} />
          <span>Làm mới danh sách</span>
        </button>
      </div>

      {/* Super Admin Status Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#70561f] to-amber-700 flex items-center justify-center text-white text-xl shadow-md flex-shrink-0">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-900 text-sm sm:text-base">Hoàng Đình Hiếu</span>
              <span className="px-2 py-0.5 rounded-full bg-[#70561f] text-amber-100 text-[10px] font-bold">
                Super Admin Tối Cao
              </span>
            </div>
            <p className="font-mono text-xs text-[#70561f] font-semibold mt-0.5">
              {SUPER_ADMIN_EMAIL}
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Tài khoản nắm quyền cao nhất điều chỉnh toàn bộ hệ thống, tự động phê duyệt vĩnh viễn và không thể bị thu hồi.
            </p>
          </div>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="bg-white/80 border border-stone-200 px-3 py-2 rounded-xl text-center min-w-[75px]">
            <div className="text-xs text-stone-500 font-medium">Tổng số</div>
            <div className="text-lg font-bold text-stone-900">{usersList.length}</div>
          </div>
          <div className="bg-amber-100/70 border border-amber-300 px-3 py-2 rounded-xl text-center min-w-[75px]">
            <div className="text-xs text-amber-800 font-medium">Chờ duyệt</div>
            <div className="text-lg font-bold text-amber-900">{pendingUsers.length}</div>
          </div>
          <div className="bg-emerald-100/70 border border-emerald-300 px-3 py-2 rounded-xl text-center min-w-[75px]">
            <div className="text-xs text-emerald-800 font-medium">Đã duyệt</div>
            <div className="text-lg font-bold text-emerald-900">{approvedUsers.length}</div>
          </div>
        </div>
      </div>

      {/* SECTION 1: PENDING REQUESTS (YÊU CẦU CHỜ PHÊ DUYỆT) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Yêu Cầu Đăng Nhập Đang Chờ Phê Duyệt</span>
            {pendingUsers.length > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
            )}
          </h3>
          <span className="text-xs text-stone-500">
            {pendingUsers.length} yêu cầu
          </span>
        </div>

        {pendingUsers.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200 text-center text-xs text-stone-500">
            Hiện tại không có tài khoản nào đang chờ phê duyệt. Khi có Gmail đăng nhập vào Vercel, yêu cầu sẽ hiển thị tại đây.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {pendingUsers.map((user) => {
              const isProcessing = actionLoading?.includes(user.email);
              return (
                <div
                  key={user.email}
                  className="bg-white border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                      {user.email.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{user.name || user.email}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Chờ duyệt
                        </span>
                      </div>
                      <div className="text-xs font-mono text-stone-600 mt-0.5">{user.email}</div>
                      <div className="text-[10px] text-stone-400 mt-1">
                        Yêu cầu lúc: {new Date(user.requestedAt || user.lastLoginAt || Date.now()).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Approve as Viewer */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(user.email, 'viewer')}
                      className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      title="Chỉ cho phép tài khoản này xem thông tin thiệp, không được lưu"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>Duyệt: Chỉ Xem</span>
                    </button>

                    {/* Approve as Editor */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(user.email, 'editor')}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-50"
                      title="Cho phép tài khoản này chỉnh sửa và lưu thông tin thiệp cưới"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-200" />
                      <span>Duyệt: Chỉnh Sửa</span>
                    </button>

                    {/* Reject / Delete */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDeleteUser(user.email)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                      title="Từ chối yêu cầu và xóa email khỏi hệ thống"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Từ chối</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: APPROVED USERS LIST (DANH SÁCH TÀI KHOẢN ĐÃ PHÊ DUYỆT & PHÂN QUYỀN) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-stone-800 text-sm flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Danh Sách Tài Khoản Đã Phê Duyệt & Phân Quyền</span>
          </h3>
          <span className="text-xs text-stone-500">
            {approvedUsers.length} tài khoản hợp lệ
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                <tr>
                  <th className="p-3 sm:p-4">Tài khoản & Email</th>
                  <th className="p-3 sm:p-4">Loại phân quyền</th>
                  <th className="p-3 sm:p-4">Trạng thái</th>
                  <th className="p-3 sm:p-4 text-right">Thao tác & Xóa Email</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {approvedUsers.map((user) => {
                  const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
                  const isEditor = user.role === 'editor';
                  const isViewer = user.role === 'viewer';
                  const isProcessing = actionLoading?.includes(user.email);

                  return (
                    <tr key={user.email} className="hover:bg-stone-50/70 transition-colors">
                      {/* User Info */}
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                            isSuperAdmin
                              ? 'bg-amber-100 text-[#70561f] border border-amber-300'
                              : isEditor
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {isSuperAdmin ? '👑' : user.email.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-stone-900 flex items-center gap-1.5">
                              <span>{user.name || user.email}</span>
                              {isSuperAdmin && (
                                <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-1.5 py-0.2 rounded-md">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-stone-500 text-[11px]">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Pill & Switcher */}
                      <td className="p-3 sm:p-4">
                        {isSuperAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-[#70561f] border border-amber-300">
                            👑 Toàn quyền hệ thống
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                              isEditor
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                            }`}>
                              {isEditor ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              <span>{isEditor ? 'Chỉnh sửa' : 'Chỉ xem'}</span>
                            </span>

                            {/* Quick Switch role button */}
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleChangeRole(user.email, isEditor ? 'viewer' : 'editor')}
                              className="px-2 py-0.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-[10px] font-semibold transition-colors cursor-pointer border border-stone-200"
                              title={`Chuyển sang quyền ${isEditor ? 'Chỉ xem' : 'Chỉnh sửa'}`}
                            >
                              Đổi sang: {isEditor ? 'Chỉ xem' : 'Chỉnh sửa'}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3 sm:p-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Đã cho phép</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 sm:p-4 text-right">
                        {isSuperAdmin ? (
                          <span className="text-[11px] text-stone-400 italic">
                            Tài khoản vĩnh viễn
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleDeleteUser(user.email)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                            title="Xóa email khỏi app: Người này sẽ lập tức không đăng nhập được vào Vercel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Xóa Email</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: PROACTIVELY PRE-APPROVE / ADD EMAIL IN ADVANCE */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4">
        <div>
          <h4 className="font-bold text-stone-800 text-sm flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#70561f]" />
            <span>Cấp Quyền Trước Cho Địa Chỉ Gmail</span>
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Bạn có thể thêm trước địa chỉ Gmail của người thân / cộng sự tại đây để khi họ mở link Vercel và đăng nhập là được vào ngay.
          </p>
        </div>

        <form onSubmit={handleAddNewUser} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Địa chỉ Gmail:</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="ví dụ: nguothan@gmail.com"
              required
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-[#70561f] focus:outline-none bg-white"
            />
          </div>

          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Tên hiển thị:</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ví dụ: Em gái Thúy"
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-[#70561f] focus:outline-none bg-white"
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-[11px] font-semibold text-stone-700">Phân quyền:</label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-[#70561f] focus:outline-none bg-white font-semibold"
            >
              <option value="editor">Chỉnh sửa</option>
              <option value="viewer">Chỉ xem</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={actionLoading === 'add-new'}
              className="w-full py-2 px-3 rounded-xl bg-[#70561f] hover:bg-[#5a4417] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Email</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserApprovalManager;
