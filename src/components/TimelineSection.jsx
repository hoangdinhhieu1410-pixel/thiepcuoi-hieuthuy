import React from 'react';
import { Heart, Clock, Sparkles } from 'lucide-react';

export function TimelineSection({ timeline = [] }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <section className="py-12 sm:py-16 px-4 bg-amber-50/40 border-t border-amber-100/60">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12 sm:mb-16">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2 flex items-center justify-center gap-2">
            <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600/30" />
            <span>HÀNH TRÌNH YÊU</span>
          </p>
          <h2 className="text-2xl sm:text-4xl font-serif-elegant font-bold text-stone-900 mb-2">
            Câu Chuyện Của Chúng Mình
          </h2>
          <p className="text-sm font-sans-clean text-stone-500">
            Từng khoảnh khắc đi qua đều là một mảnh ghép diệu kỳ cho ngày hôm nay
          </p>
        </div>

        {/* Timeline Items */}
        <div className="relative">
          {/* Center line */}
          <div className="absolute left-4 sm:left-1/2 top-4 bottom-4 w-0.5 bg-gradient-to-b from-amber-300 via-rose-300 to-amber-300 -translate-x-1/2"></div>

          <div className="space-y-10 sm:space-y-14">
            {timeline.map((item, index) => {
              const isEven = index % 2 === 0;
              return (
                <div
                  key={item.id || index}
                  className={`relative flex flex-col sm:flex-row items-start sm:items-center ${
                    isEven ? 'sm:flex-row-reverse' : ''
                  }`}
                >
                  {/* Central Heart Badge */}
                  <div className="absolute left-4 sm:left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border-2 border-rose-500 shadow-md flex items-center justify-center z-10 group-hover:scale-110 transition-transform">
                    <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600/30" />
                  </div>

                  {/* Content Box */}
                  <div className="ml-12 sm:ml-0 sm:w-1/2 sm:px-8">
                    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-stone-200/80 hover:shadow-xl transition-all">
                      {item.image && (
                        <div className="w-full h-36 sm:h-44 rounded-xl overflow-hidden mb-4">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <span className="text-xs uppercase font-sans-clean font-bold text-amber-700 tracking-wider">
                        {item.date}
                      </span>
                      <h3 className="text-lg sm:text-xl font-serif-elegant font-bold text-stone-900 mt-1 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs sm:text-sm font-sans-clean text-stone-600 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
