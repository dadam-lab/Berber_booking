import React, { useEffect, useState } from 'react';
import { X, ShieldCheck, Lock, Calendar, Settings, Image, Clock, Mail, Bell, RefreshCw, Plus, Trash2, Check, AlertCircle, Send, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { CmsConfig, Service, GalleryItem, Reservation, ScheduleTemplate } from '@/lib/types';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  cmsConfig: CmsConfig;
  services: Service[];
  gallery: GalleryItem[];
  reservations: Reservation[];
  isAuthenticated: boolean;
  onLogin: (password: string) => Promise<boolean>;
  onSaveCms: (updatedConfig: Partial<CmsConfig>, newPass?: string) => Promise<void>;
  onSaveServices: (services: Service[]) => Promise<void>;
  onSaveGallery: (gallery: GalleryItem[]) => Promise<void>;
  onUpdateReservationStatus: (id: string, status: 'confirmed' | 'cancelled' | 'completed', reason?: string) => Promise<void>;
  onDeleteReservation: (id: string) => Promise<void>;
  onRefreshData: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  cmsConfig,
  services,
  gallery,
  reservations,
  isAuthenticated,
  onLogin,
  onSaveCms,
  onSaveServices,
  onSaveGallery,
  onUpdateReservationStatus,
  onDeleteReservation,
  onRefreshData,
}) => {
  if (!isOpen) return null;

  // Login Form State
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Tab: 'reservations' | 'cms' | 'gallery' | 'vacation' | 'services' | 'schedules' | 'email_calendar' | 'cron' | 'bulk_cancel'
  const [activeTab, setActiveTab] = useState<'reservations' | 'cms' | 'gallery' | 'vacation' | 'services' | 'schedules' | 'email_calendar' | 'cron' | 'bulk_cancel'>('reservations');

  // Bulk Cancel State
  const [bulkCancelTargetDates, setBulkCancelTargetDates] = useState<string[]>([]);
  const [bulkCancelSelectedSlots, setBulkCancelSelectedSlots] = useState<Set<string>>(new Set());
  const [bulkCancelReason, setBulkCancelReason] = useState<string>('');
  const [bulkCancelAllDay, setBulkCancelAllDay] = useState<boolean>(false);
  const [isExecBulkCancel, setIsExecBulkCancel] = useState<boolean>(false);

  // Draft CMS State
  const [cmsDraft, setCmsDraft] = useState<CmsConfig>({ ...cmsConfig });
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [servicesDraft, setServicesDraft] = useState<Service[]>([...services]);
  const [galleryDraft, setGalleryDraft] = useState<GalleryItem[]>([...gallery]);
  const [blockedDaysDraft, setBlockedDaysDraft] = useState<string[]>(cmsConfig.blockedDays || []);
  const [vacationCalDate, setVacationCalDate] = useState(() => new Date());

  // Interactive Calendar & Time Templates State
  const [scheduleCalMonth, setScheduleCalMonth] = useState(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [editingDateSlots, setEditingDateSlots] = useState<string[]>([]);
  const [datesWithSlotsMap, setDatesWithSlotsMap] = useState<Record<string, string[]>>({});
  
  // Templates state
  const [templatesList, setTemplatesList] = useState<ScheduleTemplate[]>(cmsConfig.scheduleTemplates || [
    {
      id: 'tpl-1',
      name: 'Ranní směna (07:00 - 15:00)',
      timeSlots: [
        '07:00', '07:15', '07:30', '07:45', '08:00', '08:15', '08:30', '08:45',
        '09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45',
        '11:00', '11:15', '11:30', '11:45', '12:00', '12:15', '12:30', '12:45',
        '13:00', '13:15', '13:30', '13:45', '14:00', '14:15', '14:30', '14:45'
      ]
    },
    {
      id: 'tpl-2',
      name: 'Celý den (08:00 - 20:00)',
      timeSlots: [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
      ]
    }
  ]);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateSlots, setNewTemplateSlots] = useState<string[]>([]);

  // Multi-date modal state
  const [multiDateModalOpen, setMultiDateModalOpen] = useState(false);
  const [multiDateMonth, setMultiDateMonth] = useState(() => new Date());
  const [multiDateSelections, setMultiDateSelections] = useState<string[]>([]);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  const generate15MinuteSlots = (startTime = '07:00', endTime = '22:00') => {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    let minutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    while (minutes + 15 <= endMinutes) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      minutes += 15;
    }

    return slots;
  };

  const allTimeSlots = generate15MinuteSlots('07:00', '22:00');

  const previewColors = () => {
    const root = document.documentElement;
    if (cmsDraft.primaryColor) {
      root.style.setProperty('--primary-color', cmsDraft.primaryColor);
    }
    if (cmsDraft.secondaryColor) {
      root.style.setProperty('--secondary-color', cmsDraft.secondaryColor);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    previewColors();
  }, [cmsDraft.primaryColor, cmsDraft.secondaryColor, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      const root = document.documentElement;
      if (cmsConfig.primaryColor) {
        root.style.setProperty('--primary-color', cmsConfig.primaryColor);
      }
      if (cmsConfig.secondaryColor) {
        root.style.setProperty('--secondary-color', cmsConfig.secondaryColor);
      }
    };
  }, [cmsConfig.primaryColor, cmsConfig.secondaryColor, isOpen]);

  // Gallery New Item Upload State
  const [newGalleryTitle, setNewGalleryTitle] = useState('');
  const [newGalleryCategory, setNewGalleryCategory] = useState('Střihy');

  // Reservation filter
  const [resStatusFilter, setResStatusFilter] = useState<string>('all');
  const [resSearchQuery, setResSearchQuery] = useState<string>('');

  // Status Feedback & Errors
  const [statusMsg, setStatusMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [cronResult, setCronResult] = useState<any>(null);

  const fetchAvailabilityForDate = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/availability?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        const slots = (data.availability || []).map((item: any) => (item.time || '').substring(0, 5)).filter(Boolean);
        setEditingDateSlots(slots);
        setDatesWithSlotsMap((prev) => ({ ...prev, [dateStr]: slots }));
      }
    } catch (err) {
      console.error('Fetch availability error:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setServicesDraft(services);
      setGalleryDraft(gallery);
      setCmsDraft(cmsConfig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'schedules' && selectedCalendarDate) {
      fetchAvailabilityForDate(selectedCalendarDate);
    }
  }, [isOpen, activeTab, selectedCalendarDate]);

  const handleSaveSingleDay = async () => {
    if (!selectedCalendarDate) return;
    setIsSavingAvailability(true);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDates: [selectedCalendarDate],
          timeSlots: editingDateSlots,
          replaceSlots: true,
        }),
      });

      if (res.ok) {
        setDatesWithSlotsMap((prev) => ({ ...prev, [selectedCalendarDate]: editingDateSlots }));
        setStatusMsg(`Rozvrh pro ${selectedCalendarDate} byl úspěšně uložen.`);
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        const err = await res.json();
        alert(err.error || 'Chyba při ukládání.');
      }
    } catch (err) {
      alert('Chyba při komunikaci se serverem.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleSaveMultiDays = async () => {
    if (multiDateSelections.length === 0) return;
    setIsSavingAvailability(true);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDates: multiDateSelections,
          timeSlots: editingDateSlots,
          replaceSlots: true,
        }),
      });

      if (res.ok) {
        const updatedMap = { ...datesWithSlotsMap };
        for (const d of multiDateSelections) {
          updatedMap[d] = editingDateSlots;
        }
        setDatesWithSlotsMap(updatedMap);
        setMultiDateModalOpen(false);
        setStatusMsg(`Rozvrh byl úspěšně uložen pro ${multiDateSelections.length} dní.`);
        setTimeout(() => setStatusMsg(''), 4000);
      } else {
        const err = await res.json();
        alert(err.error || 'Chyba při ukládání.');
      }
    } catch (err) {
      alert('Chyba při komunikaci se serverem.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Zadejte prosím název šablony.');
      return;
    }
    const newTpl: ScheduleTemplate = {
      id: 'tpl-' + Date.now(),
      name: newTemplateName.trim(),
      timeSlots: newTemplateSlots,
    };
    const updated = [...templatesList, newTpl];
    setTemplatesList(updated);
    setIsCreatingTemplate(false);
    setNewTemplateName('');
    setNewTemplateSlots([]);
    await onSaveCms({ ...cmsDraft, scheduleTemplates: updated });
    setStatusMsg(`Šablona "${newTpl.name}" byla úspěšně uložena.`);
    setTimeout(() => setStatusMsg(''), 4000);
  };

  const handleDeleteTemplate = async (id: string) => {
    const updated = templatesList.filter((t) => t.id !== id);
    setTemplatesList(updated);
    await onSaveCms({ ...cmsDraft, scheduleTemplates: updated });
  };

  const getDaysForMonth = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startingDay = firstDay.getDay() - 1; // 0 = Mon
    if (startingDay === -1) startingDay = 6; // Sunday

    const daysCount = lastDay.getDate();
    const days: ({ dateStr: string; dayNum: number; hasCustomSlots: boolean } | null)[] = [];

    for (let i = 0; i < startingDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysCount; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hasCustom = (datesWithSlotsMap[dateStr] || []).length > 0;
      days.push({ dateStr, dayNum: i, hasCustomSlots: hasCustom });
    }

    return days;
  };

  // Helper for single image file upload to Supabase Storage via /api/upload
  const uploadImageFile = async (file: File, category: string, title: string) => {
    setUploadError('');
    if (!file.type.startsWith('image/')) {
      setUploadError('Chyba: Nahrajte pouze platný obrázek (JPG, PNG, WEBP, GIF).');
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Nahrávání obrázku selhalo.');
      }

      const newItem: GalleryItem = {
        id: 'gal-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: title || file.name.replace(/\.[^/.]+$/, ''),
        category: category || 'Střihy',
        imageUrl: data.url,
      };

      setGalleryDraft((prev) => [newItem, ...prev]);
    } catch (err: any) {
      console.error('[uploadImageFile Error]:', err);
      setUploadError(err.message || 'Chyba při nahrávání fotky na Supabase Storage.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    const ok = await onLogin(passwordInput);
    setIsLoggingIn(false);
    if (!ok) {
      setLoginError('Nesprávné heslo. Přístup odepřen.');
    }
  };

  const handleSaveCmsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    await onSaveCms(cmsDraft, newAdminPassword || undefined);
    setNewAdminPassword('');
    setStatusMsg('Změny webu byly úspěšně uloženy!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveServicesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('');
    await onSaveServices(servicesDraft);
    setStatusMsg('Změny služeb byly uloženy!');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleRunTestEmail = async () => {
    setStatusMsg('');
    try {
      const res = await fetch('/api/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testEmailRecipient }),
      });
      const data = await res.json();
      setStatusMsg(data.message || 'Testovací email odeslán');
    } catch (err) {
      setStatusMsg('Chyba při odesílání testovacího e-mailu.');
    }
  };

  const handleRunCronReminders = async () => {
    setCronResult(null);
    try {
      const res = await fetch('/api/cron-reminders', { method: 'POST' });
      const data = await res.json();
      setCronResult(data);
      onRefreshData();
    } catch (err) {
      setCronResult({ error: 'Chyba při spuštění cronu.' });
    }
  };

  // Filtered reservations list
  const filteredReservations = reservations.filter((r) => {
    const matchesStatus = resStatusFilter === 'all' || r.status === resStatusFilter;
    const q = resSearchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      r.firstName.toLowerCase().includes(q) ||
      r.lastName.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100 flex items-center gap-2">
                <span>Administrace & CMS Control Panel</span>
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                {cmsConfig.shopName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOT AUTHENTICATED STATE */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-12 text-center max-w-md mx-auto my-auto w-full">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100 mb-2">Přihlášení do administrace</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Zadejte heslo administrátora pro přístup k nastavení a správě rezervací.
            </p>

            {loginError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="password"
                required
                placeholder="Zadejte heslo..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-100 text-sm focus:outline-none focus:border-white text-center font-mono"
              />
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm transition-all shadow-md cursor-pointer"
              >
                {isLoggingIn ? 'Ověřuji...' : 'Vstoupit do Admin CMS'}
              </button>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED DASHBOARD */
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            
            {/* Sidebar Navigation Tabs */}
            <div className="w-full md:w-64 bg-zinc-950 p-3 border-b md:border-b-0 md:border-r border-zinc-800 flex md:flex-col gap-1 overflow-x-auto flex-shrink-0">
              <button
                onClick={() => setActiveTab('reservations')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'reservations'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Rezervace ({reservations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('cms')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'cms'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>Obsah & Vzhled webu</span>
              </button>

              <button
                onClick={() => setActiveTab('gallery')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'gallery'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Image className="w-4 h-4" />
                <span>Správa Galerie ({galleryDraft.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('services')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'services'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Správa služeb ({servicesDraft.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('vacation')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'vacation'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Calendar className="w-4 h-4 text-rose-400" />
                <span>Dovolená & Blokace ({blockedDaysDraft.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('bulk_cancel')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'bulk_cancel'
                    ? 'bg-rose-600 text-white shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Storno termínů & Důvod</span>
              </button>

              <button
                onClick={() => setActiveTab('schedules')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'schedules'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Otevírací doba</span>
              </button>

              <button
                onClick={() => setActiveTab('email_calendar')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'email_calendar'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>E-maily & Kalendář</span>
              </button>

              <button
                onClick={() => setActiveTab('cron')}
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'cron'
                    ? 'bg-white text-zinc-950 shadow-md font-extrabold'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Připomínky & Cron</span>
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-900">
              
              {statusMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}

              {/* TAB 1: RESERVATIONS */}
              {activeTab === 'reservations' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-zinc-100">Přehled všech rezervací</h3>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="text"
                        placeholder="Hledat jméno / email..."
                        value={resSearchQuery}
                        onChange={(e) => setResSearchQuery(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                      <select
                        value={resStatusFilter}
                        onChange={(e) => setResStatusFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      >
                        <option value="all">Všechny stav</option>
                        <option value="confirmed">Potvrzené</option>
                        <option value="completed">Dokončené</option>
                        <option value="cancelled">Zrušené</option>
                      </select>
                      <button
                        onClick={onRefreshData}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="Obnovit"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {filteredReservations.length === 0 ? (
                    <p className="text-xs text-zinc-500 py-8 text-center">Žádné rezervace neodpovídají zadání.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="bg-zinc-950 text-zinc-400 font-bold uppercase border-b border-zinc-800">
                          <tr>
                            <th className="p-3">Datum & Čas</th>
                            <th className="p-3">Klient</th>
                            <th className="p-3">Služba</th>
                            <th className="p-3">Kontakt</th>
                            <th className="p-3">Stav</th>
                            <th className="p-3 text-right">Akce</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {filteredReservations.map((resItem) => (
                            <tr key={resItem.id} className="hover:bg-zinc-950/40">
                              <td className="p-3 font-mono">
                                <div className="font-bold text-zinc-100">{resItem.date}</div>
                                <div className="text-amber-400">{resItem.time} - {resItem.endTime}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-zinc-100">{resItem.firstName} {resItem.lastName}</div>
                                {resItem.note && <div className="text-[10px] text-zinc-400 italic">"{resItem.note}"</div>}
                              </td>
                              <td className="p-3 font-medium text-amber-300">
                                {resItem.serviceName} ({resItem.servicePrice} Kč)
                              </td>
                              <td className="p-3">
                                <div>{resItem.email}</div>
                              </td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                  resItem.status === 'confirmed' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' :
                                  resItem.status === 'completed' ? 'bg-blue-950 text-blue-400 border border-blue-500/30' :
                                  'bg-rose-950 text-rose-400 border border-rose-500/30'
                                }`}>
                                  {resItem.status}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {resItem.status === 'confirmed' && (
                                    <button
                                      onClick={() => onUpdateReservationStatus(resItem.id, 'completed')}
                                      className="px-2 py-1 rounded bg-blue-950 text-blue-300 hover:bg-blue-900 text-[10px]"
                                    >
                                      Dokončit
                                    </button>
                                  )}
                                  {resItem.status !== 'cancelled' && (
                                    <button
                                      onClick={() => {
                                        const reasonPrompt = prompt('Zadejte důvod zrušení rezervace pro klienta (volitelné):', '');
                                        if (reasonPrompt === null) return;
                                        onUpdateReservationStatus(resItem.id, 'cancelled', reasonPrompt);
                                      }}
                                      className="px-2 py-1 rounded bg-rose-950 text-rose-300 hover:bg-rose-900 text-[10px]"
                                    >
                                      Zrušit
                                    </button>
                                  )}
                                  <button
                                    onClick={() => onDeleteReservation(resItem.id)}
                                    className="p-1 rounded bg-zinc-800 hover:bg-rose-900 text-zinc-400 hover:text-rose-200"
                                    title="Smazat záznam"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: SITE CMS CUSTOMIZATION */}
              {activeTab === 'cms' && (
                <form onSubmit={handleSaveCmsSubmit} className="space-y-6">
                  <h3 className="text-base font-bold text-zinc-100 mb-2">Nastavení Obsahu Webové Aplikace</h3>

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Text Contents */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Název barbershopu</label>
                    <input
                      type="text"
                      value={cmsDraft.shopName}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, shopName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Jméno Barbera</label>
                      <input
                        type="text"
                        value={cmsDraft.ownerName}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, ownerName: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Titulek Barbera</label>
                      <input
                        type="text"
                        value={cmsDraft.ownerTitle}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, ownerTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Hero Hlavní Nadpis</label>
                    <input
                      type="text"
                      value={cmsDraft.heroHeadline}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, heroHeadline: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                    />
                  </div>

                  {/* Logo & Owner Photo File Uploads */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div>
                      <label className="block text-xs font-bold text-amber-500 mb-1">
                        Logo Barbershopu (JPG / PNG)
                        {isUploadingImage && <span className="ml-2 text-amber-400 animate-pulse text-[10px]">Nahrávám...</span>}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsUploadingImage(true);
                            setUploadError('');
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (!res.ok || !data.url) throw new Error(data.error || 'Nahrávání selhalo.');
                            setCmsDraft((prev) => ({ ...prev, logoUrl: data.url }));
                          } catch (err: any) {
                            setUploadError(err.message);
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }}
                        className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-zinc-950 hover:file:bg-zinc-200 cursor-pointer disabled:opacity-50"
                      />
                      {cmsDraft.logoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={cmsDraft.logoUrl} alt="Logo Preview" className="h-8 rounded object-cover border border-zinc-700" />
                          <button
                            type="button"
                            onClick={() => setCmsDraft({ ...cmsDraft, logoUrl: '' })}
                            className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                          >
                            Odstranit logo
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-amber-500 mb-1">
                        Fotografie Barbera (JPG / PNG)
                        {isUploadingImage && <span className="ml-2 text-amber-400 animate-pulse text-[10px]">Nahrávám...</span>}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingImage}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            setIsUploadingImage(true);
                            setUploadError('');
                            const formData = new FormData();
                            formData.append('file', file);
                            const res = await fetch('/api/upload', { method: 'POST', body: formData });
                            const data = await res.json();
                            if (!res.ok || !data.url) throw new Error(data.error || 'Nahrávání selhalo.');
                            setCmsDraft((prev) => ({ ...prev, ownerPhotoUrl: data.url }));
                          } catch (err: any) {
                            setUploadError(err.message);
                          } finally {
                            setIsUploadingImage(false);
                          }
                        }}
                        className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-zinc-950 hover:file:bg-zinc-200 cursor-pointer disabled:opacity-50"
                      />
                      {cmsDraft.ownerPhotoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <img src={cmsDraft.ownerPhotoUrl} alt="Barber Preview" className="h-10 w-10 rounded-full object-cover border border-zinc-700" />
                          <span className="text-[10px] text-zinc-400">Načtena fotografie</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Instagram Studia (URL)</label>
                      <input
                        type="text"
                        value={cmsDraft.instagramUrl || ''}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, instagramUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Osobní Instagram Barbera (URL)</label>
                      <input
                        type="text"
                        value={cmsDraft.personalInstagramUrl || ''}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, personalInstagramUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={cmsDraft.instagramEnabled !== false}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, instagramEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
                      />
                      Zobrazit IG Studia
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
                      <input
                        type="checkbox"
                        checked={cmsDraft.personalInstagramEnabled !== false}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, personalInstagramEnabled: e.target.checked })}
                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-900"
                      />
                      Zobrazit Osobní IG Barbera
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Adresa</label>
                      <input
                        type="text"
                        value={cmsDraft.address}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, address: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Město</label>
                      <input
                        type="text"
                        value={cmsDraft.city}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, city: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Telefon</label>
                      <input
                        type="text"
                        value={cmsDraft.phone}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, phone: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">E-mail pro kontakt</label>
                      <input
                        type="email"
                        value={cmsDraft.email}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, email: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Google Maps URL</label>
                      <input
                        type="text"
                        value={cmsDraft.googleMapsUrl}
                        onChange={(e) => setCmsDraft({ ...cmsDraft, googleMapsUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Text pod nadpisem kontakty</label>
                    <textarea
                      rows={3}
                      value={cmsDraft.contactDescription}
                      onChange={(e) => setCmsDraft({ ...cmsDraft, contactDescription: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold text-amber-500">Změna hesla Administrátora</label>
                    <input
                      type="password"
                      placeholder="Nové heslo (ponechte prázdné pro beze změny)"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    Uložit změny CMS & Vzhledu
                  </button>
                </form>
              )}

              {/* TAB 3: GALLERY MANAGEMENT (Direct File Upload JPG/PNG) */}
              {activeTab === 'gallery' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-zinc-100">Správa Galerie & Portfolia</h3>
                      <p className="text-xs text-zinc-400">
                        Nahrajte fotografii přímo ze zařízení (přijímány pouze soubory JPG a PNG).
                      </p>
                    </div>
                  </div>

                  {uploadError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {/* Add New Gallery Item Box */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      <span>Přidat novou fotografii do galerie</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Název ukázky</label>
                        <input
                          type="text"
                          placeholder="Např. Textured Fade Střih"
                          value={newGalleryTitle}
                          onChange={(e) => setNewGalleryTitle(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Kategorie</label>
                        <select
                          value={newGalleryCategory}
                          onChange={(e) => setNewGalleryCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                        >
                          <option value="Střihy">Střihy</option>
                          <option value="Vousy">Vousy</option>
                          <option value="Kombo">Kombo</option>
                          <option value="Interiér">Interiér</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">
                          Vybrat soubor (JPG, PNG, WEBP)
                          {isUploadingImage && <span className="ml-2 text-amber-400 animate-pulse font-bold">Nahrávám na Supabase Storage...</span>}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={isUploadingImage}
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            if (files.length === 0) return;

                            for (const file of files) {
                              await uploadImageFile(file, newGalleryCategory, newGalleryTitle);
                            }
                            setNewGalleryTitle('');
                            e.target.value = '';
                          }}
                          className="w-full text-xs text-zinc-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white file:text-zinc-950 hover:file:bg-zinc-200 cursor-pointer disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Existing Gallery List Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto pr-1">
                    {galleryDraft.map((item) => (
                      <div key={item.id} className="relative group rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-32 object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="p-2">
                          <span className="text-[9px] font-extrabold text-amber-500 uppercase">{item.category}</span>
                          <h5 className="text-xs font-bold text-zinc-200 truncate">{item.title}</h5>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGalleryDraft(galleryDraft.filter((g) => g.id !== item.id))}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-950/80 text-rose-300 hover:bg-rose-900 cursor-pointer"
                          title="Smazat z galerie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveGallery(galleryDraft);
                      setStatusMsg('Galerie byla úspěšně uložena!');
                      setTimeout(() => setStatusMsg(''), 3000);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    Uložit změny v galerii
                  </button>
                </div>
              )}

              {/* TAB: VACATION & BLOCKED DAYS MANAGEMENT */}
              {activeTab === 'vacation' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 mb-1 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-rose-500" />
                      <span>Správa Dovolené a Blokace Termínů</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Pouhým kliknutím na dny v kalendáři označte, kdy máte dovolenou nebo zavřeno. Tyto dny budou pro klienty okamžitě neaktivní.
                    </p>
                  </div>

                  {/* Interactive Month Picker for Vacation */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                        {vacationCalDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                      </h4>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(vacationCalDate);
                            d.setMonth(d.getMonth() - 1);
                            setVacationCalDate(d);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-amber-400 cursor-pointer"
                        >
                          &larr; Předchozí
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date(vacationCalDate);
                            d.setMonth(d.getMonth() + 1);
                            setVacationCalDate(d);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-amber-400 cursor-pointer"
                        >
                          Následující &rarr;
                        </button>
                      </div>
                    </div>

                    {/* Calendar Grid for Vacation Selection */}
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'].map((day) => (
                        <div key={day} className="text-[10px] font-bold text-zinc-500 uppercase py-1">
                          {day}
                        </div>
                      ))}

                      {(() => {
                        const vYear = vacationCalDate.getFullYear();
                        const vMonth = vacationCalDate.getMonth();
                        const daysInM = new Date(vYear, vMonth + 1, 0).getDate();
                        const firstD = new Date(vYear, vMonth, 1);
                        let startWeekDay = firstD.getDay() - 1;
                        if (startWeekDay === -1) startWeekDay = 6;

                        const elements = [];

                        // Empty padding cells
                        for (let i = 0; i < startWeekDay; i++) {
                          elements.push(<div key={`v-empty-${i}`} className="h-10 rounded-lg bg-transparent" />);
                        }

                        // Days
                        for (let d = 1; d <= daysInM; d++) {
                          const dateObj = new Date(vYear, vMonth, d);
                          const yyyy = dateObj.getFullYear();
                          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                          const dd = String(dateObj.getDate()).padStart(2, '0');
                          const dateISO = `${yyyy}-${mm}-${dd}`;

                          const isBlocked = blockedDaysDraft.includes(dateISO);

                          elements.push(
                            <button
                              key={dateISO}
                              type="button"
                              onClick={() => {
                                if (isBlocked) {
                                  setBlockedDaysDraft(blockedDaysDraft.filter((b) => b !== dateISO));
                                } else {
                                  setBlockedDaysDraft([...blockedDaysDraft, dateISO]);
                                }
                              }}
                              className={`h-10 rounded-lg border text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer ${
                                isBlocked
                                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 ring-2 ring-rose-500/40 shadow-md'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800'
                              }`}
                              title={isBlocked ? 'Kliknutím odblokujete' : 'Kliknutím zablokujete (Dovolená)'}
                            >
                              <span>{d}</span>
                              {isBlocked && (
                                <span className="text-[8px] font-extrabold text-rose-300 uppercase leading-none">
                                  Zavřeno
                                </span>
                              )}
                            </button>
                          );
                        }

                        return elements;
                      })()}
                    </div>
                  </div>

                  {/* Manual Single Date Input */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-200">Rychlé přidání jednoho dne</label>
                      <span className="text-[10px] text-zinc-400">Vyberte konkrétní datum v kalendáři</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        onChange={(e) => {
                          if (e.target.value && !blockedDaysDraft.includes(e.target.value)) {
                            setBlockedDaysDraft([...blockedDaysDraft, e.target.value]);
                          }
                          e.target.value = '';
                        }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* List of Currently Blocked Dates */}
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                      Seznam zablokovaných dní ({blockedDaysDraft.length})
                    </h4>

                    {blockedDaysDraft.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">Není zablokován žádný den. Barber přijímá rezervace standardně.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                        {blockedDaysDraft.map((dateStr) => (
                          <div
                            key={dateStr}
                            className="px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center gap-2"
                          >
                            <span>{dateStr}</span>
                            <button
                              type="button"
                              onClick={() => setBlockedDaysDraft(blockedDaysDraft.filter((b) => b !== dateStr))}
                              className="p-0.5 rounded-full hover:bg-rose-900 text-rose-300 cursor-pointer"
                              title="Odstranit blokaci"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveCms({ ...cmsDraft, blockedDays: blockedDaysDraft });
                      setStatusMsg('Nastavení dovolené a blokací bylo úspěšně uloženo!');
                      setTimeout(() => setStatusMsg(''), 3000);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    Uložit nastavení dovolené
                  </button>
                </div>
              )}

              {/* TAB: BULK CANCELLATION & REASON */}
              {activeTab === 'bulk_cancel' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 mb-1 flex items-center gap-2">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      <span>Storno Termínů pro Klienty (s udáním důvodu)</span>
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Zde můžete stornovat termíny pro vybrané dny a časové sloty. Klientům se odesle e-mail s udaným důvodem zrušení a tlačítkem pro výběr nového termínu. Zároveň se události automaticky smažou z vášho Google Kalendáře.
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left: Day Selector */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider capitalize">
                          1. Dny ke stornování ({vacationCalDate.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })})
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(vacationCalDate);
                              d.setMonth(d.getMonth() - 1);
                              setVacationCalDate(d);
                            }}
                            className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-amber-400 cursor-pointer flex items-center justify-center"
                            title="Předchozí měsíc"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const d = new Date(vacationCalDate);
                              d.setMonth(d.getMonth() + 1);
                              setVacationCalDate(d);
                            }}
                            className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-amber-400 cursor-pointer flex items-center justify-center"
                            title="Následující měsíc"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Klikáním na dny níže vyberte dny k rušení (můžete zvolit i více dnů najednou).
                      </p>

                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-500 uppercase">
                        <span>Po</span><span>Út</span><span>St</span><span>Čt</span><span>Pá</span><span>So</span><span>Ne</span>
                      </div>

                      <div className="grid grid-cols-7 gap-1">
                        {(() => {
                          const year = vacationCalDate.getFullYear();
                          const month = vacationCalDate.getMonth();
                          const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
                          const totalDays = new Date(year, month + 1, 0).getDate();
                          const elements = [];

                          for (let i = 0; i < firstDay; i++) {
                            elements.push(<div key={`bempty-${i}`} className="h-8" />);
                          }

                          for (let d = 1; d <= totalDays; d++) {
                            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isSelected = bulkCancelTargetDates.includes(dateStr);
                            const dayOrdersCount = reservations.filter(
                              (r) => r.date === dateStr && r.status !== 'cancelled'
                            ).length;

                            elements.push(
                              <button
                                key={`bday-${dateStr}`}
                                type="button"
                                onClick={() => {
                                  setBulkCancelTargetDates((prev) =>
                                    prev.includes(dateStr)
                                      ? prev.filter((x) => x !== dateStr)
                                      : [...prev, dateStr]
                                  );
                                }}
                                className={`h-9 rounded-lg border text-xs font-bold transition-all relative flex flex-col items-center justify-center ${
                                  isSelected
                                    ? 'bg-rose-900 border-rose-500 text-white ring-2 ring-rose-500'
                                    : dayOrdersCount > 0
                                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                                }`}
                              >
                                <span>{d}</span>
                                {dayOrdersCount > 0 && (
                                  <span className="text-[7px] bg-rose-600 text-white px-1 rounded-full">
                                    {dayOrdersCount} obj
                                  </span>
                                )}
                              </button>
                            );
                          }
                          return elements;
                        })()}
                      </div>

                      {bulkCancelTargetDates.length > 0 && (
                        <div className="flex justify-between items-center pt-2 text-xs border-t border-zinc-800">
                          <span className="text-zinc-300">Vybráno dnů: <strong>{bulkCancelTargetDates.length}</strong></span>
                          <button
                            type="button"
                            onClick={() => setBulkCancelTargetDates([])}
                            className="text-rose-400 hover:underline"
                          >
                            Vymazat výběr dnů
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right: Slot & Reason Form */}
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                      <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider">
                        2. Časy & Důvod zrušení
                      </label>

                      {/* Reason Input Field */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-zinc-200">
                          Důvod zrušení (bude odeslán klientům v e-mailu):
                        </label>
                        <textarea
                          value={bulkCancelReason}
                          onChange={(e) => setBulkCancelReason(e.target.value)}
                          placeholder="Např.: Z osobně-zdravotních důvodů ruším dnešní termíny. Prosím přeobjednejte se na jiný termín."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-rose-500 min-h-[70px]"
                        />
                      </div>

                      {/* All Day Checkbox */}
                      <label className="flex items-center gap-2 text-xs font-bold text-rose-400 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={bulkCancelAllDay}
                          onChange={(e) => setBulkCancelAllDay(e.target.checked)}
                          className="rounded border-zinc-700 bg-zinc-900 text-rose-600 focus:ring-rose-500"
                        />
                        Zrušit VŠECHNY termíny v těchto dnů
                      </label>

                      {/* Time Slots Grid */}
                      {!bulkCancelAllDay && (
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-zinc-400">Nebo vyberte konkrétní sloty ke zrušení:</span>
                          <div className="grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto pr-1">
                            {allTimeSlots.map((t) => {
                              const isSel = bulkCancelSelectedSlots.has(t);
                              return (
                                <button
                                  key={`bcs-${t}`}
                                  type="button"
                                  onClick={() => {
                                    setBulkCancelSelectedSlots((prev) => {
                                      const next = new Set(prev);
                                      if (next.has(t)) next.delete(t);
                                      else next.add(t);
                                      return next;
                                    });
                                  }}
                                  className={`py-1 rounded-lg text-xs font-medium border transition-all ${
                                    isSel
                                      ? 'bg-rose-600 border-rose-500 text-white font-bold'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                  }`}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Execute Button */}
                      <button
                        type="button"
                        disabled={isExecBulkCancel}
                        onClick={async () => {
                          const datesToCancel = bulkCancelTargetDates.length > 0 ? bulkCancelTargetDates : [new Date().toISOString().split('T')[0]];
                          if (!bulkCancelAllDay && bulkCancelSelectedSlots.size === 0) {
                            alert('Vyberte časové sloty k rušení nebo zaškrtněte zrušení celého dne.');
                            return;
                          }
                          const confirmMsg = bulkCancelAllDay
                            ? `Opravdu chcete ZRUŠIT VŠECHNY rezervace v ${datesToCancel.length} vybraných dnech?`
                            : `Opravdu chcete zrušit ${bulkCancelSelectedSlots.size} vybraných slotů pro ${datesToCancel.length} dnů?`;

                          if (!confirm(confirmMsg)) return;

                          setIsExecBulkCancel(true);
                          try {
                            const res = await fetch('/api/admin/bulk-cancel', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                targetDates: datesToCancel,
                                timeSlots: Array.from(bulkCancelSelectedSlots),
                                cancelAllInSlots: bulkCancelAllDay,
                                reason: bulkCancelReason,
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Chyba při rušení termínů.');

                            alert(data.message || 'Termíny byly stornovány, smazány z GCal a klienti obdrželi e-mail.');
                            setBulkCancelSelectedSlots(new Set());
                            setBulkCancelTargetDates([]);
                            setBulkCancelReason('');
                            setBulkCancelAllDay(false);
                            onRefreshData();
                          } catch (err: any) {
                            alert(err.message || 'Chyba při rušení termínů.');
                          } finally {
                            setIsExecBulkCancel(false);
                          }
                        }}
                        className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        {isExecBulkCancel
                          ? 'Ruším termíny a mažu z Google Kalendáře...'
                          : 'Stornovat termíny, smazat z GCal & notifikovat klienty'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SERVICES MANAGEMENT */}
              {activeTab === 'services' && (
                <form onSubmit={handleSaveServicesSubmit} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-zinc-100">Správa nabízených služeb</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setServicesDraft([
                          ...servicesDraft,
                          {
                            id: 'srv-' + Date.now(),
                            name: 'Nová služba',
                            description: 'Popis služby...',
                            price: 500,
                            durationMinutes: 45,
                            active: true,
                          },
                        ]);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-zinc-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Přidat službu</span>
                    </button>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {servicesDraft.map((srv, idx) => (
                      <div key={srv.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={srv.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setServicesDraft((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, name: val } : item))
                              );
                            }}
                            className="font-bold text-sm bg-zinc-900 px-3 py-1.5 rounded border border-zinc-800 text-amber-400 w-full"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setServicesDraft((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 rounded bg-rose-950 text-rose-300 hover:bg-rose-900"
                            title="Odstranit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">Cena (Kč)</label>
                            <input
                              type="number"
                              value={srv.price}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setServicesDraft((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, price: val } : item))
                                );
                              }}
                              className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">Délka trvání (minut)</label>
                            <input
                              type="number"
                              step="5"
                              value={srv.durationMinutes}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setServicesDraft((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, durationMinutes: val } : item))
                                );
                              }}
                              className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-zinc-400 mb-1">Aktivní nabízení</label>
                            <select
                              value={srv.active ? 'true' : 'false'}
                              onChange={(e) => {
                                const val = e.target.value === 'true';
                                setServicesDraft((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, active: val } : item))
                                );
                              }}
                              className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                            >
                              <option value="true">Aktivní</option>
                              <option value="false">Skryté</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Popis služby</label>
                          <input
                            type="text"
                            value={srv.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setServicesDraft((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, description: val } : item))
                              );
                            }}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-200"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer shadow-md"
                  >
                    Uložit všechny služby
                  </button>
                </form>
              )}

              {/* TAB 4: WORKING HOURS SCHEDULE & DATES */}
              {activeTab === 'schedules' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                    <div>
                      <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        Nastavit časy pro dny
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                        Klikněte na jakékoliv datum v kalendáři pro nastavení 15minutových časů od 7:00 do 22:00. Uložte časy pro daný den nebo hromadně pro více dní najednou.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCreatingTemplate(true)}
                      className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md shrink-0 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Nová šablona
                    </button>
                  </div>

                  {/* Section: Šablony časů */}
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        Uložené šablony časů ({templatesList.length})
                      </h4>
                      <p className="text-[11px] text-zinc-400">
                        Kliknutím na šablonu okamžitě zaklikáte odpovídající časy pro zvolený den
                      </p>
                    </div>

                    {templatesList.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">Zatím nemáte žádné uložené šablony. Vytvořte si první kliknutím na tlačítko "Nová šablona".</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {templatesList.map((tpl) => (
                          <div
                            key={tpl.id}
                            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-900 border border-amber-500/30 hover:border-amber-500 transition-all text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDateSlots(tpl.timeSlots);
                                setStatusMsg(`Aplikována šablona: ${tpl.name}`);
                                setTimeout(() => setStatusMsg(''), 3000);
                              }}
                              className="font-medium text-amber-300 hover:text-amber-200 text-left flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>⚡ {tpl.name}</span>
                              <span className="text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                {tpl.timeSlots.length} časů
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="text-zinc-500 hover:text-rose-400 transition-colors p-0.5 cursor-pointer"
                              title="Smazat šablonu"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Form: Vytvoření nové šablony */}
                  {isCreatingTemplate && (
                    <div className="p-5 rounded-2xl bg-zinc-950 border-2 border-amber-500/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-amber-400">Vytvořit novou šablonu časů</h4>
                        <button
                          type="button"
                          onClick={() => setIsCreatingTemplate(false)}
                          className="text-zinc-400 hover:text-zinc-200"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-zinc-300 mb-1">
                          Název šablony (např. Ranní směna 07:00-15:00)
                        </label>
                        <input
                          type="text"
                          value={newTemplateName}
                          onChange={(e) => setNewTemplateName(e.target.value)}
                          placeholder="např. Celý den (08:00 - 20:00)"
                          className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-zinc-300">
                            Vyberte časy pro šablonu (Vybráno: {newTemplateSlots.length})
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setNewTemplateSlots([...allTimeSlots])}
                              className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                            >
                              Vybrat vše
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewTemplateSlots([])}
                              className="text-[11px] text-zinc-400 hover:underline cursor-pointer"
                            >
                              Vymazat vše
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-56 overflow-y-auto p-2 rounded-xl bg-zinc-900 border border-zinc-800">
                          {allTimeSlots.map((t) => {
                            const selected = newTemplateSlots.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => {
                                  setNewTemplateSlots((prev) =>
                                    prev.includes(t) ? prev.filter((s) => s !== t) : [...prev, t].sort()
                                  );
                                }}
                                className={`py-1.5 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                                  selected
                                    ? 'bg-amber-500 text-zinc-950 font-bold'
                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}
                              >
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsCreatingTemplate(false)}
                          className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
                        >
                          Zrušit
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveNewTemplate}
                          className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-md cursor-pointer"
                        >
                          Uložit šablonu
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Section: Main Interactive Calendar & Time Slot Picker */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Calendar Column */}
                    <div className="lg:col-span-5 p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3">
                        Vyberte datum v kalendáři
                      </h4>

                      {/* Month Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          type="button"
                          onClick={() => setScheduleCalMonth(new Date(scheduleCalMonth.getFullYear(), scheduleCalMonth.getMonth() - 1, 1))}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm font-bold text-zinc-100 capitalize">
                          {scheduleCalMonth.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={() => setScheduleCalMonth(new Date(scheduleCalMonth.getFullYear(), scheduleCalMonth.getMonth() + 1, 1))}
                          className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 cursor-pointer"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Days Header */}
                      <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-zinc-500 mb-2">
                        <span>Po</span><span>Út</span><span>St</span><span>Čt</span><span>Pá</span><span>So</span><span>Ne</span>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {getDaysForMonth(scheduleCalMonth).map((d, index) => {
                          if (!d) return <div key={`empty-${index}`} className="h-10" />;
                          const isSelected = selectedCalendarDate === d.dateStr;
                          const isToday = d.dateStr === new Date().toISOString().split('T')[0];

                          return (
                            <button
                              key={d.dateStr}
                              type="button"
                              onClick={() => {
                                setSelectedCalendarDate(d.dateStr);
                                fetchAvailabilityForDate(d.dateStr);
                              }}
                              className={`h-10 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all relative border cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-md scale-105 z-10'
                                  : isToday
                                  ? 'bg-zinc-800 text-amber-400 border-amber-500/50'
                                  : 'bg-zinc-900 text-zinc-200 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800'
                              }`}
                            >
                              <span>{d.dayNum}</span>
                              {d.hasCustomSlots && !isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Slots Column for Selected Date */}
                    <div className="lg:col-span-7 p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 mb-4 border-b border-zinc-800">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Úprava pro datum</span>
                            <h3 className="text-base font-bold text-amber-400">
                              {selectedCalendarDate
                                ? new Date(selectedCalendarDate + 'T00:00:00').toLocaleDateString('cs-CZ', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                  })
                                : 'Není vybráno datum'}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingDateSlots([...allTimeSlots])}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-amber-400 hover:bg-zinc-800 cursor-pointer"
                            >
                              Vybrat vše
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingDateSlots([])}
                              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:bg-zinc-800 cursor-pointer"
                            >
                              Vymazat (Nestříhám)
                            </button>
                          </div>
                        </div>

                        {/* Time Slots Grid: 07:00 to 22:00 in 15-min steps */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-zinc-300">
                              15minutové časové sloty (Vybráno {editingDateSlots.length}):
                            </span>
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-80 overflow-y-auto pr-1">
                            {allTimeSlots.map((time) => {
                              const active = editingDateSlots.includes(time);
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  onClick={() => {
                                    setEditingDateSlots((prev) =>
                                      prev.includes(time) ? prev.filter((t) => t !== time) : [...prev, time].sort()
                                    );
                                  }}
                                  className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                                    active
                                      ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-sm'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-[11px] text-zinc-400">
                          {editingDateSlots.length === 0
                            ? '⚠️ Žádný čas není vybrán — den bude uzavřen ("Nestříhám").'
                            : `Bude vytvořeno ${editingDateSlots.length} termínů.`}
                        </p>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            type="button"
                            disabled={isSavingAvailability}
                            onClick={handleSaveSingleDay}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {isSavingAvailability ? 'Ukládám...' : 'Uložit pro tento den'}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setMultiDateModalOpen(true);
                              setMultiDateSelections([selectedCalendarDate]);
                            }}
                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs border border-zinc-700 shadow-md transition-all cursor-pointer"
                          >
                            Uložit pro dny
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Secondary Modal: Multi-Date Selection Calendar for "Uložit pro dny" */}
                  {multiDateModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                          <div>
                            <h4 className="text-base font-bold text-amber-400">Aplikovat rozvrh na více dní</h4>
                            <p className="text-xs text-zinc-400">
                              Označte dny v kalendáři, pro které chcete uložit vybraných {editingDateSlots.length} časových slotů.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setMultiDateModalOpen(false)}
                            className="text-zinc-400 hover:text-zinc-100 p-1 cursor-pointer"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Calendar Picker for Multi-Date Selection */}
                        <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              type="button"
                              onClick={() => setMultiDateMonth(new Date(multiDateMonth.getFullYear(), multiDateMonth.getMonth() - 1, 1))}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-zinc-100 capitalize">
                              {multiDateMonth.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              type="button"
                              onClick={() => setMultiDateMonth(new Date(multiDateMonth.getFullYear(), multiDateMonth.getMonth() + 1, 1))}
                              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-zinc-500 mb-1">
                            <span>Po</span><span>Út</span><span>St</span><span>Čt</span><span>Pá</span><span>So</span><span>Ne</span>
                          </div>

                          <div className="grid grid-cols-7 gap-1">
                            {getDaysForMonth(multiDateMonth).map((d, index) => {
                              if (!d) return <div key={`mempty-${index}`} className="h-8" />;
                              const isChecked = multiDateSelections.includes(d.dateStr);

                              return (
                                <button
                                  key={d.dateStr}
                                  type="button"
                                  onClick={() => {
                                    setMultiDateSelections((prev) =>
                                      prev.includes(d.dateStr) ? prev.filter((x) => x !== d.dateStr) : [...prev, d.dateStr]
                                    );
                                  }}
                                  className={`h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-amber-500 text-zinc-950 font-bold scale-105'
                                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                  }`}
                                >
                                  {d.dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-amber-400 font-semibold">
                            Vybráno dní: {multiDateSelections.length}
                          </span>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setMultiDateModalOpen(false)}
                              className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 cursor-pointer"
                            >
                              Zrušit
                            </button>
                            <button
                              type="button"
                              disabled={isSavingAvailability || multiDateSelections.length === 0}
                              onClick={handleSaveMultiDays}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-md disabled:opacity-50 cursor-pointer"
                            >
                              {isSavingAvailability ? 'Ukládám...' : 'Potvrdit a uložit pro vybrané dny'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: EMAIL & CALENDAR SYNC SETTINGS */}
              {activeTab === 'email_calendar' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-zinc-100 mb-1 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-amber-500" />
                      <span>Nastavení E-mailu (Gmail Nodemailer)</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mb-4">
                      Konfigurace e-mailového účtu pro automatické odesílání potvrzení a stornování rezervací.
                    </p>

                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">E-mail účtu (EMAIL_USER)</label>
                          <input
                            type="email"
                            value={cmsDraft.emailUser || cmsDraft.smtpUser || ''}
                            onChange={(e) =>
                              setCmsDraft({
                                ...cmsDraft,
                                emailUser: e.target.value,
                                smtpUser: e.target.value,
                                smtpEmailSender: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                            placeholder="rezervace.swbarbershop@gmail.com"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-zinc-400 mb-1">Gmail Aplikační Heslo (EMAIL_APP_PASSWORD)</label>
                          <input
                            type="password"
                            value={cmsDraft.emailAppPassword || ''}
                            onChange={(e) => setCmsDraft({ ...cmsDraft, emailAppPassword: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                            placeholder="wxgc kyxf diyn ifeu"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 pt-2 border-t border-zinc-900">
                        <input
                          type="email"
                          placeholder="Zadejte testovací e-mail..."
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                          className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleRunTestEmail}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Testovat e-mail</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-zinc-100 mb-1 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-amber-500" />
                      <span>Propojení s Google Kalendářem (Service Account API)</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mb-4">
                      Zadejte přístupy k Vašemu Google Kalendáři pro automatický zápis termínů k barberovi.
                    </p>

                    <div className="space-y-3 bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">ID Google Kalendáře (GOOGLE_CALENDAR_ID)</label>
                        <input
                          type="text"
                          value={cmsDraft.googleCalendarId || cmsDraft.barberCalendarEmail || ''}
                          onChange={(e) =>
                            setCmsDraft({
                              ...cmsDraft,
                              googleCalendarId: e.target.value,
                              barberCalendarEmail: e.target.value,
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                          placeholder="rezervace.swbarbershop@gmail.com nebo ID kalendáře"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Service Account Client Email (GOOGLE_SERVICE_ACCOUNT_EMAIL)</label>
                        <input
                          type="email"
                          value={cmsDraft.googleServiceAccountEmail || ''}
                          onChange={(e) => setCmsDraft({ ...cmsDraft, googleServiceAccountEmail: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
                          placeholder="barber-booking@project-id.iam.gserviceaccount.com"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-zinc-400 mb-1">Google Private Key (GOOGLE_PRIVATE_KEY)</label>
                        <textarea
                          rows={4}
                          value={cmsDraft.googlePrivateKey || ''}
                          onChange={(e) => setCmsDraft({ ...cmsDraft, googlePrivateKey: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-100 font-mono leading-relaxed resize-y"
                          placeholder="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      await onSaveCms(cmsDraft);
                      setStatusMsg('E-mailové a kalendářové nastavení bylo úspěšně uloženo!');
                      setTimeout(() => setStatusMsg(''), 3000);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs cursor-pointer shadow-md transition-all"
                  >
                    Uložit e-maily & kalendář
                  </button>
                </div>
              )}

              {/* TAB 6: CRON JOB REMINDERS */}
              {activeTab === 'cron' && (
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-zinc-100">Automatické připomínky (Cron Job)</h3>
                  <p className="text-xs text-zinc-400">
                    Systém obsahuje automatický cron job endpoint <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-amber-400">POST /api/cron-reminders</code>, který 1 den před konáním schůzky odesílá klientovi připomínkový e-mail.
                  </p>

                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-bold text-amber-500 uppercase">Manuální spuštění připomínek</h4>
                    <p className="text-xs text-zinc-300">
                      Kliknutím níže můžete okamžitě otestovat spuštění připomínkového cyklu na zítřejší termíny.
                    </p>

                    <button
                      type="button"
                      onClick={handleRunCronReminders}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs flex items-center gap-2 cursor-pointer"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Spustit připomínky pro zítřejší rezervace</span>
                    </button>
                  </div>

                  {cronResult && (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/30 text-xs font-mono space-y-1">
                      <div className="text-emerald-400 font-bold">Výsledek spuštění Cron jobu:</div>
                      <div>Cílový datum: {cronResult.targetDate}</div>
                      <div>Odesláno připomínek: {cronResult.sentCount}</div>
                      {cronResult.recipients && cronResult.recipients.length > 0 && (
                        <div className="text-zinc-400">Příjemci: {cronResult.recipients.join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
