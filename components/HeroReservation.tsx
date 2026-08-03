import React, { useState, useEffect } from 'react';
import { Clock, User, CheckCircle2, ArrowRight, ArrowLeft, Download, ExternalLink, Sparkles, AlertCircle, Mail } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Service, DaySchedule, DateSchedule, Reservation, CmsConfig } from '@/lib/types';
import { CalendarHeatmap } from './CalendarHeatmap';
import { generateGoogleCalendarUrl, generateICSContent } from '@/lib/calendarUtils';

interface HeroReservationProps {
  cmsConfig: CmsConfig;
  services: Service[];
  schedules: DaySchedule[];
  reservations: Reservation[];
  onReservationCreated: (newRes: Reservation) => void;
  blockedDays?: string[];
}

export const HeroReservation: React.FC<HeroReservationProps> = ({
  cmsConfig,
  services,
  schedules,
  reservations,
  onReservationCreated,
  blockedDays = [],
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Form Inputs
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  // State for available slots in Step 3
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmed Reservation Result
  const [confirmedData, setConfirmedData] = useState<{
    reservation: Reservation;
    googleCalendarUrl: string;
    icsUrl: string;
    message: string;
  } | null>(null);

  const [dbDateSchedules, setDbDateSchedules] = useState<DateSchedule[]>(cmsConfig.dateSchedules || []);

  // Fetch all configured dates & slots from Supabase DB on component mount
  const loadAvailability = () => {
    const todayISO = new Date().toISOString().split('T')[0];
    const future60ISO = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    fetch(`/api/availability?startDate=${todayISO}&endDate=${future60ISO}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.availability && Array.isArray(data.availability)) {
          const map: Record<string, { allSlots: string[]; freeSlots: string[]; isVacation: boolean }> = {};
          data.availability.forEach((item: any) => {
            if (!map[item.date]) {
              map[item.date] = { allSlots: [], freeSlots: [], isVacation: false };
            }
            if (item.is_vacation) {
              map[item.date].isVacation = true;
            } else if (item.time) {
              const slotTime = item.time.substring(0, 5);
              map[item.date].allSlots.push(slotTime);
              if (!item.is_booked) {
                map[item.date].freeSlots.push(slotTime);
              }
            }
          });

          const converted: DateSchedule[] = Object.keys(map).map((dateStr) => ({
            date: dateStr,
            timeSlots: map[dateStr].freeSlots,
            allSlots: map[dateStr].allSlots,
            isVacation: map[dateStr].isVacation,
          }));

          setDbDateSchedules(converted);
        }
      })
      .catch((err) => console.log('Error fetching DB availability:', err));
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  // Set default selected service if available
  useEffect(() => {
    if (services.length > 0 && !selectedService) {
      setSelectedService(services[0]);
    }
  }, [services]);

  // Fetch available slots when Step 3 is reached or Date changes
  useEffect(() => {
    if (selectedService && selectedDate) {
      setLoadingSlots(true);
      fetch(`/api/availability?date=${selectedDate}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.availability && data.availability.length > 0) {
            // Filter non-booked and non-vacation 15-min slots
            const freeSlots = data.availability
              .filter((slot: any) => !slot.is_booked && !slot.is_vacation)
              .map((slot: any) => slot.time.substring(0, 5));
            setAvailableSlots(freeSlots);
          } else {
            // No slots configured for this date -> 0 available slots!
            setAvailableSlots([]);
          }
          setLoadingSlots(false);
        })
        .catch(() => {
          setAvailableSlots([]);
          setLoadingSlots(false);
        });
    }
  }, [selectedService, selectedDate]);

  const handleServiceSelect = (srv: Service) => {
    setSelectedService(srv);
    setSelectedTime(''); // Reset time on service change
    setCurrentStep(2);
  };

  const handleDateSelect = (dateISO: string) => {
    setSelectedDate(dateISO);
    setSelectedTime(''); // Reset time on date change
    setCurrentStep(3);
  };

  const handleTimeSelect = (timeStr: string) => {
    setSelectedTime(timeStr);
    setCurrentStep(4);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedTime) return;

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          date: selectedDate,
          time: selectedTime,
          client_name: `${firstName} ${lastName}`.trim(),
          client_email: email,
          note,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Chyba při odesílání rezervace.');
      }

      // Calculate end time
      const [h, m] = selectedTime.split(':').map(Number);
      const totalMins = h * 60 + m + (selectedService.durationMinutes || 45);
      const endH = Math.floor(totalMins / 60);
      const endM = totalMins % 60;
      const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

      const newReservation: Reservation = {
        id: data.order?.id || `res-${Date.now()}`,
        serviceId: selectedService.id,
        serviceName: selectedService.name,
        servicePrice: selectedService.price,
        durationMinutes: selectedService.durationMinutes,
        date: selectedDate,
        time: selectedTime,
        endTime: endTimeStr,
        firstName,
        lastName,
        email,
        note,
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      // Generate Calendar URLs
      const googleCalUrl = generateGoogleCalendarUrl({
        serviceName: selectedService.name,
        date: selectedDate,
        time: selectedTime,
        endTime: endTimeStr,
        shopName: cmsConfig.shopName,
        address: cmsConfig.address,
        city: cmsConfig.city,
        note,
      });

      const icsContent = generateICSContent({
        id: newReservation.id,
        serviceName: selectedService.name,
        date: selectedDate,
        time: selectedTime,
        endTime: endTimeStr,
        shopName: cmsConfig.shopName,
        address: cmsConfig.address,
        city: cmsConfig.city,
        note,
      });

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const icsUrl = URL.createObjectURL(blob);

      setConfirmedData({
        reservation: newReservation,
        googleCalendarUrl: googleCalUrl,
        icsUrl,
        message: data.message || 'Rezervace byla úspěšně vytvořena.',
      });

      onReservationCreated(newReservation);
      setCurrentStep(5);
      loadAvailability();

      // Trigger Celebration Confetti
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#d97706', '#f59e0b', '#10b981', '#ffffff'],
        });
      } catch (err) {
        // ignore if canvas confetti fails
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Došlo k neočekávané chybě.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for step indicator titles
  const steps = [
    { num: 1, title: 'Služby' },
    { num: 2, title: 'Datum' },
    { num: 3, title: 'Čas' },
    { num: 4, title: 'Údaje' },
  ];

  return (
    <section id="rezervace" className="relative pt-20 sm:pt-28 pb-12 sm:pb-16 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto min-h-[85vh] flex flex-col justify-center">
      {/* Background Accent glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[200px] sm:h-[350px] bg-white/5 blur-[100px] rounded-full pointer-events-none -z-10" />

      {/* Hero Header Text */}
      <div className="text-center max-w-3xl mx-auto mb-6 sm:mb-10">
        <h2 className="text-2xl sm:text-5xl font-extrabold text-white light:text-zinc-900 tracking-tight mb-3">
          {cmsConfig.heroHeadline}
        </h2>
        <p className="text-sm sm:text-lg text-zinc-400 light:text-zinc-600 px-2">
          {cmsConfig.heroSubheadline}
        </p>
      </div>

      {/* Step Stepper Header (Only show during steps 1-4) */}
      {currentStep <= 4 && (
        <div className="max-w-2xl mx-auto w-full mb-6 sm:mb-8 px-2">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 light:bg-zinc-300 -translate-y-1/2 z-0" />
            {steps.map((st) => {
              const isActive = currentStep === st.num;
              const isDone = currentStep > st.num;

              return (
                <div key={st.num} className="flex flex-col items-center gap-1.5 bg-transparent relative z-10 px-1">
                  <button
                    type="button"
                    disabled={st.num > currentStep}
                    onClick={() => setCurrentStep(st.num as any)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-zinc-950 ring-4 ring-white/20 shadow-lg scale-110 font-extrabold'
                        : isDone
                        ? 'bg-emerald-500 text-zinc-950'
                        : 'bg-zinc-800 light:bg-zinc-200 text-zinc-400 light:text-zinc-800 border border-zinc-700 light:border-zinc-300'
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" /> : st.num}
                  </button>
                  <span className={`text-[10px] sm:text-xs font-medium ${isActive ? 'text-white font-bold' : 'text-zinc-400 light:text-zinc-800 font-semibold'}`}>
                    {st.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: SERVICE SELECTION */}
      {currentStep === 1 && (
        <div className="max-w-4xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {services.map((srv) => {
              const isSelected = selectedService?.id === srv.id;

              return (
                <div
                  key={srv.id}
                  onClick={() => handleServiceSelect(srv)}
                  className={`relative rounded-2xl p-5 sm:p-6 border transition-all cursor-pointer flex flex-col justify-between group active:scale-[0.99] ${
                    isSelected
                      ? 'bg-white/10 border-white ring-2 ring-white/30'
                      : 'bg-zinc-900/80 light:bg-zinc-50 border-zinc-800 light:border-zinc-300 hover:border-zinc-500 hover:bg-zinc-900'
                  }`}
                >
                  {srv.badge && (
                    <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-white text-zinc-950 text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                      {srv.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-base sm:text-lg font-bold text-white light:text-zinc-900 group-hover:text-zinc-200 transition-colors">
                        {srv.name}
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-zinc-400 light:text-zinc-600 mb-4 line-clamp-2">
                      {srv.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3.5 border-t border-zinc-800/80 light:border-zinc-200">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 light:text-zinc-600 font-medium">
                      <Clock className="w-4 h-4 text-white" />
                      <span>{srv.durationMinutes} minut</span>
                    </div>

                    <div className="text-right">
                      <span className="text-xl sm:text-2xl font-black text-white">
                        {srv.price} Kč
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <button
              type="button"
              disabled={!selectedService}
              onClick={() => setCurrentStep(2)}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold transition-all shadow-lg shadow-white/10 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Pokračovat k výběru data</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATE CALENDAR HEATMAP */}
      {currentStep === 2 && (
        <div className="max-w-3xl mx-auto w-full">
          <div className="mb-3 sm:mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět na výběr služby</span>
            </button>
            {selectedService && (
              <span className="text-xs text-white font-semibold px-3 py-1 rounded-full bg-white/10 border border-white/20">
                Služba: {selectedService.name} ({selectedService.durationMinutes} min)
              </span>
            )}
          </div>

          <CalendarHeatmap
            schedules={schedules}
            dateSchedules={dbDateSchedules}
            reservations={reservations}
            selectedServiceDuration={selectedService?.durationMinutes || 45}
            selectedDate={selectedDate}
            onSelectDate={handleDateSelect}
            blockedDays={blockedDays}
          />

          {selectedDate && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold transition-all shadow-lg shadow-white/10 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Vybrat čas na {selectedDate}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: DYNAMIC TIME SLOTS */}
      {currentStep === 3 && (
        <div className="max-w-2xl mx-auto w-full bg-zinc-900/90 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-300 p-4 sm:p-6 shadow-xl">
          <div className="mb-4 sm:mb-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět na výběr data</span>
            </button>
            <span className="text-xs text-white font-bold px-3 py-1 rounded-full bg-white/10 border border-white/20">
              Datum: {selectedDate}
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white light:text-zinc-900 mb-1.5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-white" />
            <span>Dostupné časové termíny</span>
          </h3>
          <p className="text-xs text-zinc-400 light:text-zinc-600 mb-5">
            Časová okna garantují souvislou délku trvání služby ({selectedService?.durationMinutes} min).
          </p>

          {loadingSlots ? (
            <div className="py-12 text-center text-zinc-400">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <span>Načítám volné sloty...</span>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-950 light:bg-zinc-200 text-center border border-zinc-800">
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-zinc-200 light:text-zinc-800 mb-1">
                Pro tento den nejsou k dispozici žádné volné termíny.
              </p>
              <p className="text-xs text-zinc-400 mb-4">
                Vyberte prosím jiné datum v kalendáři.
              </p>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-4 py-2 rounded-xl bg-white text-zinc-950 text-xs font-bold"
              >
                Vrátit se do kalendáře
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto pr-1">
              {availableSlots.map((time) => {
                const isSelected = selectedTime === time;

                return (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeSelect(time)}
                    className={`py-3 px-2 rounded-xl border text-sm font-bold transition-all cursor-pointer flex flex-col items-center justify-center min-h-[44px] ${
                      isSelected
                        ? 'bg-white text-zinc-950 border-white scale-105 shadow-md font-extrabold'
                        : 'bg-zinc-950/60 light:bg-zinc-100 border-zinc-800 light:border-zinc-300 text-zinc-200 light:text-zinc-800 hover:border-zinc-500 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{time}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedTime && (
            <div className="mt-6 sm:mt-8 text-center">
              <button
                type="button"
                onClick={() => setCurrentStep(4)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold transition-all shadow-lg shadow-white/10 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Vybrán čas {selectedTime} • Pokračovat</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: CLIENT DETAILS FORM */}
      {currentStep === 4 && (
        <div className="max-w-xl mx-auto w-full bg-zinc-900/90 light:bg-zinc-50 rounded-2xl border border-zinc-800 light:border-zinc-300 p-5 sm:p-8 shadow-xl">
          <div className="mb-5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Zpět na čas</span>
            </button>

            <span className="text-xs text-white font-bold px-3 py-1 rounded-full bg-white/10 border border-white/20">
              {selectedDate} v {selectedTime}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl font-bold text-white light:text-zinc-900 mb-1.5 flex items-center gap-2">
            <User className="w-5 h-5 text-white" />
            <span>Kontaktní údaje pro rezervaci</span>
          </h3>
          <p className="text-xs text-zinc-400 light:text-zinc-600 mb-5">
            Na e-mail vám zašleme potvrzení schůzky a odkaz pro uložení do kalendáře.
          </p>

          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmitBooking} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 light:text-zinc-700 mb-1">
                  Jméno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 text-white light:text-zinc-900 text-sm focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 light:text-zinc-700 mb-1">
                  Příjmení *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Novák"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 text-white light:text-zinc-900 text-sm focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 light:text-zinc-700 mb-1">
                E-mail (pro potvrzení) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="jan.novak@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 text-white light:text-zinc-900 text-sm focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 light:text-zinc-700 mb-1">
                Poznámka (volitelné)
              </label>
              <textarea
                rows={2}
                placeholder="Napište nám případné přání..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 text-white light:text-zinc-900 text-sm focus:outline-none focus:border-white"
              />
            </div>

            {/* Summary Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 light:text-zinc-700 space-y-1.5 mt-4">
              <div className="flex justify-between">
                <span className="text-zinc-400">Služba:</span>
                <span className="font-bold text-white">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Datum & Čas:</span>
                <span className="font-bold text-white">{selectedDate} v {selectedTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Cena:</span>
                <span className="font-bold text-white">{selectedService?.price} Kč</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-extrabold text-base transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {isSubmitting ? (
                <span>Odesílám rezervaci...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Potvrdit a rezervovat</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* STEP 5: SUCCESS CONFIRMATION & CALENDAR EXPORTS */}
      {currentStep === 5 && confirmedData && (
        <div className="max-w-2xl mx-auto w-full bg-zinc-900/95 light:bg-zinc-50 rounded-2xl border border-white/20 p-6 sm:p-10 shadow-2xl text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h3 className="text-xl sm:text-3xl font-extrabold text-white light:text-zinc-900 mb-2">
            Rezervace byla úspěšně vytvořena!
          </h3>

          <p className="text-sm text-zinc-300 light:text-zinc-700 mb-6">
            Děkujeme, těšíme se na vaši návštěvu v <strong className="text-white">{cmsConfig.shopName}</strong>.
          </p>

          {/* Details Card */}
          <div className="p-5 rounded-2xl bg-zinc-950 light:bg-zinc-100 border border-zinc-800 light:border-zinc-300 text-left mb-8 space-y-2 text-sm">
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-400">Klient:</span>
              <span className="font-bold text-white light:text-zinc-900">
                {confirmedData.reservation.firstName} {confirmedData.reservation.lastName}
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-400">Služba:</span>
              <span className="font-bold text-white">
                {confirmedData.reservation.serviceName}
              </span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/60 pb-2">
              <span className="text-zinc-400">Datum & Čas:</span>
              <span className="font-bold text-white light:text-zinc-900">
                {confirmedData.reservation.date} od {confirmedData.reservation.time} do {confirmedData.reservation.endTime}
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-zinc-400">Adresa:</span>
              <span className="font-bold text-white light:text-zinc-900">
                {cmsConfig.address}, {cmsConfig.city}
              </span>
            </div>
          </div>

          {/* Calendar Add Buttons */}
          <div className="mb-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-3">
              Přidat si termín do svého kalendáře
            </h4>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {/* Apple / Outlook iCal Download */}
              <a
                href={confirmedData.icsUrl}
                download="rezervace-barber.ics"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 light:bg-zinc-200 hover:bg-zinc-700 text-white light:text-zinc-800 text-xs font-bold flex items-center justify-center gap-2 border border-zinc-700 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-white" />
                <span>Přidat do Apple Calendar (.ics)</span>
              </a>

              {/* Google Calendar Link */}
              <a
                href={confirmedData.googleCalendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-white/10"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Přidat do Google Calendar</span>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCurrentStep(1);
              setSelectedDate('');
              setSelectedTime('');
              setConfirmedData(null);
              loadAvailability();
            }}
            className="text-xs text-zinc-400 hover:text-white underline font-medium cursor-pointer"
          >
            Vytvořit další rezervaci
          </button>
        </div>
      )}
    </section>
  );
};
