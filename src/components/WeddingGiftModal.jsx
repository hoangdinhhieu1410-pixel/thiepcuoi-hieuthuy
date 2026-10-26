import React, { useState } from 'react';
import { X, Copy, Check, QrCode } from 'lucide-react';

export function WeddingGiftModal({ isOpen, onClose, banking, groom, bride, isAbsolute = false }) {
  const [activeTab, setActiveTab] = useState('groom');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !banking) return null;

  const currentBank = activeTab === 'groom' ? banking.groomBank : banking.brideBank;
  const currentPersonName = activeTab === 'groom' ? (groom?.nickname || groom?.name || 'Chú rể') : (bride?.nickname || bride?.name || 'Cô dâu');
  const isGroom = activeTab === 'groom';

  // Custom uploaded QR/Account image or auto-generated VietQR
  const hasCustomImage = !!currentBank?.qrImage;
  const qrUrl = currentBank?.qrImage || `https://img.vietqr.io/image/${currentBank?.bankId || 'MB'}-${currentBank?.accountNo || '0000'}-compact2.png?amount=&addInfo=${encodeURIComponent(`Mung cuoi ${groom?.nickname || ''} ${bride?.nickname || ''}`)}&accountName=${encodeURIComponent(currentBank?.accountName || '')}`;

  const copySTK = () => {
    if (currentBank?.accountNo) {
      navigator.clipboard.writeText(currentBank.accountNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`${isAbsolute ? 'absolute' : 'fixed'} inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in`}>
      <div className="bg-[#fbf8f2] rounded-3xl w-full max-w-sm p-4 sm:p-6 shadow-2xl border border-[#d8cdb4] relative text-center text-stone-800 font-avo max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-[#ede5d5] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold font-serif-elegant text-[#70561f] mb-1">
          Hộp Mừng Cưới
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Gửi quà mừng hạnh phúc tới cô dâu & chú rể
        </p>

        {/* Tab switch Cô dâu - Chú rể */}
        <div className="flex justify-center gap-1.5 mb-3 bg-[#ede5d5]/60 p-1 rounded-full border border-[#d8cdb4]">
          <button
            onClick={() => setActiveTab('groom')}
            className={`flex-1 py-2 px-2 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
              isGroom
                ? 'bg-[#70561f] text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="shrink-0 text-sm">🤵</span>
            <span className="whitespace-nowrap">Chú rể ({groom?.nickname || 'Đình Hiếu'})</span>
          </button>
          <button
            onClick={() => setActiveTab('bride')}
            className={`flex-1 py-2 px-2 rounded-full text-[11px] sm:text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
              !isGroom
                ? 'bg-rose-700 text-white shadow-md'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <span className="shrink-0 text-sm">👰</span>
            <span className="whitespace-nowrap">Cô dâu ({bride?.nickname || 'Thanh Thúy'})</span>
          </button>
        </div>

        {/* Role indicator badge */}
        <div className="mb-3">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
            isGroom 
              ? 'bg-amber-100/80 text-amber-900 border border-amber-300/80' 
              : 'bg-rose-100/80 text-rose-900 border border-rose-300/80'
          }`}>
            <span>{isGroom ? '🤵 Tài khoản / QR Chú Rể (Nhà Trai)' : '👰 Tài khoản / QR Cô Dâu (Nhà Gái)'}</span>
          </span>
        </div>

        {/* QR Code / Bank Account Image Container */}
        <div className="w-full max-w-[240px] min-h-[190px] mx-auto bg-white p-2.5 rounded-2xl border-2 border-dashed border-[#c7beab] shadow-inner mb-3.5 flex items-center justify-center overflow-hidden">
          <img
            src={qrUrl}
            alt={isGroom ? 'Số tài khoản / Mã QR Chú Rể' : 'Số tài khoản / Mã QR Cô Dâu'}
            className="w-full max-h-56 object-contain rounded-xl"
            onError={(e) => {
              if (currentBank?.accountNo) {
                e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=STK:${currentBank.accountNo}`;
              }
            }}
          />
        </div>

        {/* Bank details */}
        {currentBank && (currentBank.accountNo || currentBank.bankName) && (
          <div className="space-y-1 text-xs text-stone-600 mb-4 bg-white p-3 rounded-xl border border-[#e5dec9]">
            {currentBank.bankName && (
              <p>Ngân hàng: <span className="font-semibold text-stone-900">{currentBank.bankName}</span></p>
            )}
            {currentBank.accountName && (
              <p>Chủ TK: <span className="font-semibold text-stone-900">{currentBank.accountName}</span></p>
            )}
            {currentBank.accountNo && (
              <p className="flex items-center justify-center gap-1.5 pt-0.5">
                Số TK: <span className="font-mono font-bold text-base text-[#70561f]">{currentBank.accountNo}</span>
              </p>
            )}
          </div>
        )}

        {currentBank?.accountNo && (
          <button
            onClick={copySTK}
            className={`w-full py-2.5 px-4 rounded-full text-white text-xs font-semibold flex items-center justify-center gap-2 shadow transition-all ${
              isGroom ? 'bg-[#70561f] hover:bg-[#5a4417]' : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Đã sao chép số tài khoản!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#e6b685]" />
                <span>Sao chép STK ({currentBank.accountNo})</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
