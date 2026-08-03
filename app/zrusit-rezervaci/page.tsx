'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Clock, Scissors, User, CheckCircle2, AlertTriangle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Order {
  id: string;
  client_name: string;
  client_email: string;
  service_title: string;
  service_price: number;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled';
  note?: string;
}

function CancelBookingContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Chybí identifikátor rezervace v odkazu.');
      setLoading(false);
      return;
    }

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/cancel-booking?id=${id}`);
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error || 'Rezervaci se nepodařilo načíst.');
        } else {
          setOrder(data.order);
          if (data.order.status === 'cancelled') {
            setCancelled(true);
          }
        }
      } catch (err: any) {
        setError('Došlo k chybě při komunikaci se serverem.');
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [id]);

  const handleCancelBooking = async () => {
    if (!id) return;
    setCancelling(true);
    setError(null);

    try {
      const res = await fetch('/api/cancel-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Zrušení schůzky se nepodařilo.');
      } else {
        setCancelled(true);
        if (data.order) {
          setOrder(data.order);
        }
      }
    } catch (err: any) {
      setError('Došlo k nečekané chybě při rušení rezervace.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mb-4" />
        <p className="text-zinc-400 text-sm">Načítám detaily rezervace...</p>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Chyba rezervace</h1>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium py-2.5 px-5 rounded-xl transition duration-200 text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Storno rezervace</h1>
          <p className="text-zinc-400 text-sm mt-1">Správa vašeho termínu v barber shopu</p>
        </div>

        {cancelled ? (
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-5 text-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-emerald-300 mb-1">Schůzka byla zrušena</h2>
            <p className="text-zinc-300 text-sm mb-2">
              Vaše rezervace na <strong className="text-white">{order?.service_title}</strong> dne{' '}
              <strong className="text-white">{order?.date} v {order?.time}</strong> byla úspěšně zrušena.
            </p>
            <p className="text-xs text-zinc-400">
              Termín byl uvolněn v kalendáři a potvrzovací e-mail byl odeslán na {order?.client_email}.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Klient</span>
                <span className="text-sm font-medium text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-zinc-400" />
                  {order?.client_name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Služba</span>
                <span className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Scissors className="w-4 h-4 text-zinc-400" />
                  {order?.service_title} ({order?.service_price} Kč)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Datum</span>
                <span className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  {order?.date}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">Čas</span>
                <span className="text-sm font-medium text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  {order?.time}
                </span>
              </div>
            </div>

            {error && (
              <div className="bg-red-950/50 border border-red-800 text-red-200 text-sm rounded-xl p-3 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
              Kliknutím na tlačítko níže závazně zrušíte svůj termín. Termín bude okamžitě uvolněn v kalendáři pro ostatní zákazníky.
            </p>

            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-xl transition duration-200 shadow-lg shadow-red-950/40 flex items-center justify-center gap-2 text-base cursor-pointer"
            >
              {cancelling ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Ruším schůzku...
                </>
              ) : (
                'Zrušit schůzku'
              )}
            </button>
          </>
        )}

        <div className="mt-6 pt-4 border-t border-zinc-800 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" /> Zpět na web
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function CancelBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mb-4" />
          <p className="text-zinc-400 text-sm">Načítám...</p>
        </div>
      }
    >
      <CancelBookingContent />
    </Suspense>
  );
}
