'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Check, Loader2, Store, Link2,
  ImagePlus, Scissors, CreditCard, Sparkles, Plus, Trash2,
  AlertCircle, CheckCircle2, MapPin,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ── Constants ──────────────────────────────────────────────────────────────────
type StepId = 'welcome' | 'salon' | 'location' | 'avatar' | 'services' | 'deposit' | 'done';
const NUMBERED: StepId[] = ['salon', 'location', 'avatar', 'services', 'deposit'];
const FLOW:     StepId[] = ['welcome', ...NUMBERED, 'done'];

const PRESET_SERVICES = [
  { name: 'Coupe classique',   duration: 30, price: '25' },
  { name: 'Fade',              duration: 45, price: '30' },
  { name: 'Barbe',             duration: 20, price: '15' },
  { name: 'Coupe + barbe',     duration: 55, price: '40' },
  { name: 'Design / motif',    duration: 60, price: '50' },
  { name: 'Enfant (- 12 ans)', duration: 25, price: '18' },
];

const DURATIONS = [15, 20, 25, 30, 45, 60, 75, 90];

type ServiceRow = { name: string; duration: number; price: string; isPreset: boolean };

// ── Helpers ────────────────────────────────────────────────────────────────────
function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function fmtDur(min: number) {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? min % 60 : ''}`;
}

const slide = {
  initial: (d: number) => ({ opacity: 0, x: d * 36 }),
  animate: { opacity: 1, x: 0 },
  exit:    (d: number) => ({ opacity: 0, x: d * -36 }),
};

// ── Page ───────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router   = useRouter();
  const supabase = createClient();
  const fileRef  = useRef<HTMLInputElement>(null);
  const slugRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [userId,    setUserId]    = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [step,      setStep]      = useState<StepId>('welcome');
  const [dir,       setDir]       = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  // ── Form state ───────────────────────────────────────────────────────────
  const [shopName,  setShopName]  = useState('');
  const [slug,      setSlug]      = useState('');
  const [bio,       setBio]       = useState('');
  const [slugStatus, setSlugStatus] = useState<'idle'|'checking'|'ok'|'taken'|'short'>('idle');

  const [city,    setCity]    = useState('');
  const [address, setAddress] = useState('');

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Services: start with 3 presets pre-selected
  const [services, setServices] = useState<ServiceRow[]>(
    PRESET_SERVICES.slice(0, 3).map(p => ({ ...p, isPreset: true }))
  );
  const [presetSelected, setPresetSelected] = useState<Set<number>>(new Set([0, 1, 2]));

  const [depositOn,     setDepositOn]     = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      setAuthReady(true);
    });
  }, []);

  if (!authReady) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-electric-400" />
    </div>
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  function goTo(next: StepId, d = 1) {
    setError(''); setDir(d); setStep(next);
  }
  function back() {
    const i = FLOW.indexOf(step);
    if (i > 0) goTo(FLOW[i - 1] as StepId, -1);
  }

  // ── Slug logic ────────────────────────────────────────────────────────────
  function onShopNameChange(val: string) {
    setShopName(val);
    const s = slugify(val);
    setSlug(s);
    checkSlug(s);
  }
  function onSlugChange(val: string) {
    const s = slugify(val);
    setSlug(s);
    checkSlug(s);
  }
  function checkSlug(s: string) {
    if (s.length < 3) { setSlugStatus('short'); return; }
    setSlugStatus('checking');
    if (slugRef.current) clearTimeout(slugRef.current);
    slugRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('barbers').select('id').eq('slug', s).maybeSingle();
      setSlugStatus(data ? 'taken' : 'ok');
    }, 420);
  }

  // ── Avatar ────────────────────────────────────────────────────────────────
  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  // ── Services ──────────────────────────────────────────────────────────────
  function togglePreset(i: number) {
    const next = new Set(presetSelected);
    if (next.has(i)) {
      next.delete(i);
      setServices(prev => prev.filter(s => !(s.isPreset && s.name === PRESET_SERVICES[i].name)));
    } else {
      next.add(i);
      const p = PRESET_SERVICES[i];
      setServices(prev => [...prev, { name: p.name, duration: p.duration, price: p.price, isPreset: true }]);
    }
    setPresetSelected(next);
  }
  function addCustom() {
    setServices(prev => [...prev, { name: '', duration: 30, price: '', isPreset: false }]);
  }
  function removeService(idx: number) {
    const svc = services[idx];
    if (svc.isPreset) {
      const pi = PRESET_SERVICES.findIndex(p => p.name === svc.name);
      if (pi >= 0) {
        const next = new Set(presetSelected);
        next.delete(pi);
        setPresetSelected(next);
      }
    }
    setServices(prev => prev.filter((_, j) => j !== idx));
  }
  function updateService(idx: number, field: keyof ServiceRow, val: string | number) {
    setServices(prev => prev.map((s, j) => j === idx ? { ...s, [field]: val } : s));
  }

  // ── Finish ────────────────────────────────────────────────────────────────
  async function finish() {
    const validSvcs = services.filter(s => s.name.trim() && Number(s.price) > 0);
    if (validSvcs.length === 0) { setError('Ajoute au moins un service.'); return; }

    setSaving(true); setError('');

    try {
      // 1. Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile && userId) {
        const ext  = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `barbers/${userId}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars').upload(path, avatarFile, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = publicUrl;
        }
      }

      // 2. Create barber record
      const { data: barber, error: barberErr } = await supabase
        .from('barbers')
        .insert({
          owner_id:             userId!,
          shop_name:            shopName.trim(),
          slug,
          bio:                  bio.trim() || null,
          address:              address.trim() || null,
          city:                 city.trim(),
          country:              'FR',
          avatar_url:           avatarUrl,
          deposit_required:     depositOn,
          deposit_amount_cents: depositOn ? Math.round(Number(depositAmount) * 100) : 0,
          subscription_tier:    'free',
          onboarding_completed: true,
        })
        .select('id')
        .single();

      if (barberErr) {
        setError(barberErr.message.includes('unique')
          ? 'Ce nom ou URL est déjà utilisé.'
          : barberErr.message);
        setSaving(false); return;
      }

      // 3. Insert services
      await supabase.from('services').insert(
        validSvcs.map((s, i) => ({
          barber_id:        barber.id,
          name:             s.name.trim(),
          duration_minutes: s.duration,
          price_cents:      Math.round(Number(s.price) * 100),
          sort_order:       i + 1,
          is_active:        true,
        }))
      );

      // 4. Done!
      goTo('done');
      setTimeout(() => router.replace('/studio?welcome=1'), 2000);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inconnue');
      setSaving(false);
    }
  }

  // ── Step validation ───────────────────────────────────────────────────────
  function canAdvance(): boolean {
    if (step === 'salon')    return shopName.trim().length > 1 && slugStatus === 'ok';
    if (step === 'location') return city.trim().length > 1;
    if (step === 'avatar')   return true; // always skippable
    if (step === 'services') return services.some(s => s.name.trim() && Number(s.price) > 0);
    if (step === 'deposit')  return !depositOn || Number(depositAmount) > 0;
    return true;
  }

  async function handleNext() {
    if (!canAdvance()) return;
    if (step === 'deposit') { await finish(); return; }
    const i = FLOW.indexOf(step);
    if (i < FLOW.length - 1) goTo(FLOW[i + 1] as StepId);
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  const stepIdx  = NUMBERED.indexOf(step as any);
  const progress = step === 'done' ? 100 : stepIdx < 0 ? 0 : ((stepIdx + 1) / NUMBERED.length) * 100;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-6">
        <span className="inline-block rounded-full bg-electric-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
          BookedUp
        </span>
      </div>

      {/* Progress bar + step dots */}
      {step !== 'welcome' && step !== 'done' && (
        <div className="mb-8 w-full max-w-lg">
          <div className="mb-3 flex justify-between px-1">
            {NUMBERED.map((s, i) => {
              const done = stepIdx > i, cur = stepIdx === i;
              return (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold transition-all duration-300',
                    done ? 'bg-electric-500 text-white' :
                    cur  ? 'ring-1 ring-electric-500/50 bg-electric-500/15 text-electric-300' :
                           'bg-white/[0.05] text-white/20',
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span className={cn(
                    'hidden text-[10px] sm:block transition-colors',
                    cur ? 'text-white/60' : 'text-white/20',
                  )}>
                    {s === 'salon' ? 'Salon' : s === 'location' ? 'Adresse' :
                     s === 'avatar' ? 'Logo' : s === 'services' ? 'Services' : 'Acomptes'}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-electric-500"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div key={step} custom={dir} variants={slide}
            initial="initial" animate="animate" exit="exit"
            transition={{ duration: 0.22, ease: 'easeInOut' }}>

            {/* ── WELCOME ── */}
            {step === 'welcome' && (
              <div className="card p-10 text-center">
                <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-electric-500/15">
                  <Sparkles className="h-8 w-8 text-electric-400" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Bienvenue sur BookedUp !</h1>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Configurons ton salon en <strong className="text-white/70">5 étapes</strong>.<br />
                  Ça prend moins de 3 minutes.
                </p>
                <div className="mt-8 flex flex-col gap-2.5">
                  <button onClick={() => goTo('salon')}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-electric-500 py-3.5 text-sm font-semibold text-white hover:bg-electric-400 transition-colors">
                    Commencer <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── SALON ── */}
            {step === 'salon' && (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15">
                    <Store className="h-5 w-5 text-electric-400" />
                  </div>
                  <h2 className="text-xl font-bold">Ton salon</h2>
                  <p className="mt-1 text-sm text-white/45">Ces infos apparaissent sur ta page publique.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="label">Nom du salon <span className="text-red-400">*</span></label>
                      <input className="input mt-1.5 w-full" placeholder="Ex : Barber Republic"
                        value={shopName} onChange={e => onShopNameChange(e.target.value)} autoFocus />
                    </div>

                    <div>
                      <label className="label">URL publique <span className="text-red-400">*</span></label>
                      <div className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.04] focus-within:border-electric-500/40 transition-colors">
                        <span className="select-none whitespace-nowrap px-3 text-xs text-white/30">bookedup.fr/barbers/</span>
                        <input
                          className="flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-white/20"
                          value={slug}
                          onChange={e => onSlugChange(e.target.value)}
                          placeholder="mon-salon"
                        />
                        <div className="pr-3 shrink-0">
                          {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-white/30" />}
                          {slugStatus === 'ok'       && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                          {slugStatus === 'taken'    && <AlertCircle className="h-4 w-4 text-red-400" />}
                        </div>
                      </div>
                      <div className="mt-1.5 text-xs">
                        {slugStatus === 'ok'    && <span className="text-emerald-400">✓ Disponible</span>}
                        {slugStatus === 'taken' && <span className="text-red-400">✗ Déjà utilisé — essaie une variante</span>}
                        {slugStatus === 'short' && slug.length > 0 && <span className="text-orange-400">Minimum 3 caractères</span>}
                      </div>
                    </div>

                    <div>
                      <label className="label">Bio <span className="text-white/30 text-xs">(optionnel)</span></label>
                      <textarea className="input mt-1.5 w-full min-h-[80px] resize-none" maxLength={280}
                        placeholder="Fades nets, designs sur mesure, ambiance premium…"
                        value={bio} onChange={e => setBio(e.target.value)} />
                      <div className="mt-1 text-right text-[10px] text-white/25">{bio.length}/280</div>
                    </div>
                  </div>
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Nav onNext={handleNext} disabled={!canAdvance() || slugStatus === 'checking'} saving={saving} canBack={false} />
              </div>
            )}

            {/* ── LOCATION ── */}
            {step === 'location' && (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15">
                    <MapPin className="h-5 w-5 text-electric-400" />
                  </div>
                  <h2 className="text-xl font-bold">Où es-tu ?</h2>
                  <p className="mt-1 text-sm text-white/45">Pour que les clients proches te trouvent.</p>

                  <div className="mt-5 space-y-4">
                    <div>
                      <label className="label">Ville <span className="text-red-400">*</span></label>
                      <input className="input mt-1.5 w-full" placeholder="Ex : Paris"
                        value={city} onChange={e => setCity(e.target.value)} autoFocus />
                    </div>
                    <div>
                      <label className="label">Adresse <span className="text-white/30 text-xs">(optionnel)</span></label>
                      <input className="input mt-1.5 w-full" placeholder="Ex : 12 rue du Commerce"
                        value={address} onChange={e => setAddress(e.target.value)} />
                    </div>
                  </div>
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Nav onNext={handleNext} onBack={back} disabled={!canAdvance()} saving={saving} />
              </div>
            )}

            {/* ── AVATAR ── */}
            {step === 'avatar' && (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15">
                    <ImagePlus className="h-5 w-5 text-electric-400" />
                  </div>
                  <h2 className="text-xl font-bold">Logo / Photo du salon</h2>
                  <p className="mt-1 text-sm text-white/45">Apparaît sur ta page publique. Tu peux passer et ajouter plus tard.</p>

                  <div className="mt-6 flex flex-col items-center gap-4">
                    <div
                      className={cn(
                        'relative h-28 w-28 overflow-hidden rounded-2xl border-2',
                        avatarPreview ? 'border-electric-500/40' : 'border-dashed border-white/10',
                      )}
                      style={avatarPreview ? { backgroundImage: `url(${avatarPreview})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                    >
                      {!avatarPreview && (
                        <div className="flex h-full items-center justify-center text-white/15">
                          <ImagePlus className="h-8 w-8" />
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                    <button onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 rounded-full border border-white/[0.1] px-4 py-2 text-sm text-white/50 transition hover:border-white/20 hover:text-white">
                      <ImagePlus className="h-4 w-4" />
                      {avatarPreview ? 'Changer la photo' : 'Choisir une photo'}
                    </button>
                  </div>
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Nav onNext={handleNext} onBack={back} saving={saving} skipLabel="Passer cette étape" />
              </div>
            )}

            {/* ── SERVICES ── */}
            {step === 'services' && (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15">
                    <Scissors className="h-5 w-5 text-electric-400" />
                  </div>
                  <h2 className="text-xl font-bold">Tes services</h2>
                  <p className="mt-1 text-sm text-white/45">Sélectionne les prestations que tu proposes et ajuste les prix.</p>

                  {/* Preset toggles */}
                  <div className="mt-5 space-y-2">
                    {PRESET_SERVICES.map((p, i) => {
                      const on = presetSelected.has(i);
                      return (
                        <button key={i} onClick={() => togglePreset(i)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
                            on ? 'border-electric-500/40 bg-electric-500/[0.06]'
                               : 'border-white/[0.07] bg-white/[0.02] hover:border-white/15',
                          )}>
                          <span className="font-medium">{p.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-white/40 text-xs">{fmtDur(p.duration)}</span>
                            <span className="font-bold">{p.price} €</span>
                            <div className={cn(
                              'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition',
                              on ? 'border-electric-400 bg-electric-500' : 'border-white/20',
                            )}>
                              {on && <Check className="h-3 w-3 text-white" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom services */}
                  {services.filter(s => !s.isPreset).length > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="text-xs text-white/35 uppercase tracking-wider">Services personnalisés</div>
                      {services.map((s, idx) => !s.isPreset && (
                        <div key={idx} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
                          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
                            <div>
                              <label className="text-[10px] text-white/35">Nom</label>
                              <input className="input mt-0.5 w-full text-sm py-2"
                                placeholder="Nom du service"
                                value={s.name}
                                onChange={e => updateService(idx, 'name', e.target.value)} />
                            </div>
                            <div>
                              <label className="text-[10px] text-white/35">Durée</label>
                              <select className="input mt-0.5 text-sm py-2 cursor-pointer"
                                value={s.duration}
                                onChange={e => updateService(idx, 'duration', Number(e.target.value))}>
                                {DURATIONS.map(d => <option key={d} value={d}>{fmtDur(d)}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-white/35">Prix €</label>
                              <input className="input mt-0.5 w-16 text-sm py-2" type="number"
                                min="0" step="0.5" placeholder="0"
                                value={s.price}
                                onChange={e => updateService(idx, 'price', e.target.value)} />
                            </div>
                            <button onClick={() => removeService(idx)}
                              className="mb-0.5 text-white/20 hover:text-red-400 transition-colors self-end pb-2">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={addCustom}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.1] py-2.5 text-sm text-white/35 transition hover:border-white/20 hover:text-white/60">
                    <Plus className="h-4 w-4" /> Ajouter un service personnalisé
                  </button>
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Nav onNext={handleNext} onBack={back} disabled={!canAdvance()} saving={saving} />
              </div>
            )}

            {/* ── DEPOSIT ── */}
            {step === 'deposit' && (
              <div className="space-y-4">
                <div className="card p-6">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-electric-500/15">
                    <CreditCard className="h-5 w-5 text-electric-400" />
                  </div>
                  <h2 className="text-xl font-bold">Acomptes en ligne</h2>
                  <p className="mt-1 text-sm text-white/45">
                    Demande un pré-paiement pour sécuriser tes RDV. Modifiable à tout moment dans les paramètres.
                  </p>

                  <div className="mt-6">
                    <button onClick={() => setDepositOn(v => !v)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all',
                        depositOn ? 'border-electric-500/30 bg-electric-500/[0.06]'
                                  : 'border-white/[0.08] bg-white/[0.03]',
                      )}>
                      <div>
                        <div className="font-medium text-sm">Activer les acomptes</div>
                        <div className="mt-0.5 text-xs text-white/40">Le client paie en ligne lors de la réservation</div>
                      </div>
                      <div className={cn('relative h-6 w-10 rounded-full transition-colors', depositOn ? 'bg-electric-500' : 'bg-white/10')}>
                        <div className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', depositOn ? 'left-5' : 'left-0.5')} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {depositOn && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4">
                            <label className="label">Montant de l'acompte (€) <span className="text-red-400">*</span></label>
                            <input className="input mt-1.5 w-full" type="number" min="1" step="1"
                              placeholder="Ex : 20" value={depositAmount}
                              onChange={e => setDepositAmount(e.target.value)} />
                            <p className="mt-1.5 text-xs text-white/30">
                              Nécessite une connexion Stripe dans les paramètres du Studio.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                {error && <ErrorMsg>{error}</ErrorMsg>}
                <Nav
                  onNext={handleNext}
                  onBack={back}
                  saving={saving}
                  disabled={!canAdvance()}
                  nextLabel="Lancer mon Studio ✨"
                  skipLabel={!depositOn ? 'Passer, je configurerai plus tard' : undefined}
                />
              </div>
            )}

            {/* ── DONE ── */}
            {step === 'done' && (
              <div className="card p-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 250, damping: 18 }}
                  className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-500/15"
                >
                  <Check className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <h2 className="text-2xl font-bold tracking-tight">Ton salon est prêt !</h2>
                <p className="mt-3 text-sm leading-relaxed text-white/50">
                  Bienvenue dans ton Studio. On t'y redirige…
                </p>
                <div className="mt-6 flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-white/30" />
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function ErrorMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function Nav({
  onNext, onBack, saving, disabled, nextLabel = 'Continuer', skipLabel, canBack = true,
}: {
  onNext: () => void; onBack?: () => void; saving: boolean;
  disabled?: boolean; nextLabel?: string; skipLabel?: string; canBack?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-3">
        {canBack && onBack && (
          <button onClick={onBack} disabled={saving}
            className="flex items-center gap-1.5 rounded-full border border-white/[0.1] px-4 py-3 text-sm text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40">
            <ArrowLeft className="h-4 w-4" /> Retour
          </button>
        )}
        <button onClick={onNext} disabled={saving || disabled}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all',
            saving || disabled
              ? 'cursor-not-allowed bg-white/[0.06] text-white/25'
              : 'bg-electric-500 text-white hover:bg-electric-400',
          )}>
          {saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Création en cours…</>
            : <>{nextLabel} <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
      {skipLabel && (
        <button onClick={onNext}
          className="py-1 text-center text-xs text-white/30 transition hover:text-white/50">
          {skipLabel}
        </button>
      )}
    </div>
  );
}
