import React from 'react';
import { Heart, User, Phone } from 'lucide-react';

export function CoupleSection({ groom, bride, welcomeMessage }) {
  return (
    <section className="py-12 sm:py-16 px-4 max-w-4xl mx-auto">
      {/* Welcome Love Quote */}
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <Heart className="w-6 h-6 text-rose-500 fill-rose-500/30 mx-auto mb-3 animate-pulse" />
        <h2 className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2">
          CÔ DÂU & CHÚ RỂ
        </h2>
        <p className="text-lg sm:text-xl font-serif-elegant italic text-stone-700 leading-relaxed">
          "{welcomeMessage}"
        </p>
      </div>

      {/* Grid of Groom and Bride */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
        
        {/* GROOM CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-amber-600 via-rose-700 to-amber-600"></div>
          
          <div className="relative w-40 h-48 sm:w-48 sm:h-56 rounded-2xl overflow-hidden mb-5 shadow-lg border-2 border-amber-100 group-hover:scale-102 transition-transform duration-500">
            <img
              src={groom.avatar}
              alt={groom.name}
              className="w-full h-full object-cover object-top"
            />
            <span className="absolute bottom-2 left-2 bg-stone-900/80 text-amber-300 text-[11px] font-sans-clean font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              CHÚ RỂ
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-serif-elegant font-bold text-stone-900 mb-1">
            {groom.name}
          </h3>
          <p className="text-sm font-script text-rose-700 text-xl mb-3">
            ({groom.nickname})
          </p>
          <p className="text-stone-600 text-xs sm:text-sm font-sans-clean mb-5 leading-relaxed italic">
            "{groom.bio}"
          </p>

          {/* Parents Box */}
          <div className="w-full pt-4 border-t border-stone-100 text-xs text-stone-500 font-sans-clean">
            <p className="font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[11px]">
              GIA ĐÌNH NHÀ TRAI
            </p>
            <p>Thân phụ: <span className="font-medium text-stone-800">{groom.father}</span></p>
            <p>Thân mẫu: <span className="font-medium text-stone-800">{groom.mother}</span></p>
          </div>
        </div>

        {/* BRIDE CARD */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-stone-200/80 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-2xl transition-all">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-700 via-pink-600 to-rose-700"></div>

          <div className="relative w-40 h-48 sm:w-48 sm:h-56 rounded-2xl overflow-hidden mb-5 shadow-lg border-2 border-rose-100 group-hover:scale-102 transition-transform duration-500">
            <img
              src={bride.avatar}
              alt={bride.name}
              className="w-full h-full object-cover object-top"
            />
            <span className="absolute bottom-2 left-2 bg-rose-900/80 text-rose-200 text-[11px] font-sans-clean font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              CÔ DÂU
            </span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-serif-elegant font-bold text-stone-900 mb-1">
            {bride.name}
          </h3>
          <p className="text-sm font-script text-rose-700 text-xl mb-3">
            ({bride.nickname})
          </p>
          <p className="text-stone-600 text-xs sm:text-sm font-sans-clean mb-5 leading-relaxed italic">
            "{bride.bio}"
          </p>

          {/* Parents Box */}
          <div className="w-full pt-4 border-t border-stone-100 text-xs text-stone-500 font-sans-clean">
            <p className="font-semibold text-stone-700 mb-1 uppercase tracking-wider text-[11px]">
              GIA ĐÌNH NHÀ GÁI
            </p>
            <p>Thân phụ: <span className="font-medium text-stone-800">{bride.father}</span></p>
            <p>Thân mẫu: <span className="font-medium text-stone-800">{bride.mother}</span></p>
          </div>
        </div>

      </div>
    </section>
  );
}
