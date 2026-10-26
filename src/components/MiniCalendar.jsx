import React from 'react';
import { Heart } from 'lucide-react';

export function MiniCalendar({ targetDate = '2026-11-29', events = [] }) {
  // Parse month and year from events or fallback targetDate
  let year = 2026;
  let monthIndex = 10; // Default November (0-indexed: 10 is Nov)

  const eventsList = Array.isArray(events) && events.length > 0 ? events : [];

  // Try extracting month & year from first event
  if (eventsList[0]?.month) {
    const mMatch = eventsList[0].month.match(/\d+/);
    if (mMatch) {
      monthIndex = parseInt(mMatch[0], 10) - 1;
    }
  } else if (targetDate) {
    const d = new Date(targetDate);
    if (!isNaN(d.getTime())) {
      monthIndex = d.getMonth();
      year = d.getFullYear();
    }
  }

  if (eventsList[0]?.year) {
    const yMatch = eventsList[0].year.match(/\d{4}/);
    if (yMatch) {
      year = parseInt(yMatch[0], 10);
    }
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthName = monthNames[monthIndex] || 'November';
  const monthDisplayNum = String(monthIndex + 1).padStart(2, '0');

  // Days in month & First day of week (0=Sun, 1=Mon, ..., 6=Sat)
  const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Parse Event 1: Tiệc Cưới (Reception)
  const receptionEvent = eventsList.find(e => {
    const t = (e.title || '').toLowerCase();
    const id = (e.id || '').toLowerCase();
    return t.includes('tiệc') || id.includes('tiec');
  }) || eventsList[0];

  // Parse Event 2: Lễ Thành Hôn / Lễ Vu Quy (Ceremony)
  const ceremonyEvent = eventsList.find(e => {
    const t = (e.title || '').toLowerCase();
    const id = (e.id || '').toLowerCase();
    return t.includes('thành hôn') || t.includes('vu quy') || t.includes('hôn lễ') || id.includes('thanh-hon') || id.includes('vu-quy');
  }) || (eventsList.length > 1 ? eventsList[1] : null);

  const parseDayNumber = (ev, fallback) => {
    if (!ev || !ev.date) return fallback;
    const num = parseInt(ev.date, 10);
    return isNaN(num) ? fallback : num;
  };

  const receptionDay = parseDayNumber(receptionEvent, 28);
  const ceremonyDay = parseDayNumber(ceremonyEvent, 29);

  return (
    <div className="w-full max-w-[360px] mx-auto text-center font-avo relative select-none">
      {/* Top bar indicator */}
      <div className="w-20 h-[3px] bg-[#928362] rounded-full mx-auto mb-6"></div>

      {/* Năm & Tháng riêng biệt trên dưới, cách nhau 1 chút thanh lịch */}
      <div className="calendar-header mb-6 flex flex-col items-center justify-center">
        <div className="font-blackmango text-5xl sm:text-6xl text-[#928362] tracking-wider leading-none select-none mb-1 sm:mb-2">
          {year}
        </div>
        <div className="font-highspirited text-4xl sm:text-5xl text-[#928362] leading-tight select-none">
          {monthName}
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1.5 text-xs text-[#928362] font-semibold mb-2 uppercase">
        {weekdays.map((wd, idx) => (
          <div key={idx} className="py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-xs">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={idx} className="h-9"></div>;
          }

          const isReception = day === receptionDay;
          const isCeremony = day === ceremonyDay;
          const isCombined = isReception && isCeremony;

          if (isCombined) {
            return (
              <div
                key={idx}
                className="h-9 flex items-center justify-center relative rounded-full bg-gradient-to-tr from-[#70561f] via-rose-600 to-pink-500 text-white font-bold shadow-md ring-2 ring-amber-300 scale-105 z-20 cursor-default"
                title={`Ngày ${day}/${monthDisplayNum}: ${receptionEvent?.title || 'Tiệc Cưới'} & ${ceremonyEvent?.title || 'Lễ Thành Hôn'}`}
              >
                {/* Biểu tượng trái tim đôi */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center -space-x-1 drop-shadow-md">
                  <Heart className="w-3.5 h-3.5 fill-[#70561f] text-amber-300" />
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-white animate-pulse" />
                </div>
                <span>{day}</span>
              </div>
            );
          }

          if (isReception) {
            // Ngày Tiệc Cưới: Khoanh đậm màu vàng hoàng gia / nâu sang trọng + Biểu tượng trái tim
            return (
              <div
                key={idx}
                className="h-9 flex items-center justify-center relative rounded-full bg-[#70561f] text-white font-bold shadow-md ring-2 ring-[#70561f]/40 ring-offset-1 scale-105 z-10 cursor-default"
                title={`Ngày ${day}/${monthDisplayNum}: ${receptionEvent?.title || 'Tiệc Cưới'}`}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-amber-300 drop-shadow-sm">
                  <Heart className="w-3.5 h-3.5 fill-[#70561f] text-amber-300" />
                </div>
                <span>{day}</span>
              </div>
            );
          }

          if (isCeremony) {
            // Ngày Lễ Thành Hôn / Vu Quy: Khoanh màu hồng đỏ rực rỡ + Biểu tượng trái tim
            return (
              <div
                key={idx}
                className="h-9 flex items-center justify-center relative rounded-full bg-gradient-to-tr from-rose-600 via-rose-500 to-pink-500 text-white font-bold shadow-md ring-2 ring-rose-400/50 ring-offset-1 scale-105 z-20 cursor-default"
                title={`Ngày ${day}/${monthDisplayNum}: ${ceremonyEvent?.title || 'Lễ Thành Hôn'}`}
              >
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-rose-500 animate-pulse drop-shadow-md">
                  <Heart className="w-3.5 h-3.5 fill-rose-500 text-white" />
                </div>
                <span>{day}</span>
              </div>
            );
          }

          // Ngày thường trong tháng
          return (
            <div
              key={idx}
              className="h-9 flex items-center justify-center rounded-full text-stone-700 transition-colors hover:bg-[#ede5d5]/50"
            >
              <span>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
