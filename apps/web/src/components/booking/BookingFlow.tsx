'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, ArrowLeft, ArrowRight, Calendar, ShieldCheck, User, RefreshCw } from 'lucide-react';
import type { Barber, Service } from '@bookedup/shared';
import { Button } from '@/components/ui/Button';
import { cn, formatPrice, formatDuration } from '@/lib/utils';

type Stylist = {
  id: string;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  specialties?: string[];
};

type B = Barber & { services: Service[]; stylists?: Stylist[] };

type Slot = { time: string; available: boolean };

export function BookingFlow({ barber, initialServiceId }: { barber: B; initialServiceId?: string }) {
  const stylists = barber.stylists ?? [];
  const hasStylists = stylists.length > 0;

  // Build dynamic step list
  const STEPS = useMemo(
    () =>
      hasStylists
        ? (['Service', 'Coiffeur', 'Date & heure', 'Tes infos', 'Paiement'] as const)
        : (['Service', 'Date & heure', 'Tes infos', 'Paiement'] as const),
    [hasStylists],
  );

  // Named step indices — avoids magic numbers everywhere
  const si = useMemo(() => ({
    service:  0,
    stylist:  hasStylists ? 1 : -1,
    datetime: hasStylists ? 2 : 1,
    info:     hasStylists ? 3 : 2,
    payment:  hasStylists ? 4 : 3,
    done:     STEPS.length,
  }), [hasStylists, STEPS.length]);

  // ── State ───────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId ?? null);
  // Auto-select if single stylist
  const [stylistId, setStylistId] = useState<string | null>(
    stylists.length === 1 ? stylists[0].id : null,
  );
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(1);
  const [recurringCount, setRecurringCount] = useState(4);
  const [seriesResult, setSeriesResult] = useState<{ series_id: string; total_created: number } | null>(null);

  // Availability
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const service = useMemo(
    () => barber.services.find((s) => s.id === serviceId),
    [serviceId, barber.services],
  );
  const stylist = useMemo(
    () => stylists.find((s) => s.id === stylistId),
    [stylistId, stylists],
  );

  // ── Fetch slots whenever date/stylist/service changes ───────────────────
  useEffect(() => {
    if (!date || !service) { setSlots([]); return; }
    if (hasStylists && !stylistId) { setSlots([]); return; }

    setSlotsLoading(true);
    setTime(null); // reset time on any change

    const params = new URLSearchParams({
      barber_id: barber.id,
      date,
      duration: String(service.duration_minutes),
      ...(stylistId ? { stylist_id: stylistId } : {}),
    });

    fetch(`/api/availability?${params}`)
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setSlotsLoading(false); })
      .catch(() => setSlotsLoading(false));
  }, [date, stylistId, service?.duration_minutes, barber.id, hasStylists]);

  // ── canNext ──────────────────────────────────────────────────────────────
  const canNext =
    (step === si.service && !!serviceId) ||
    (hasStylists && step === si.stylist && !!stylistId) ||
    (step === si.datetime && !!date && !!time) ||
    (step === si.info && name.length > 1 && /.+@.+\..+/.test(email));

  // ── Confirm ──────────────────────────────────────────────────────────────
  async function handleConfirm() {
    if (!service || !date || !time) return;
    setSubmitting(true);
    try {
      const startsAt = new Date(`${date}T${time}:00`);
      const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          barber_id: barber.id,
          service_id: service.id,
          stylist_id: stylistId ?? null,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          ...(recurring ? { recurring_weeks: recurringWeeks, recurring_count: recurringCount } : {}),
        }),
      });
      const data = await res.json();
      if (data.checkout_url) { window.location.href = data.checkout_url; return; }
      if (data.error) { setSubmitting(false); return; }
      if (data.series_id) {
        setSeriesResult({ series_id: data.series_id, total_created: data.total_created });
      }
      setStep(si.done);
    } catch { setSubmitting(false); }
  }

  const isLastInputStep = step === si.payment - 1;
  const isPaymentStep   = step === si.payment;
  const isDone          = step === si.done;

  return (
    <div className="card overflow-hidden">
      {/* ── Stepper header ── */}
      <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent p-6">
        <div className="label">Réservation chez</div>
        <div className="mt-1 text-xl font-bold tracking-tight">{barber.shop_name}</div>

        <div className="mt-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2.5">
              <motion.div
                animate={{ scale: i === step ? 1 : 0.95 }}
                className={cn(
                  'flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                  i < step  && 'bg-electric-500 text-white shadow-glow',
                  i === step && 'bg-electric-500/20 text-electric-200 ring-2 ring-electric-500/50',
                  i > step  && 'bg-white/[0.04] text-white/30',
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </motion.div>
              <div className={cn('hidden text-xs font-semibold sm:block', i === step ? 'text-white' : 'text-white/35')}>
                {s}
              </div>
              {i < STEPS.length - 1 && (
                <div className="ml-1 h-px flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className="h-full bg-electric-500"
                    initial={{ width: '0%' }}
                    animate={{ width: i < step ? '100%' : '0%' }}
                    transition={{ duration: 0.4 }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-6 sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step: Service */}
            {step === si.service && (
              <div className="space-y-2">
                {barber.services.map((s) => {
                  const selected = serviceId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-all duration-150',
                        selected
                          ? 'border-electric-500/50 bg-electric-500/[0.08] shadow-glow'
                          : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
                      )}
                    >
                      <div>
                        <div className="font-semibold">{s.name}</div>
                        <div className="mt-1 flex items-center gap-1 text-xs text-white/45">
                          <Clock className="h-3 w-3" /> {formatDuration(s.duration_minutes)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-lg font-bold">{formatPrice(s.price_cents)}</div>
                        <div
                          className={cn(
                            'grid h-5 w-5 place-items-center rounded-full border transition',
                            selected ? 'border-electric-400 bg-electric-500' : 'border-white/20',
                          )}
                        >
                          {selected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Step: Coiffeur (only if stylists exist) */}
            {hasStylists && step === si.stylist && (
              <StylistPicker stylists={stylists} selected={stylistId} onSelect={setStylistId} />
            )}

            {/* Step: Date & heure */}
            {step === si.datetime && (
              <DateTimePicker
                date={date}
                setDate={setDate}
                time={time}
                setTime={setTime}
                slots={slots}
                slotsLoading={slotsLoading}
                needsStylist={hasStylists && !stylistId}
              />
            )}

            {/* Step: Infos */}
            {step === si.info && (
              <div className="space-y-4">
                <div>
                  <label className="label">Nom complet</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input mt-1.5"
                    placeholder="Karim Larbi"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input mt-1.5"
                    placeholder="karim@mail.fr"
                  />
                </div>
                <div>
                  <label className="label">Téléphone (optionnel)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input mt-1.5"
                    placeholder="06 12 34 56 78"
                  />
                </div>
                {/* Option récurrence */}
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <button
                    type="button"
                    onClick={() => setRecurring(v => !v)}
                    className="flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-white/40" />
                      <span className="text-sm font-medium">Répéter ce RDV</span>
                    </div>
                    {/* Toggle */}
                    <span
                      className={cn(
                        'relative inline-flex h-5 w-9 flex-none items-center rounded-full border transition-colors duration-200',
                        recurring
                          ? 'border-electric-500/50 bg-electric-500/30'
                          : 'border-white/20 bg-white/[0.06]',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200',
                          recurring ? 'translate-x-4' : 'translate-x-0.5',
                        )}
                      />
                    </span>
                  </button>

                  {recurring && (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Fréquence</label>
                        <select
                          value={recurringWeeks}
                          onChange={e => setRecurringWeeks(Number(e.target.value))}
                          className="input mt-1 w-full text-sm"
                        >
                          <option value={1}>Toutes les semaines</option>
                          <option value={2}>Toutes les 2 semaines</option>
                          <option value={4}>Tous les mois</option>
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">Occurrences</label>
                        <select
                          value={recurringCount}
                          onChange={e => setRecurringCount(Number(e.target.value))}
                          className="input mt-1 w-full text-sm"
                        >
                          {[2, 3, 4, 6, 8, 12].map(n => (
                            <option key={n} value={n}>{n} fois</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <p className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-white/55">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300" />
                  Tes infos sont utilisées uniquement pour confirmer ton RDV et t'envoyer les rappels.
                </p>
              </div>
            )}

            {/* Step: Paiement / Récap */}
            {step === si.payment && service && date && time && (
              <div>
                <h3 className="text-base font-bold">Récapitulatif</h3>
                <div className="mt-4 space-y-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-sm">
                  <Row label="Service" value={service.name} />
                  {stylist && <Row label="Coiffeur" value={stylist.name} />}
                  <Row label="Durée" value={formatDuration(service.duration_minutes)} />
                  <Row
                    label="Date"
                    value={new Date(`${date}T${time}`).toLocaleString('fr-FR', {
                      dateStyle: 'full', timeStyle: 'short',
                    })}
                  />
                  <div className="my-3 border-t border-white/[0.06]" />
                  <Row label="Total" value={formatPrice(service.price_cents)} bold />
                  {barber.deposit_required && (
                    <Row
                      label="Acompte à payer maintenant"
                      value={formatPrice(barber.deposit_amount_cents)}
                      highlight
                    />
                  )}
                </div>
                <p className="mt-3 flex items-start gap-2 text-xs text-white/45">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300" />
                  Paiement sécurisé par Stripe. Tu peux annuler gratuitement jusqu'à 24h avant ton RDV.
                </p>
              </div>
            )}

            {/* Done */}
            {step === si.done && (
              <div className="py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-electric-500/20 text-electric-300 shadow-glow"
                >
                  <Check className="h-8 w-8" />
                </motion.div>
                <h3 className="text-2xl font-bold tracking-tight">Réservation confirmée.</h3>
                <p className="mt-2 text-sm text-white/55">Un email de confirmation vient de partir.</p>
                {seriesResult && (
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-electric-300">
                    <RefreshCw className="h-4 w-4" />
                    {seriesResult.total_created} rendez-vous créés automatiquement
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {!isDone && !isPaymentStep && (
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="subtle"
              size="md"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
              Continuer <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        {isPaymentStep && (
          <div className="mt-8 flex items-center justify-between">
            <Button variant="subtle" size="md" onClick={() => setStep(si.info)}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              variant={barber.deposit_required ? 'spark' : 'primary'}
            >
              {submitting
                ? 'Confirmation…'
                : barber.deposit_required
                ? "Payer l'acompte"
                : 'Confirmer'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stylist picker ─────────────────────────────────────────────────────────

function StylistPicker({
  stylists,
  selected,
  onSelect,
}: {
  stylists: Stylist[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="mb-4 text-sm text-white/50">
        Choisis ton coiffeur. Les disponibilités s'adaptent automatiquement.
      </p>
      {stylists.map((s) => {
        const isSel = selected === s.id;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-all duration-150',
              isSel
                ? 'border-electric-500/50 bg-electric-500/[0.08] shadow-glow'
                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]',
            )}
          >
            {/* Avatar */}
            <div
              className={cn(
                'relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl text-base font-bold transition',
                isSel ? 'bg-electric-500 text-white' : 'bg-white/[0.06] text-white/60',
              )}
              style={
                s.avatar_url
                  ? { backgroundImage: `url(${s.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : {}
              }
            >
              {!s.avatar_url && (s.name.charAt(0).toUpperCase() || <User className="h-5 w-5" />)}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{s.name}</div>
              {s.bio && <div className="mt-0.5 truncate text-xs text-white/45">{s.bio}</div>}
              {s.specialties && s.specialties.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {s.specialties.map((sp) => (
                    <span
                      key={sp}
                      className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50"
                    >
                      {sp}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Check */}
            <div
              className={cn(
                'grid h-5 w-5 flex-none place-items-center rounded-full border transition',
                isSel ? 'border-electric-400 bg-electric-500' : 'border-white/20',
              )}
            >
              {isSel && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Date & time picker ─────────────────────────────────────────────────────

function DateTimePicker({
  date, setDate, time, setTime, slots, slotsLoading, needsStylist,
}: {
  date: string | null;
  setDate: (v: string) => void;
  time: string | null;
  setTime: (v: string) => void;
  slots: Slot[];
  slotsLoading: boolean;
  needsStylist: boolean;
}) {
  const days = useMemo(() => {
    const arr: Date[] = [];
    const d = new Date();
    while (arr.length < 14) {
      if (d.getDay() !== 0) arr.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return arr;
  }, []);

  return (
    <div>
      {/* Day picker */}
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white/75">
        <Calendar className="h-4 w-4 text-electric-300" /> Choisis un jour
      </div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {days.map((d) => {
          const iso = d.toISOString().slice(0, 10);
          const isSel = iso === date;
          return (
            <button
              key={iso}
              onClick={() => setDate(iso)}
              className={cn(
                'flex min-w-[68px] flex-col items-center rounded-2xl border px-3 py-2.5 text-xs transition-all duration-150',
                isSel
                  ? 'border-electric-500/50 bg-electric-500/10 text-white shadow-glow'
                  : 'border-white/[0.08] bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white',
              )}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                {d.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </span>
              <span className="mt-1 text-xl font-bold text-white tabular-nums">{d.getDate()}</span>
              <span className="text-[10px] uppercase text-white/40">
                {d.toLocaleDateString('fr-FR', { month: 'short' })}
              </span>
            </button>
          );
        })}
      </div>

      {/* Slot picker */}
      <div className="mb-3 mt-7 flex items-center gap-2 text-sm font-medium text-white/75">
        <Clock className="h-4 w-4 text-electric-300" /> Choisis un créneau
      </div>

      {needsStylist ? (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/40">
          Retourne à l'étape précédente pour choisir un coiffeur.
        </p>
      ) : !date ? (
        <p className="text-sm text-white/35">Sélectionne un jour pour voir les disponibilités.</p>
      ) : slotsLoading ? (
        <div className="flex items-center gap-2 py-4 text-sm text-white/40">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-electric-500 border-t-transparent" />
          Chargement des disponibilités…
        </div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-white/35">Aucun créneau disponible pour ce jour.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {slots.map((s) => {
            const isSel = s.time === time;
            return (
              <button
                key={s.time}
                onClick={() => s.available && setTime(s.time)}
                disabled={!s.available}
                title={!s.available ? 'Créneau pris' : undefined}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-sm font-medium transition-all duration-150',
                  !s.available && 'cursor-not-allowed opacity-30 line-through',
                  s.available && isSel
                    ? 'border-electric-500/50 bg-electric-500/10 text-white shadow-glow'
                    : s.available
                    ? 'border-white/[0.08] bg-white/[0.02] text-white/70 hover:border-white/20 hover:text-white'
                    : 'border-white/[0.06] bg-white/[0.01] text-white/25',
                )}
              >
                {s.time}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Summary row ────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={cn('text-white/55', bold && 'text-white/80')}>{label}</span>
      <span className={cn(bold && 'text-base font-bold', highlight && 'font-semibold text-spark-400')}>
        {value}
      </span>
    </div>
  );
}
