import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Heart } from 'lucide-react';

export function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isOver: false,
  });

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isOver: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isOver: false });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-700 font-sans-clean font-semibold flex items-center justify-center gap-2 mb-2">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>ĐẾM NGƯỢC NGÀY CHUNG ĐÔI</span>
        </p>
        <h3 className="text-2xl sm:text-3xl font-serif-elegant font-bold text-stone-900">
          Chỉ còn một chút nữa thôi...
        </h3>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        {[
          { label: 'NGÀY', value: timeLeft.days },
          { label: 'GIỜ', value: timeLeft.hours },
          { label: 'PHÚT', value: timeLeft.minutes },
          { label: 'GIÂY', value: timeLeft.seconds },
        ].map((item, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-2xl p-3 sm:p-5 shadow-lg border border-amber-100/80 group hover:border-rose-200 transition-all hover:scale-105"
          >
            <span className="text-2xl sm:text-4xl font-serif-elegant font-bold text-rose-800 tracking-tight">
              {String(item.value).padStart(2, '0')}
            </span>
            <span className="text-[10px] sm:text-xs font-sans-clean uppercase tracking-widest text-stone-500 font-medium mt-1">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      {timeLeft.isOver && (
        <p className="text-center mt-4 text-sm font-script text-rose-700 text-xl">
          Hôn lễ đã chính thức diễn ra trong ngập tràn yêu thương! ♥
        </p>
      )}
    </div>
  );
}
