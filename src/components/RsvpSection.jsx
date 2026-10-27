import React, { useState } from 'react';
import { MessageSquareHeart, Send, Heart, UserCheck, Users, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export function RsvpSection({ wishes = [], onAddWish, groom, bride }) {
  const [formData, setFormData] = useState({
    name: '',
    relationship: 'Bạn bè',
    attending: 'yes',
    guestCount: '1',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.message.trim()) return;

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newWish = {
      id: 'wish-' + Date.now(),
      name: formData.name.trim(),
      relationship: formData.relationship + (formData.attending === 'yes' ? ` (Tham dự ${formData.guestCount} người)` : ' (Gửi lời chúc từ xa)'),
      message: formData.message.trim(),
      createdAt: formattedDate,
      timestamp: Date.now()
    };

    onAddWish(newWish);
    setSubmitted(true);

    // Trigger sweet confetti effect
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#be123c', '#fb7185', '#fbbf24']
      });
    } catch (err) {
      // ignore
    }

    setFormData({
      name: '',
      relationship: 'Bạn bè',
      attending: 'yes',
      guestCount: '1',
      message: '',
    });

    setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section className="py-12 sm:py-16 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-10 sm:mb-14">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2 flex items-center justify-center gap-2">
          <MessageSquareHeart className="w-3.5 h-3.5 text-rose-600" />
          <span>SỔ LƯU BÚT & RSVP</span>
        </p>
        <h2 className="text-2xl sm:text-4xl font-serif-elegant font-bold text-stone-900 mb-2">
          Gửi Lời Chúc & Xác Nhận Tham Dự
        </h2>
        <p className="text-sm font-sans-clean text-stone-500">
          Hãy để lại những lời chúc yêu thương và cho chúng mình biết bạn sẽ đến chung vui nhé
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        
        {/* RSVP & WISH FORM */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80">
          <h3 className="text-xl font-serif-elegant font-bold text-stone-900 mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
            <span>Gửi lời chúc mừng</span>
          </h3>

          {submitted && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-sans-clean flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Cảm ơn bạn rất nhiều! Lời chúc của bạn đã được lưu lại. ♥</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm font-sans-clean">
            <div>
              <label className="block text-stone-700 font-medium mb-1">
                Tên của bạn *
              </label>
              <input
                type="text"
                required
                placeholder="Nhập tên của bạn (vd: Anh Nam)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Mối quan hệ
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 bg-white"
                >
                  <option value="Bạn Chú Rể">Bạn Chú Rể</option>
                  <option value="Bạn Cô Dâu">Bạn Cô Dâu</option>
                  <option value="Đồng Nghiệp">Đồng Nghiệp</option>
                  <option value="Họ Hàng">Họ Hàng</option>
                  <option value="Bạn Bè">Bạn Bè</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Tham dự tiệc?
                </label>
                <select
                  value={formData.attending}
                  onChange={(e) => setFormData({ ...formData, attending: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 bg-white"
                >
                  <option value="yes">Sẽ tham dự</option>
                  <option value="no">Bận, gửi chúc mừng</option>
                </select>
              </div>
            </div>

            {formData.attending === 'yes' && (
              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Số người tham dự
                </label>
                <select
                  value={formData.guestCount}
                  onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 bg-white"
                >
                  <option value="1">1 người (Đi một mình)</option>
                  <option value="2">2 người (Cùng người thương)</option>
                  <option value="3">3 người trở lên (Cả gia đình)</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-stone-700 font-medium mb-1">
                Lời chúc gửi đến {groom.nickname} & {bride.nickname} *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Viết lời chúc ngọt ngào của bạn tại đây..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-600 resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 hover:from-rose-800 hover:to-rose-900 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4 text-amber-200" />
              <span>Gửi Lời Chúc Mừng</span>
            </button>
          </form>
        </div>

        {/* WISHES WALL (SỔ LƯU BÚT) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 flex flex-col h-full max-h-[480px]">
          <h3 className="text-xl font-serif-elegant font-bold text-stone-900 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <MessageSquareHeart className="w-4 h-4 text-amber-600" />
              <span>Sổ lưu bút ({wishes.length})</span>
            </span>
            <span className="text-xs font-sans-clean font-normal text-stone-400">
              Mới nhất
            </span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 scrollbar-thin">
            {wishes.map((w, index) => (
              <div
                key={w.id || index}
                className="p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-amber-200 transition-all"
              >
                <div className="flex justify-between items-start mb-1.5">
                  <span className="font-serif-elegant font-bold text-stone-900 text-sm sm:text-base">
                    {w.name}
                  </span>
                  <span className="text-[10px] text-stone-400 font-sans-clean">
                    {(() => {
                      const ts = w.timestamp || (typeof w.id === 'string' && w.id.startsWith('wish-') ? parseInt(w.id.split('-')[1], 10) : null);
                      if (ts && !isNaN(ts)) {
                        const d = new Date(ts);
                        if (!isNaN(d.getTime())) {
                          return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                        }
                      }
                      if (w.createdAt && w.createdAt !== 'Vừa xong' && w.createdAt !== 'Mới' && w.createdAt !== 'Gần đây') {
                        return w.createdAt;
                      }
                      const now = new Date();
                      return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                    })()}
                  </span>
                </div>
                {w.relationship && (
                  <p className="text-[11px] font-sans-clean text-rose-700 font-medium mb-1.5">
                    {w.relationship}
                  </p>
                )}
                <p className="text-xs sm:text-sm font-sans-clean text-stone-600 italic leading-relaxed">
                  "{w.message}"
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}
