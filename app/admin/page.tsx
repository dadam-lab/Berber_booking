'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  Scissors,
  ShoppingBag,
  Palette,
  Image as ImageIcon,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Lock,
  LogOut,
  Save,
  Palmtree,
  RefreshCw,
  Eye,
  Mail,
  CalendarCheck,
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
}

interface Order {
  id: string;
  client_name: string;
  client_email: string;
  note: string;
  service_title: string;
  service_price: number;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled';
  created_at: string;
}

interface AvailabilitySlot {
  id?: string;
  date: string;
  time: string;
  is_booked: boolean;
  is_vacation: boolean;
}

interface GalleryItem {
  id: string;
  image_url: string;
  caption: string;
  order_index: number;
}

// Generates 15-minute slots from 07:00 to 22:00
const GENERATED_TIME_SLOTS: string[] = [];
for (let h = 7; h <= 21; h++) {
  for (let m = 0; m < 60; m += 15) {
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    GENERATED_TIME_SLOTS.push(timeStr);
  }
}
GENERATED_TIME_SLOTS.push('22:00');

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'calendar' | 'services' | 'orders' | 'appearance' | 'media' | 'integrations'
  >('calendar');

  // App Data States
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [services, setServices] = useState<Service[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Calendar Management State
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [activeTimes, setActiveTimes] = useState<Set<string>>(new Set());
  const [isVacation, setIsVacation] = useState<boolean>(false);
  const [bulkDates, setBulkDates] = useState<string[]>([]);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);

  // Service Form State
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);

  // Media Form State
  const [newGalleryUrl, setNewGalleryUrl] = useState<string>('');
  const [newGalleryCaption, setNewGalleryCaption] = useState<string>('');

  // Check Auth on Mount
  useEffect(() => {
    const authFlag = localStorage.getItem('barber_admin_auth');
    if (authFlag === 'true') {
      setIsAuthenticated(true);
      loadAllData();
    }
  }, []);

  const loadAllData = () => {
    fetch('/api/settings').then((r) => r.json()).then((d) => d.settings && setSettings(d.settings));
    fetch('/api/services').then((r) => r.json()).then((d) => d.services && setServices(d.services));
    fetch('/api/orders').then((r) => r.json()).then((d) => d.orders && setOrders(d.orders));
    fetch('/api/gallery').then((r) => r.json()).then((d) => d.gallery && setGallery(d.gallery));
    fetch('/api/availability').then((r) => r.json()).then((d) => d.availability && setAvailability(d.availability));
  };

  // Sync active day slots into activeTimes state
  useEffect(() => {
    if (!selectedDate) return;
    const daySlots = availability.filter((a) => a.date === selectedDate);
    const vacationFlag = daySlots.some((s) => s.is_vacation);
    setIsVacation(vacationFlag);

    const times = new Set<string>();
    daySlots.forEach((s) => {
      if (!s.is_vacation) {
        times.add(s.time.substring(0, 5));
      }
    });
    setActiveTimes(times);
  }, [selectedDate, availability]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPass = settings.admin_password || 'admin';
    if (authPassword === targetPass) {
      localStorage.setItem('barber_admin_auth', 'true');
      setIsAuthenticated(true);
      loadAllData();
    } else {
      setAuthError('Nesprávné heslo.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('barber_admin_auth');
    setIsAuthenticated(false);
    router.push('/');
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Calendar Helpers
  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => {
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return day === 0 ? 6 : day - 1;
  };
  const formatMonthYear = (date: Date) => date.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' });
  const getDateString = (year: number, month: number, day: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Calculate day availability badge status for admin calendar
  const getDateStatus = (dateStr: string) => {
    const slots = availability.filter((a) => a.date === dateStr);
    if (slots.length === 0) return 'empty';
    if (slots.some((s) => s.is_vacation)) return 'vacation';

    const freeSlots = slots.filter((s) => !s.is_booked);
    if (freeSlots.length === 0) return 'full';
    if (freeSlots.length === 1) return 'last-one';

    const ratio = freeSlots.length / slots.length;
    if (ratio >= 0.5) return 'green';
    return 'orange';
  };

  // Toggle time slot selection
  const toggleTimeSlot = (time: string) => {
    const newTimes = new Set(activeTimes);
    if (newTimes.has(time)) {
      newTimes.delete(time);
    } else {
      newTimes.add(time);
    }
    setActiveTimes(newTimes);
  };

  // Save Availability / Vacation for selected date & bulk targets
  const handleSaveAvailability = async (clearDay = false) => {
    const targetDates = Array.from(new Set([selectedDate, ...bulkDates]));

    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDates,
          timeSlots: Array.from(activeTimes),
          isVacation,
          clearDay,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(`Rozvrh byl úspěšně uložen pro ${targetDates.length} dní.`);
      setBulkDates([]);
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Chyba při ukládání rozvrhu.', 'error');
    }
  };

  // Service CRUD Actions
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService?.title || editingService.price === undefined) {
      showToast('Vyplňte název a cenu služby.', 'error');
      return;
    }

    const isUpdate = !!editingService.id;
    const method = isUpdate ? 'PUT' : 'POST';

    try {
      const res = await fetch('/api/services', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingService),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast(isUpdate ? 'Služba upravena.' : 'Nová služba vytvořena.');
      setEditingService(null);
      loadAllData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Opravdu chcete tuto službu smazat?')) return;
    try {
      const res = await fetch(`/api/services?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Služba byla smazána.');
      loadAllData();
    } catch (err) {
      showToast('Chyba při mazání služby.', 'error');
    }
  };

  // Save Settings Form
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      showToast('Všechna nastavení byla úspěšně uložena.');
    } catch (err: any) {
      showToast(err.message || 'Chyba ukládání nastavení.', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showToast('Nahrávám fotku na Supabase Storage...');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Nahrávání selhalo');
      }
      setNewGalleryUrl(data.url);
      if (!newGalleryCaption) {
        setNewGalleryCaption(file.name.replace(/\.[^/.]+$/, ''));
      }
      showToast('Fotka byla úspěšně nahrána na Supabase!');
    } catch (err: any) {
      showToast(err.message || 'Chyba při nahrávání fotky.', 'error');
    }
  };

  // Gallery Add / Delete
  const handleAddGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGalleryUrl) return;

    try {
      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: newGalleryUrl,
          caption: newGalleryCaption,
        }),
      });

      if (!res.ok) throw new Error();
      showToast('Obrázek přidán do galerie.');
      setNewGalleryUrl('');
      setNewGalleryCaption('');
      loadAllData();
    } catch (err) {
      showToast('Chyba při přidávání obrázku.', 'error');
    }
  };

  const handleDeleteGalleryItem = async (id: string) => {
    try {
      const res = await fetch(`/api/gallery?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showToast('Obrázek smazán.');
      loadAllData();
    } catch (err) {
      showToast('Chyba při mazání obrázku.', 'error');
    }
  };

  // Cancel Order from Admin
  const handleCancelOrder = async (id: string) => {
    if (!confirm('Opravdu chcete stornovat tuto objednávku a uvolnit termín?')) return;
    try {
      const res = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'cancelled' }),
      });
      if (!res.ok) throw new Error();
      showToast('Objednávka byla stornována a termín uvolněn.');
      loadAllData();
    } catch (err) {
      showToast('Chyba při rušení objednávky.', 'error');
    }
  };

  // AUTH SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="glass-card max-w-md w-full p-8 rounded-2xl border-slate-800 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Administrace Barbera</h1>
            <p className="text-xs text-slate-400 mt-1">Zadejte heslo pro vstup do ovladače</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Heslo (výchozí: admin)"
              className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500"
            />
            {authError && <p className="text-xs text-rose-400">{authError}</p>}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-600/20"
            >
              Přihlásit se
            </button>
          </form>

          <a href="/" className="text-xs text-slate-500 hover:text-slate-400 inline-block">
            &larr; Zpět na klientský web
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* STATUS TOAST */}
      {statusMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl border text-sm font-semibold shadow-2xl transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950 text-rose-300 border-rose-500/50'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* TOP BAR */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center justify-center">
            <Scissors className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg text-white">Barber Admin Panel</span>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="/"
            target="_blank"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <Eye className="w-3.5 h-3.5" /> Náhled webu
          </a>
          <button
            onClick={handleLogout}
            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-900/50"
          >
            <LogOut className="w-3.5 h-3.5" /> Odhlásit se
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* SIDEBAR NAVIGATION TABS */}
        <aside className="w-full md:w-64 space-y-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'calendar'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" /> Kalendář & Dostupnost
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'services'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" /> Správa Služeb
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'orders'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Objednávky ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'appearance'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Palette className="w-4 h-4" /> Vzhled & Texty
          </button>

          <button
            onClick={() => setActiveTab('media')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'media'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Média & Galerie
          </button>

          <button
            onClick={() => setActiveTab('integrations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'integrations'
                ? 'bg-amber-600 text-slate-950 font-bold shadow-lg shadow-amber-600/20'
                : 'text-slate-400 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" /> Integrace & API
          </button>
        </aside>

        {/* CONTENT AREA */}
        <main className="flex-1 glass-card rounded-2xl p-6 border-slate-800">
          {/* TAB 1: KALENDÁŘ A DOSTUPNOST */}
          {activeTab === 'calendar' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Správa Kalendáře & Otvírací doby</h2>
                <p className="text-xs text-slate-400">
                  Vyberte den v kalendáři, zaklikněte dostupné 15minutové termíny nebo označte den jako dovolenou.
                </p>
              </div>

              <div className="grid lg:grid-cols-12 gap-8">
                {/* CALENDAR PICKER (5 COLS) */}
                <div className="lg:col-span-5 bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() =>
                        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
                      }
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="font-bold text-sm text-amber-400 capitalize">
                      {formatMonthYear(currentMonth)}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
                      }
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-500 uppercase mb-2">
                    <span>Po</span><span>Út</span><span>St</span><span>Čt</span><span>Pá</span><span>So</span><span>Ne</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayOfMonth(currentMonth) }).map((_, i) => (
                      <div key={`empty-${i}`} className="h-9" />
                    ))}

                    {Array.from({ length: daysInMonth(currentMonth) }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateStr = getDateString(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
                      const status = getDateStatus(dateStr);
                      const isSelected = selectedDate === dateStr;
                      const isBulkSelected = bulkDates.includes(dateStr);

                      let bgStyle = 'bg-slate-900 text-slate-600';
                      let badge = '';

                      if (status === 'green') bgStyle = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300';
                      else if (status === 'orange') bgStyle = 'bg-amber-950/60 border-amber-500/40 text-amber-300';
                      else if (status === 'last-one') {
                        bgStyle = 'bg-red-950/80 border-red-500/60 text-red-300 font-bold';
                        badge = '1 termín';
                      } else if (status === 'full') bgStyle = 'bg-slate-900 border-slate-800 text-slate-600 line-through';
                      else if (status === 'vacation') {
                        bgStyle = 'bg-rose-950/60 border-rose-800/50 text-rose-400';
                        badge = 'Dovolená';
                      }

                      if (isSelected) bgStyle += ' ring-2 ring-amber-500 font-bold text-white';

                      return (
                        <button
                          key={dateStr}
                          onClick={(e) => {
                            if (e.shiftKey) {
                              // Bulk multi-select toggle
                              setBulkDates((prev) =>
                                prev.includes(dateStr)
                                  ? prev.filter((d) => d !== dateStr)
                                  : [...prev, dateStr]
                              );
                            } else {
                              setSelectedDate(dateStr);
                            }
                          }}
                          className={`h-10 rounded-lg border text-xs flex flex-col items-center justify-center relative transition-all ${bgStyle}`}
                        >
                          <span>{dayNum}</span>
                          {isBulkSelected && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1 right-1" />
                          )}
                          {badge && <span className="text-[7px] font-normal">{badge}</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* CALENDAR LEGEND */}
                  <div className="pt-3 border-t border-slate-800 text-[11px] space-y-1 text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Volno (&lt;50% obsazeno)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Částečně obsazeno (&gt;50%)
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Poslední 1 termín
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-800" /> Dovolená / Nestříhám
                    </div>
                    <p className="text-[10px] text-slate-500 pt-1">
                      * Pro hromadný výběr dnů klonování držte klávesu SHIFT při klikání na kalendář.
                    </p>
                  </div>
                </div>

                {/* TIME SLOTS GENERATOR (7 COLS) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="flex items-center justify-between bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div>
                      <h3 className="font-bold text-sm text-white">Vybraný den: {selectedDate}</h3>
                      <p className="text-xs text-slate-400">
                        {activeTimes.size} aktivních slotů
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsVacation(!isVacation)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                          isVacation
                            ? 'bg-rose-950 text-rose-300 border-rose-800'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <Palmtree className="w-3.5 h-3.5" />
                        {isVacation ? 'Zrušit dovolenou' : 'Označit jako Dovolená'}
                      </button>
                    </div>
                  </div>

                  {!isVacation && (
                    <>
                      {/* QUICK PRESET BUTTONS */}
                      <div className="flex flex-wrap gap-2 text-xs">
                        <button
                          onClick={() => {
                            const times = new Set<string>();
                            GENERATED_TIME_SLOTS.forEach((t) => {
                              const h = parseInt(t.split(':')[0]);
                              if (h >= 8 && h < 17) times.add(t);
                            });
                            setActiveTimes(times);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300"
                        >
                          Šablona 8:00–17:00
                        </button>

                        <button
                          onClick={() => {
                            const times = new Set<string>();
                            GENERATED_TIME_SLOTS.forEach((t) => {
                              const h = parseInt(t.split(':')[0]);
                              if (h >= 10 && h < 20) times.add(t);
                            });
                            setActiveTimes(times);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300"
                        >
                          Šablona 10:00–20:00
                        </button>

                        <button
                          onClick={() => setActiveTimes(new Set(GENERATED_TIME_SLOTS))}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
                        >
                          Vybrat vše
                        </button>

                        <button
                          onClick={() => setActiveTimes(new Set())}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-rose-400"
                        >
                          Vymazat sloty
                        </button>
                      </div>

                      {/* 15-MIN TIME SLOTS GRID */}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
                        {GENERATED_TIME_SLOTS.map((t) => {
                          const isActive = activeTimes.has(t);
                          return (
                            <button
                              key={t}
                              onClick={() => toggleTimeSlot(t)}
                              className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                                isActive
                                  ? 'bg-amber-600 border-amber-500 text-slate-950 font-bold'
                                  : 'bg-slate-900/60 border-slate-800/80 text-slate-500 hover:text-white'
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* BULK ACTION CLONE NOTICE */}
                  {bulkDates.length > 0 && (
                    <div className="bg-amber-950/30 border border-amber-500/30 p-3 rounded-xl text-xs text-amber-300 flex justify-between items-center">
                      <span>
                        Vybráno <strong>{bulkDates.length}</strong> dalších dnů pro klonování rozvrhu.
                      </span>
                      <button
                        onClick={() => setBulkDates([])}
                        className="text-amber-400 underline font-semibold"
                      >
                        Zrušit výběr
                      </button>
                    </div>
                  )}

                  {/* SAVE ACTIONS */}
                  <div className="flex gap-3 pt-4 border-t border-slate-800">
                    <button
                      onClick={() => handleSaveAvailability(false)}
                      className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Uložit rozvrh
                    </button>

                    <button
                      onClick={() => handleSaveAvailability(true)}
                      className="py-3 px-4 rounded-xl bg-slate-900 border border-slate-800 text-rose-400 hover:bg-rose-950/40 text-xs font-semibold"
                    >
                      Nastavit "Nestříhám"
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SPRÁVA SLUŽEB */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">Správa Nabízených Služeb</h2>
                  <p className="text-xs text-slate-400">Přidávejte, upravujte nebo vypínejte služby.</p>
                </div>
                <button
                  onClick={() =>
                    setEditingService({
                      title: '',
                      description: '',
                      price: 500,
                      duration_minutes: 30,
                      is_active: true,
                    })
                  }
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-600/20"
                >
                  <Plus className="w-4 h-4" /> Přidat službu
                </button>
              </div>

              {/* SERVICES LIST */}
              <div className="grid gap-4">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex justify-between items-center gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-white">{svc.title}</h4>
                        <span className="text-xs text-amber-400 font-bold">{svc.price} Kč</span>
                        <span className="text-xs text-slate-500">({svc.duration_minutes} min)</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full ${
                            svc.is_active
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {svc.is_active ? 'Aktivní' : 'Skrytá'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{svc.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingService(svc)}
                        className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(svc.id)}
                        className="p-2 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-950 border border-rose-900/40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* EDIT / CREATE SERVICE FORM MODAL */}
              {editingService && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                  <form
                    onSubmit={handleSaveService}
                    className="glass-card max-w-md w-full p-6 rounded-2xl border-slate-800 space-y-4"
                  >
                    <h3 className="text-lg font-bold text-white">
                      {editingService.id ? 'Upravit službu' : 'Nová služba'}
                    </h3>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Název služby *</label>
                      <input
                        type="text"
                        required
                        value={editingService.title || ''}
                        onChange={(e) =>
                          setEditingService({ ...editingService, title: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Popis služby</label>
                      <textarea
                        rows={3}
                        value={editingService.description || ''}
                        onChange={(e) =>
                          setEditingService({ ...editingService, description: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Cena (Kč) *</label>
                        <input
                          type="number"
                          required
                          value={editingService.price ?? 500}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              price: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Trvání (minut)</label>
                        <input
                          type="number"
                          required
                          value={editingService.duration_minutes ?? 30}
                          onChange={(e) =>
                            setEditingService({
                              ...editingService,
                              duration_minutes: Number(e.target.value),
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={editingService.is_active ?? true}
                        onChange={(e) =>
                          setEditingService({ ...editingService, is_active: e.target.checked })
                        }
                        className="rounded bg-slate-900 border-slate-800 text-amber-500"
                      />
                      <label htmlFor="is_active" className="text-xs text-slate-300">
                        Zobrazovat v nabídce na webu
                      </label>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setEditingService(null)}
                        className="w-1/2 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold"
                      >
                        Zrušit
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                      >
                        Uložit službu
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: OBJEDNÁVKY */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Přehled Objednávek</h2>
                <p className="text-xs text-slate-400">Seznam všech nadcházejících i proběhlých rezervací.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Datum & Čas</th>
                      <th className="py-3 px-4">Klient</th>
                      <th className="py-3 px-4">Služba</th>
                      <th className="py-3 px-4">Cena</th>
                      <th className="py-3 px-4">Stav</th>
                      <th className="py-3 px-4 text-right">Akce</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/40">
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                          {ord.date} v {ord.time}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{ord.client_name}</div>
                          <div className="text-[11px] text-slate-500">{ord.client_email}</div>
                        </td>
                        <td className="py-3 px-4">{ord.service_title}</td>
                        <td className="py-3 px-4 font-bold text-amber-400">{ord.service_price} Kč</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                              ord.status === 'confirmed'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {ord.status === 'confirmed' ? 'Potvrzeno' : 'Stornováno'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedOrderDetails(ord)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
                          >
                            Detail
                          </button>
                          {ord.status === 'confirmed' && (
                            <button
                              onClick={() => handleCancelOrder(ord.id)}
                              className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-400 border border-rose-900/40 hover:bg-rose-950 text-[11px]"
                            >
                              Storno
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ORDER DETAIL MODAL */}
              {selectedOrderDetails && (
                <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="glass-card max-w-md w-full p-6 rounded-2xl border-slate-800 space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-3">
                      Detail Objednávky #{selectedOrderDetails.id.substring(0, 8)}
                    </h3>

                    <div className="space-y-2 text-xs">
                      <p>
                        <strong className="text-slate-400">Jméno klienta:</strong>{' '}
                        <span className="text-white font-semibold">{selectedOrderDetails.client_name}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">E-mail:</strong>{' '}
                        <span className="text-amber-400">{selectedOrderDetails.client_email}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Služba:</strong>{' '}
                        <span className="text-white">{selectedOrderDetails.service_title}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Cena:</strong>{' '}
                        <span className="text-amber-400 font-bold">{selectedOrderDetails.service_price} Kč</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Termín:</strong>{' '}
                        <span className="text-white">{selectedOrderDetails.date} v {selectedOrderDetails.time}</span>
                      </p>
                      <p>
                        <strong className="text-slate-400">Poznámka:</strong>{' '}
                        <span className="text-slate-300">{selectedOrderDetails.note || 'Bez poznámky'}</span>
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedOrderDetails(null)}
                      className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold mt-4"
                    >
                      Zavřít
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VZHLED & TEXTY */}
          {activeTab === 'appearance' && (
            <form onSubmit={handleSaveSettings} className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white">Vzhled, Texty & Barevné Téma</h2>
                <p className="text-xs text-slate-400">
                  Veškerý obsah a barvy se táhnou dynamicky z databáze přes CSS proměnné.
                </p>
              </div>

              {/* BARBER INFO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Informace o Barberovi
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Jméno Barbera</label>
                    <input
                      type="text"
                      value={settings.barber_name || ''}
                      onChange={(e) => setSettings({ ...settings, barber_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Pozice / Titul</label>
                    <input
                      type="text"
                      value={settings.barber_role || ''}
                      onChange={(e) => setSettings({ ...settings, barber_role: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Bio / Text o mně</label>
                  <textarea
                    rows={3}
                    value={settings.barber_bio || ''}
                    onChange={(e) => setSettings({ ...settings, barber_bio: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                </div>
              </div>

              {/* CONTACT INFO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Kontaktní Údaje
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Telefonní číslo</label>
                    <input
                      type="text"
                      value={settings.contact_phone || ''}
                      onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Kontaktní E-mail (Barbera)</label>
                    <input
                      type="email"
                      value={settings.contact_email || ''}
                      onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Adresa provozovny</label>
                  <input
                    type="text"
                    value={settings.contact_address || ''}
                    onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Google Maps Embed URL</label>
                  <input
                    type="text"
                    value={settings.google_maps_iframe || ''}
                    onChange={(e) => setSettings({ ...settings, google_maps_iframe: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              {/* COLOR PICKERS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Barevné Téma (CSS Proměnné)
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Hlavní pozadí (BG)</label>
                    <input
                      type="color"
                      value={settings.bg_color || '#020617'}
                      onChange={(e) => setSettings({ ...settings, bg_color: e.target.value })}
                      className="w-full h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Primární barva</label>
                    <input
                      type="color"
                      value={settings.primary_color || '#0f172a'}
                      onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                      className="w-full h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sekundární / Akcent</label>
                    <input
                      type="color"
                      value={settings.secondary_color || '#d97706'}
                      onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                      className="w-full h-10 rounded-xl bg-slate-900 border border-slate-800 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="py-3 px-8 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-600/20"
              >
                Uložit změny vzhledu a textů
              </button>
            </form>
          )}

          {/* TAB 5: MÉDIA */}
          {activeTab === 'media' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-white">Správa Médií a Galerie</h2>
                <p className="text-xs text-slate-400">Uploadujte URL loga, profilovky a fotek do galerie.</p>
              </div>

              {/* LOGO & AVATAR URLS */}
              <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Logo & Profilová Fotka
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">URL Loga (Volitelné)</label>
                    <input
                      type="text"
                      value={settings.logo_url || ''}
                      onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">URL Profilové Fotky Barbera</label>
                    <input
                      type="text"
                      value={settings.barber_avatar || ''}
                      onChange={(e) => setSettings({ ...settings, barber_avatar: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* ADD TO GALLERY FORM */}
              <form onSubmit={handleAddGalleryItem} className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Přidat fotku do Galerie
                </h3>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nahrát soubor ze zařízení</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">nebo URL Obrázku *</label>
                    <input
                      type="url"
                      required
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Popisek fotky</label>
                    <input
                      type="text"
                      value={newGalleryCaption}
                      onChange={(e) => setNewGalleryCaption(e.target.value)}
                      placeholder="Klasický Fade střih"
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="py-2.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs"
                >
                  Přidat do galerie
                </button>
              </form>

              {/* GALLERY GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {gallery.map((item) => (
                  <div key={item.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-800">
                    <Image src={item.image_url} alt={item.caption} fill className="object-cover" />
                    <button
                      onClick={() => handleDeleteGalleryItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {item.caption && (
                      <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 p-2 text-[10px] text-center text-slate-300">
                        {item.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: INTEGRACE */}
          {activeTab === 'integrations' && (
            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white">Integrace & API Klíče</h2>
                <p className="text-xs text-slate-400">Nastavení Resend e-mailů a Google Kalendář Service Account.</p>
              </div>

              {/* RESEND */}
              <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Resend E-mailová Služba
                </h3>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Resend API Key</label>
                  <input
                    type="password"
                    value={settings.resend_api_key || ''}
                    onChange={(e) => setSettings({ ...settings, resend_api_key: e.target.value })}
                    placeholder="re_..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Adresa Odesílatele (Sender Email)</label>
                  <input
                    type="email"
                    value={settings.sender_email || ''}
                    onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    placeholder="rezervace@barberstudio.cz"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm"
                  />
                </div>
              </div>

              {/* GOOGLE CALENDAR */}
              <div className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
                  Google Kalendář Service Account API
                </h3>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Google Calendar ID</label>
                  <input
                    type="text"
                    value={settings.google_calendar_id || ''}
                    onChange={(e) => setSettings({ ...settings, google_calendar_id: e.target.value })}
                    placeholder="primary nebo xxx@group.calendar.google.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Service Account Email</label>
                  <input
                    type="email"
                    value={settings.google_service_account_email || ''}
                    onChange={(e) => setSettings({ ...settings, google_service_account_email: e.target.value })}
                    placeholder="name@project.iam.gserviceaccount.com"
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Google Private Key (PEM)</label>
                  <textarea
                    rows={4}
                    value={settings.google_private_key || ''}
                    onChange={(e) => setSettings({ ...settings, google_private_key: e.target.value })}
                    placeholder="-----BEGIN PRIVATE KEY-----\n..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="py-3 px-8 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-amber-600/20"
              >
                Uložit integrace
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
