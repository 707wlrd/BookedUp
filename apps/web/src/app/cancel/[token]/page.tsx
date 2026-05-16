'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XCircle, AlertCircle, CheckCircle2, Clock, Loader2, CalendarX2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type State =
  | 'loading'
  | 'ready'          // can cancel
  | 'too_late'       // within 24h
  | 'already_cancelled'
  | 'not_cancellable' // completed / no-show
  | 'cancelled'      // just cancelled
  | 'invalid';       // 404

type ApptInfo = {
  shopName: string;
  serviceName: string;
  city?: string | null;
  date: string;
  time: string;
  depositCents: number;
};

export default function CancelPage({ params }: { params: { token: string } }) {
  const [state, setState]       = useState<State>('loading');
  const [appt, setAppt]         = useState<ApptInfo | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    fetch(`/api/cancel/${params.token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error === 'not_found') { setState('invalid'); return; }

        setAppt({
          shopName:     data.shopName,
          serviceName:  data.serviceName,
          city:         data.city ?? null,
          date:         data.date,
          time:         data.time,
          depositCents: data.depositCents ?? 0,
        });

        if (!data.cancellable) {
          setState(
            data.reason === 'already_cancelled' ? 'already_cancelled'
            : data.reason === 'too_late'        ? 'too_late'
            :                                     'not_cancellable',
          );
          return;
        }
        setState('ready');
      })
      .catch(() => setState('invalid'));
  }, [params.token]);

  async function handleCancel() {
    setError('');
    setSubmitting(true);
    try {
      const res  = await fetch(`/api/cancel/${params.token}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data.error === 'too_late'          ? `Ce rendez-vous est dans moins de 24h, impossible de l'annuler en ligne.` :
          data.error === 'already_cancelled' ? 'Ce rendez-vous est déjà annulé.' :
          'Une erreur est survenue, réessaie.';
        setError(msg);
        setSubmitting(false);
        return;
      }
      setState('cancelled');
    } catch {
      setError('Erreur réseau, réessaie.');
      setSubmitting(false);
    }
  }

  const price = (cents: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(5,6,8)] px-4 py-16">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="inline-block rounded-full bg-electric-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
            BookedUp
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Loading ── */}
          {state === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16 text-white/40">
              <Loader2 className="h-8 w-8 animate-spin text-electric-400" />
              <span className="text-sm">Chargement…</span>
            </motion.div>
          )}

          {/* ── Invalid ── */}
          {state === 'invalid' && (
            <motion.div key="invalid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-8 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400/70" />
              <h2 className="text-lg font-bold">Lien invalide</h2>
              <p className="mt-2 text-sm text-white/50">
                Ce lien d'annulation est invalide ou a expiré.
              </p>
            </motion.div>
          )}

          {/* ── Already cancelled ── */}
          {state === 'already_cancelled' && (
            <motion.div key="already" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-8 text-center">
              <CalendarX2 className="mx-auto mb-4 h-12 w-12 text-white/30" />
              <h2 className="text-lg font-bold">Déjà annulé</h2>
              <p className="mt-2 text-sm text-white/50">
                Ce rendez-vous a déjà été annulé.
              </p>
              {appt && (
                <p className="mt-3 text-xs text-white/30">
                  {appt.serviceName} · {appt.date} à {appt.time}
                </p>
              )}
            </motion.div>
          )}

          {/* ── Not cancellable (completed / no-show) ── */}
          {state === 'not_cancellable' && (
            <motion.div key="not-cancellable" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-8 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-400/70" />
              <h2 className="text-lg font-bold">Annulation impossible</h2>
              <p className="mt-2 text-sm text-white/50">
                Ce rendez-vous ne peut plus être annulé en ligne.<br />
                Contacte directement le salon si besoin.
              </p>
            </motion.div>
          )}

          {/* ── Too late (within 24h) ── */}
          {state === 'too_late' && (
            <motion.div key="too-late" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">
              {appt && (
                <div className="card px-5 py-4">
                  <div className="text-xs uppercase tracking-wider text-white/40">Ton rendez-vous</div>
                  <div className="mt-1 text-lg font-bold">{appt.shopName}</div>
                  <div className="mt-0.5 text-sm text-white/50">
                    {appt.serviceName} · {appt.date} à {appt.time}
                  </div>
                </div>
              )}
              <div className="card p-6 text-center">
                <Clock className="mx-auto mb-3 h-10 w-10 text-orange-400/80" />
                <h2 className="text-lg font-bold">Trop tard pour annuler en ligne</h2>
                <p className="mt-2 text-sm text-white/50 leading-relaxed">
                  L'annulation gratuite n'est possible que jusqu'à <strong className="text-white/70">24h avant</strong> le rendez-vous.
                  <br /><br />
                  Pour annuler à cette heure-ci, contacte directement le salon.
                </p>
              </div>
            </motion.div>
          )}

          {/* ── Ready to cancel ── */}
          {state === 'ready' && appt && (
            <motion.div key="ready" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">
              {/* Context card */}
              <div className="card px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-white/40">Rendez-vous à annuler</div>
                <div className="mt-1 text-lg font-bold">{appt.shopName}</div>
                {appt.city && (
                  <div className="text-xs text-white/30">{appt.city}</div>
                )}
                <div className="mt-0.5 text-sm text-white/50">
                  {appt.serviceName} · {appt.date} à {appt.time}
                </div>
              </div>

              {/* Confirmation card */}
              <div className="card p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400/70" />
                  <div>
                    <h2 className="font-bold">Confirmer l'annulation ?</h2>
                    <p className="mt-1 text-sm text-white/50 leading-relaxed">
                      Cette action est irréversible. Le créneau sera libéré et
                      tu recevras un email de confirmation.
                    </p>
                  </div>
                </div>

                {/* Deposit warning */}
                {appt.depositCents > 0 && (
                  <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
                    <p className="text-sm text-yellow-300/80">
                      ⚠️ Un acompte de <strong>{price(appt.depositCents)}</strong> avait été versé.
                      Pour toute question sur le remboursement, contacte directement le salon.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="mt-4 text-sm text-red-400">{error}</p>
                )}

                <div className="mt-5 flex flex-col gap-3">
                  {!confirming ? (
                    <button
                      onClick={() => setConfirming(true)}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-red-500/10 py-3.5 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20"
                    >
                      <XCircle className="h-4 w-4" />
                      Annuler mon rendez-vous
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-center text-sm font-medium text-white/70">
                        Tu es sûr(e) ?
                      </p>
                      <button
                        onClick={handleCancel}
                        disabled={submitting}
                        className={cn(
                          'flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all',
                          submitting
                            ? 'cursor-not-allowed bg-white/[0.06] text-white/30'
                            : 'bg-red-500 text-white hover:bg-red-400',
                        )}
                      >
                        {submitting
                          ? <><Loader2 className="h-4 w-4 animate-spin" /> Annulation…</>
                          : 'Oui, annuler'}
                      </button>
                      <button
                        onClick={() => setConfirming(false)}
                        disabled={submitting}
                        className="flex w-full items-center justify-center rounded-full bg-white/[0.04] py-3.5 text-sm text-white/50 transition-all hover:bg-white/[0.08]"
                      >
                        Non, garder mon RDV
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {state === 'cancelled' && (
            <motion.div key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="card p-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 16 }}
                className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-white/5 text-white/40"
              >
                <CheckCircle2 className="h-8 w-8" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight">Rendez-vous annulé</h2>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">
                Ton annulation a été confirmée. Tu vas recevoir un email de confirmation.
              </p>
              {appt && (
                <p className="mt-4 text-xs text-white/30">
                  {appt.serviceName} chez {appt.shopName} · {appt.date}
                </p>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
