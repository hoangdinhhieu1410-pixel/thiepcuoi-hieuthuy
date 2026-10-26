import React, { useState } from 'react';
import { Gift, Copy, Check, CreditCard, Heart, QrCode } from 'lucide-react';

export function GiftBoxSection({ banking, groom, bride }) {
  const [activeTab, setActiveTab] = useState('groom');
  const [copiedKey, setCopiedKey] = useState(null);

  if (!banking) return null;

  const currentBank = activeTab === 'groom' ? banking.groomBank : banking.brideBank;
  const currentPersonName = activeTab === 'groom' ? groom?.name : bride?.name;
  const currentRole = activeTab === 'groom' ? 'Chú Rể' : 'Cô Dâu';

  // Generate VietQR URL
  const qrUrl = `https://img.vietqr.io/image/${currentBank.bankId}-${currentBank.accountNo}-compact2.png?amount=&addInfo=${encodeURIComponent(`Mung cuoi ${groom.nickname} ${bride.nickname}`)}&accountName=${encodeURIComponent(currentBank.accountName)}`;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <section className="py-12 sm:py-16 px-4 bg-stone-50 border-t border-stone-200/80">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 sm:mb-10">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2 flex items-center justify-center gap-2">
            <Gift className="w-3.5 h-3.5 text-rose-600" />
            <span>MỪNG CƯỚI</span>
          </p>
          <h2 className="text-2xl sm:text-4xl font-serif-elegant font-bold text-stone-900 mb-2">
            Hộp Mừng Cưới Online
          </h2>
          <p className="text-xs sm:text-sm font-sans-clean text-stone-500 max-w-lg mx-auto">
            {banking.description || 'Sự hiện diện của quý khách là niềm vinh hạnh lớn nhất của chúng tôi.'}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('groom')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-sans-clean font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'groom'
                ? 'bg-rose-700 text-white shadow-md'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Mừng Chú Rể</span>
            <span className="text-xs font-normal opacity-90">({groom.nickname})</span>
          </button>

          <button
            onClick={() => setActiveTab('bride')}
            className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-sans-clean font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'bride'
                ? 'bg-rose-700 text-white shadow-md'
                : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
            }`}
          >
            <span>Mừng Cô Dâu</span>
            <span className="text-xs font-normal opacity-90">({bride.nickname})</span>
          </button>
        </div>

        {/* Banking Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-amber-100/90 max-w-md mx-auto flex flex-col items-center text-center">
          
          {/* VietQR Code Display */}
          <div className="relative w-52 h-52 sm:w-56 sm:h-56 bg-stone-50 rounded-2xl p-2 border-2 border-dashed border-amber-300 shadow-inner mb-5 flex items-center justify-center overflow-hidden">
            <img
              src={qrUrl}
              alt="Mã VietQR Chuyển Khoản"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                // Fallback to QR placeholder if network blocked
                e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`STK: ${currentBank.accountNo} - ${currentBank.bankName} - ${currentBank.accountName}`)}`;
              }}
            />
          </div>

          <div className="w-full space-y-2.5 text-xs sm:text-sm font-sans-clean mb-5">
            <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Ngân hàng:</span>
              <span className="font-semibold text-stone-800">{currentBank.bankName}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Chủ tài khoản:</span>
              <span className="font-semibold text-stone-800">{currentBank.accountName}</span>
            </div>

            <div className="flex justify-between items-center py-1.5 border-b border-stone-100">
              <span className="text-stone-500">Số tài khoản:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-rose-700 text-base">{currentBank.accountNo}</span>
                <button
                  onClick={() => copyToClipboard(currentBank.accountNo, 'stk')}
                  className="p-1 text-stone-400 hover:text-rose-700 transition-colors"
                  title="Sao chép số tài khoản"
                >
                  {copiedKey === 'stk' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={() => copyToClipboard(currentBank.accountNo, 'stk-btn')}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-sans-clean font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow"
          >
            {copiedKey === 'stk-btn' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đã sao chép số tài khoản!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-amber-300" />
                <span>Sao chép STK ({currentBank.accountNo})</span>
              </>
            )}
          </button>

        </div>
      </div>
    </section>
  );
}
