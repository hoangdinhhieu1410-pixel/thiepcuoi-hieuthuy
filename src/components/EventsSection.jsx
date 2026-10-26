import React from 'react';
import { Calendar, MapPin, Clock, ExternalLink } from 'lucide-react';

export function EventsSection({ events }) {
  const getGoogleCalendarUrl = (ev) => {
    // Generate Google Calendar add event URL
    const title = encodeURIComponent(ev.title);
    const details = encodeURIComponent(`Kính mời quý khách tham dự ${ev.title} tại ${ev.venue} - ${ev.address}`);
    const location = encodeURIComponent(ev.address);
    // Approximate date range for 2026-10-25
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  };

  return (
    <section className="py-12 sm:py-16 px-4 bg-stone-50/70 border-y border-stone-200/60">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 sm:mb-14">
          <p className="text-xs uppercase tracking-[0.3em] text-amber-700 font-sans-clean font-semibold mb-2 flex items-center justify-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>SỰ KIỆN CƯỚI</span>
          </p>
          <h2 className="text-2xl sm:text-4xl font-serif-elegant font-bold text-stone-900 mb-2">
            Thời Gian & Địa Điểm
          </h2>
          <p className="text-sm font-sans-clean text-stone-500 max-w-lg mx-auto">
            Rất hân hạnh được đón tiếp quý khách tại các buổi lễ trọng đại của hai bên gia đình
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {events.map((ev, index) => (
            <div
              key={ev.id || index}
              className="bg-white rounded-3xl overflow-hidden shadow-lg border border-amber-100 flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
            >
              {/* Event Image Banner */}
              <div className="relative h-44 w-full overflow-hidden">
                <img
                  src={ev.image}
                  alt={ev.title}
                  className="w-full h-full object-cover filter brightness-90 hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                <div className="absolute bottom-3 left-4 right-4">
                  <span className="text-[10px] uppercase font-sans-clean tracking-wider font-semibold bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full">
                    {ev.time}
                  </span>
                  <h3 className="text-lg font-serif-elegant font-bold text-white mt-1 drop-shadow">
                    {ev.title}
                  </h3>
                </div>
              </div>

              {/* Event Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="space-y-3 mb-6">
                  {/* Date */}
                  <div className="flex items-start gap-2.5 text-stone-700 text-xs sm:text-sm font-sans-clean">
                    <Calendar className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-stone-900">{ev.date}</p>
                      <p className="text-[11px] text-amber-700 font-medium">{ev.lunarDate}</p>
                    </div>
                  </div>

                  {/* Venue & Address */}
                  <div className="flex items-start gap-2.5 text-stone-700 text-xs sm:text-sm font-sans-clean">
                    <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-stone-900">{ev.venue}</p>
                      <p className="text-[11px] text-stone-500 leading-relaxed mt-0.5">{ev.address}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-stone-100 grid grid-cols-2 gap-2">
                  <a
                    href={ev.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-800 hover:text-rose-700 text-xs font-sans-clean font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-200/80"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Chỉ đường</span>
                  </a>

                  <a
                    href={getGoogleCalendarUrl(ev)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-sans-clean font-medium flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lưu lịch</span>
                  </a>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
