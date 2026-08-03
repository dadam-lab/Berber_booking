import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { DaySchedule, DateSchedule, Reservation } from '@/lib/types';
import { calculateMonthHeatmap, formatDateISO } from '@/lib/calendarUtils';

interface CalendarHeatmapProps {
  schedules: DaySchedule[];
  dateSchedules?: DateSchedule[];
  reservations: Reservation[];
  selectedServiceDuration: number;
  selectedDate: string;
  onSelectDate: (dateISO: string) => void;
  blockedDays?: string[];
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  schedules,
  dateSchedules,
  reservations,
  selectedServiceDuration,
  selectedDate,
  onSelectDate,
  blockedDays = [],
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNamesCzech = [
    'Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen',
    'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'
  ];

  const weekDaysCzech = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

  const monthHeatmap = calculateMonthHeatmap(year, month, schedules, reservations, selectedServiceDuration, blockedDays, dateSchedules || []);

  // Month navigation
  const prevMonth = () => {
    const today = new Date();
    // Prevent going into past months
    if (year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth())) {
      setCurrentDate(new Date(year, month - 1, 1));
    }
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Calculate calendar grid start position (Monday first)
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // getDay(): 0 is Sunday, 1 is Monday... convert so Monday is index 0
  let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
  if (startingDayOfWeek === -1) startingDayOfWeek = 6;

  const monthLabel = `${monthNamesCzech[month]} ${year}`;

  return (
    <div className="bg-zinc-900/90 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-300 p-4 sm:p-6 shadow-xl">
      {/* Month Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-white" />
          <h3 className="text-lg font-bold text-white light:text-zinc-900">
            {monthLabel}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl bg-zinc-800 light:bg-zinc-200 text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer"
            title="Předchozí měsíc"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl bg-zinc-800 light:bg-zinc-200 text-zinc-300 light:text-zinc-700 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer"
            title="Následující měsíc"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
        {weekDaysCzech.map((wd) => (
          <div key={wd} className="text-xs font-semibold text-zinc-400 light:text-zinc-600 uppercase py-1">
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {/* Empty padding cells before 1st day */}
        {Array.from({ length: startingDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-11 sm:h-14 rounded-xl bg-transparent" />
        ))}

        {/* Month Days */}
        {Array.from({ length: daysInMonth }).map((_, dayIdx) => {
          const dayNum = dayIdx + 1;
          const dateObj = new Date(year, month, dayNum);
          const dateISO = formatDateISO(dateObj);
          const dayData = monthHeatmap[dateISO] || { status: 'green', freeSlotsCount: 8 };

          const isSelected = selectedDate === dateISO;
          const isPast = dayData.status === 'past';
          const isClosed = dayData.status === 'closed';
          const isFull = dayData.status === 'full';
          const isClickable = !isPast && !isClosed && !isFull;

          // Heatmap styling classes based on color coding
          let colorClasses = '';
          let badgeText = '';

          if (isPast) {
            colorClasses = 'bg-zinc-950/40 text-zinc-600 border-zinc-900 cursor-not-allowed opacity-40';
          } else if (dayData.isVacation) {
            colorClasses = 'bg-rose-950/30 text-rose-400/80 border-rose-900/40 line-through cursor-not-allowed';
            badgeText = 'Dovolená';
          } else if (dayData.isNoSlots || isClosed) {
            colorClasses = 'bg-zinc-900/60 text-zinc-500 border-zinc-800/50 line-through cursor-not-allowed';
            badgeText = 'Nestříhám';
          } else if (isFull) {
            colorClasses = 'bg-zinc-900/80 text-zinc-500 border-zinc-800 line-through cursor-not-allowed';
            badgeText = 'Plno';
          } else if (dayData.status === 'red') {
            colorClasses = 'bg-rose-950/40 text-rose-300 border-rose-500/50 hover:border-rose-400 hover:bg-rose-900/50';
            badgeText = 'Zbývá 1 termín';
          } else if (dayData.status === 'orange') {
            colorClasses = 'bg-orange-950/40 text-orange-300 border-orange-500/50 hover:border-orange-400 hover:bg-orange-900/50';
            badgeText = 'Skoro plno';
          } else {
            // Green (Volno)
            colorClasses = 'bg-emerald-950/40 text-emerald-300 border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-900/50';
            badgeText = 'Volno';
          }

          if (isSelected) {
            colorClasses = 'bg-white text-zinc-950 border-white font-black shadow-lg shadow-white/20 scale-105 z-10';
          }

          return (
            <button
              key={dateISO}
              type="button"
              disabled={!isClickable}
              onClick={() => onSelectDate(dateISO)}
              className={`relative h-12 sm:h-16 rounded-xl border flex flex-col items-center justify-center transition-all p-1 ${colorClasses} ${
                isClickable ? 'cursor-pointer hover:scale-[1.02]' : ''
              }`}
            >
              <span className={`text-sm sm:text-base font-bold ${isSelected ? 'text-zinc-950' : ''}`}>
                {dayNum}
              </span>
              
              {!isPast && (
                <span className={`text-[10px] leading-tight font-medium sm:block hidden ${
                  isSelected ? 'text-zinc-900 font-bold' : ''
                }`}>
                  {badgeText}
                </span>
              )}

              {/* Status color indicator dot */}
              {!isPast && !isClosed && !isFull && !isSelected && (
                <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  dayData.status === 'red' ? 'bg-rose-500' :
                  dayData.status === 'orange' ? 'bg-orange-500' : 'bg-emerald-400'
                }`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Availability Legend */}
      <div className="mt-6 pt-4 border-t border-zinc-800 light:border-zinc-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Volno (&lt; 50 % obsazeno)</span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span>Skoro plno (&ge; 50 % obsazeno)</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span>Zbývá 1 termín</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500 line-through font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
          <span>Plno / Nestříhám / Dovolená</span>
        </div>
      </div>
    </div>
  );
};
