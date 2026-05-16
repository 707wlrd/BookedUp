'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Clock, CreditCard, User,
  Upload, Camera, Instagram, MapPin, FileText, Loader2,
  CheckCircle2, AlertCircle, ToggleLeft, ToggleRight,
  ExternalLink, ShieldCheck, Mail, Lock, LogOut, Trash2,
  X, Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Tab = 'salon' | 'horaires' | 'paiements' | 'compte';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface DaySchedule {
  open: boolean;
  from: string;
  to: string;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

const DEFAULT_HOURS: DaySchedule[] = [
  { open: true,  from: '09:00', to: '19:00' }, // Lun
  { open: true,  from: '09:00', to: '19:00' }, // Mar
  { open: true,  from: '09:00', to: '19:00' }, // Mer
  { open: true,  from: '09:00', to: '19:00' }, // Jeu
  { open: true,  from: '09:00', to: '19:00' }, // Ven
  { open: true,  from: '09:00', to: '19:00' }, // Sam
  { open: false, from: '09:00', to: '19:00' }, // Dim
];

/* ─────────────────────────────────────────────
   Toast inline helper
───────────────────────────────────────────── */
function Toast({ state }: { state: SaveState }) {
  return (
    <AnimatePresence mode="wait">
      {state === 'saved' && (
        <motion.span
          key="saved"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré !
        </motion.span>
      )}
      {state === 'error' && (
        <motion.span
          key="error"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-1.5 text-xs font-medium text-red-400"
        >
          <AlertCircle className="h-3.5 w-3.5" /> Erreur — réessaie
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────
   SaveButton
───────────────────────────────────────────── */
function SaveButton({
  state,
  onClick,
  disabled,
}: {
  state: SaveState;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={state === 'saving' || disabled}
        className={cn(
          'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150',
          'bg-electric-500 text-white hover:bg-electric-400 hover:shadow-[0_8px_32px_-8px_rgba(59,130,255,0.5)] hover:-translate-y-[1px]',
          'disabled:opacity-50 disabled:pointer-events-none',
        )}
      >
        {state === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === 'saving' ? 'Enregistrement…' : 'Sauvegarder'}
      </button>
      <Toast state={state} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page principale
───────────────────────────────────────────── */
export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('salon');
  const [loadingData, setLoadingData] = useState(true);

  /* Barber data */
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [barberId, setBarberId] = useState<string | null>(null);

  /* ── Onglet 1 : Salon ── */
  const [shopName, setShopName] = useState('');
  const [bio, setBio] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [salonSave, setSalonSave] = useState<SaveState>('idle');
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const salonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Onglet 2 : Horaires ── */
  const [hours, setHours] = useState<DaySchedule[]>(DEFAULT_HOURS);
  const [hoursSave, setHoursSave] = useState<SaveState>('idle');
  const hoursTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Onglet 3 : Paiements ── */
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositAmount, setDepositAmount] = useState('10');
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [paymentsSave, setPaymentsSave] = useState<SaveState>('idle');
  const paymentsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Onglet 4 : Compte ── */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const [passwordSent, setPasswordSent] = useState(false);

  /* ─── Load data ─── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingData(false); return; }

      setUserId(user.id);
      setUserEmail(user.email ?? '');

      const { data } = await supabase
        .from('barbers')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data) {
        setBarberId(data.id ?? null);
        setShopName(data.shop_name ?? '');
        setBio(data.bio ?? '');
        setAddress(data.address ?? '');
        setCity(data.city ?? '');
        setInstagramHandle(data.instagram_handle ?? '');
        setAvatarUrl(data.avatar_url ?? '');
        setAvatarPreview(data.avatar_url ?? '');
        setCoverUrl(data.cover_url ?? '');
        setDepositEnabled(data.deposit_required ?? false);
        setDepositAmount(
          data.deposit_amount_cents ? String(Math.round(data.deposit_amount_cents / 100)) : '10',
        );
        setStripeAccountId(data.stripe_account_id ?? null);

        /* Horaires JSON */
        if (data.opening_hours && Array.isArray(data.opening_hours) && data.opening_hours.length === 7) {
          setHours(data.opening_hours as DaySchedule[]);
        }
      }

      setLoadingData(false);
    }
    load();
  }, []);

  /* ─── Upload avatar ─── */
  async function handleAvatarUpload(file: File) {
    if (!userId) return;
    setUploadingAvatar(true);

    // Preview immédiat
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);

    const ext = file.name.split('.').pop();
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarUrl(data.publicUrl);
    }
    setUploadingAvatar(false);
  }

  /* ─── Upload cover ─── */
  async function handleCoverUpload(file: File) {
    if (!userId) return;
    setUploadingCover(true);

    const ext = file.name.split('.').pop();
    const path = `${userId}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(path, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage.from('covers').getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    }
    setUploadingCover(false);
  }

  /* ─── Save salon ─── */
  async function saveSalon() {
    if (!userId) return;
    setSalonSave('saving');
    if (salonTimerRef.current) clearTimeout(salonTimerRef.current);

    const { error } = await supabase
      .from('barbers')
      .update({
        shop_name: shopName,
        bio,
        address,
        city,
        instagram_handle: instagramHandle,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      })
      .eq('owner_id', userId);

    if (error) {
      console.error('[settings/salon]', error);
      setSalonSave('error');
    } else {
      setSalonSave('saved');
      salonTimerRef.current = setTimeout(() => setSalonSave('idle'), 3000);
    }
  }

  /* ─── Save horaires ─── */
  async function saveHours() {
    if (!userId) return;
    setHoursSave('saving');
    if (hoursTimerRef.current) clearTimeout(hoursTimerRef.current);

    const { error } = await supabase
      .from('barbers')
      .update({ opening_hours: hours })
      .eq('owner_id', userId);

    if (error) {
      setHoursSave('error');
    } else {
      setHoursSave('saved');
      hoursTimerRef.current = setTimeout(() => setHoursSave('idle'), 3000);
    }
  }

  /* ─── Save paiements ─── */
  async function savePayments() {
    if (!userId) return;
    setPaymentsSave('saving');
    if (paymentsTimerRef.current) clearTimeout(paymentsTimerRef.current);

    const amountCents = Math.round(parseFloat(depositAmount || '0') * 100);

    const { error } = await supabase
      .from('barbers')
      .update({
        deposit_required: depositEnabled,
        deposit_amount_cents: depositEnabled ? amountCents : 0,
      })
      .eq('owner_id', userId);

    if (error) {
      setPaymentsSave('error');
    } else {
      setPaymentsSave('saved');
      paymentsTimerRef.current = setTimeout(() => setPaymentsSave('idle'), 3000);
    }
  }

  /* ─── Password reset ─── */
  async function handlePasswordReset() {
    if (!userEmail) return;
    await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setPasswordSent(true);
  }

  /* ─── Sign out ─── */
  async function handleSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push('/');
  }

  /* ─── Delete account ─── */
  async function handleDeleteAccount() {
    if (deleteConfirm !== 'SUPPRIMER') return;
    // Appel à un endpoint API dédié (nécessite service role)
    await fetch('/api/account/delete', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.push('/');
  }

  /* ─── Day toggle ─── */
  const toggleDay = useCallback((i: number) => {
    setHours((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], open: !next[i].open };
      return next;
    });
  }, []);

  const updateDayTime = useCallback((i: number, field: 'from' | 'to', value: string) => {
    setHours((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }, []);

  /* ─────────────────────────── TABS CONFIG ─── */
  const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
    { id: 'salon',     label: 'Mon salon',  Icon: Store      },
    { id: 'horaires',  label: 'Horaires',   Icon: Clock      },
    { id: 'paiements', label: 'Paiements',  Icon: CreditCard },
    { id: 'compte',    label: 'Compte',     Icon: User       },
  ];

  /* ────────────────────────────────────────── */

  if (loadingData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">

      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Paramètres</h1>
        <p className="mt-1 text-sm text-white/45">Profil, horaires, paiements, compte.</p>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-1">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150',
              activeTab === id
                ? 'bg-electric-500/[0.15] text-white shadow-sm'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <Icon className={cn('h-4 w-4', activeTab === id ? 'text-electric-300' : '')} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════
          ONGLET 1 : MON SALON
      ══════════════════════════════════════════ */}
      {activeTab === 'salon' && (
        <motion.div
          key="salon"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* ── Avatar + Cover ── */}
          <div className="card p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Visuels</h2>

            {/* Cover image */}
            <div>
              <label className="label mb-2 block">Photo de couverture</label>
              <div
                className={cn(
                  'relative h-32 w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]',
                  'flex items-center justify-center cursor-pointer transition hover:border-electric-500/40',
                )}
                onClick={() => coverInputRef.current?.click()}
              >
                {coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Importer une cover (1200×400 px)</span>
                  </div>
                )}
                {uploadingCover && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
                {coverUrl && (
                  <div className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-2 py-1 text-[11px] text-white/70 backdrop-blur-sm">
                    Cliquer pour changer
                  </div>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverUpload(f);
                }}
              />
            </div>

            {/* Avatar */}
            <div>
              <label className="label mb-2 block">Logo / Avatar</label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl border border-white/[0.1] bg-white/[0.05]">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Camera className="h-6 w-6 text-white/20" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    <Upload className="h-3.5 w-3.5" /> Importer
                  </button>
                  <p className="text-[11px] text-white/30">PNG, JPG, WebP — max 2 Mo</p>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAvatarUpload(f);
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Infos salon ── */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Informations</h2>

            <div>
              <label className="label">Nom du salon</label>
              <input
                className="input mt-1.5"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="Malik Cuts"
              />
            </div>

            <div>
              <label className="label">Bio</label>
              <textarea
                className="input mt-1.5 resize-none"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Fades nets, designs sur mesure…"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                  Adresse
                </label>
                <input
                  className="input mt-1.5"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 rue de la République"
                />
              </div>
              <div>
                <label className="label">Ville</label>
                <input
                  className="input mt-1.5"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Paris"
                />
              </div>
            </div>

            <div>
              <label className="label">
                <Instagram className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                Instagram
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/30">@</span>
                <input
                  className="input pl-7"
                  value={instagramHandle.replace(/^@/, '')}
                  onChange={(e) => setInstagramHandle(e.target.value)}
                  placeholder="malikcuts"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <SaveButton state={salonSave} onClick={saveSalon} />
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          ONGLET 2 : HORAIRES
      ══════════════════════════════════════════ */}
      {activeTab === 'horaires' && (
        <motion.div
          key="horaires"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          <div className="card p-6 space-y-1">
            <h2 className="mb-5 text-xs font-semibold uppercase tracking-wider text-white/50">
              Horaires d'ouverture
            </h2>

            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const d = hours[i];
                return (
                  <div
                    key={day}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 transition-colors',
                      d.open ? 'bg-white/[0.03]' : 'bg-transparent opacity-50',
                    )}
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => toggleDay(i)}
                      className={cn(
                        'flex-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electric-500/40 rounded-full',
                        d.open ? 'text-electric-400' : 'text-white/20 hover:text-white/40',
                      )}
                      aria-pressed={d.open}
                      aria-label={`${day} ${d.open ? 'ouvert' : 'fermé'}`}
                    >
                      {d.open
                        ? <ToggleRight className="h-7 w-7" strokeWidth={1.5} />
                        : <ToggleLeft  className="h-7 w-7" strokeWidth={1.5} />}
                    </button>

                    {/* Jour */}
                    <span className="w-24 text-sm font-medium text-white/80">{day}</span>

                    {/* Heures */}
                    <div className={cn('flex items-center gap-2 ml-auto', !d.open && 'pointer-events-none')}>
                      <input
                        type="time"
                        value={d.from}
                        onChange={(e) => updateDayTime(i, 'from', e.target.value)}
                        disabled={!d.open}
                        className="input max-w-[110px] tabular-nums"
                      />
                      <span className="text-white/25">—</span>
                      <input
                        type="time"
                        value={d.to}
                        onChange={(e) => updateDayTime(i, 'to', e.target.value)}
                        disabled={!d.open}
                        className="input max-w-[110px] tabular-nums"
                      />
                    </div>

                    {!d.open && (
                      <span className="ml-2 text-xs text-white/30">Fermé</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <SaveButton state={hoursSave} onClick={saveHours} />
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          ONGLET 3 : PAIEMENTS
      ══════════════════════════════════════════ */}
      {activeTab === 'paiements' && (
        <motion.div
          key="paiements"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Acompte */}
          <div className="card p-6 space-y-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Acompte</h2>

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white/90">Exiger un acompte à la réservation</div>
                <div className="mt-0.5 text-xs text-white/40">
                  Le client paie l'acompte via Stripe avant que le RDV soit confirmé.
                </div>
              </div>
              <button
                onClick={() => setDepositEnabled((v) => !v)}
                className={cn(
                  'flex-none rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electric-500/50',
                  depositEnabled ? 'text-electric-400' : 'text-white/20 hover:text-white/40',
                )}
                aria-pressed={depositEnabled}
              >
                {depositEnabled
                  ? <ToggleRight className="h-9 w-9" strokeWidth={1.5} />
                  : <ToggleLeft  className="h-9 w-9" strokeWidth={1.5} />}
              </button>
            </div>

            <AnimatePresence>
              {depositEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                    <div>
                      <label className="label">Montant de l'acompte</label>
                      <div className="relative mt-2 max-w-[160px]">
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          step="1"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="input pr-8 tabular-nums"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">€</span>
                      </div>
                    </div>

                    {parseFloat(depositAmount) > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-3 py-2.5 text-xs text-white/70">
                        <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300" />
                        Le client paiera{' '}
                        <span className="mx-1 font-semibold text-white">{parseFloat(depositAmount)} €</span>
                        à la réservation. Le reste sera réglé en salon.
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-start gap-2 text-xs text-white/40">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300/60" />
              Paiement géré par Stripe. Les acomptes sont reversés automatiquement sur ton compte.
            </div>

            <SaveButton state={paymentsSave} onClick={savePayments} />
          </div>

          {/* Stripe Connect */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Stripe Connect</h2>

            <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="space-y-0.5">
                <div className="text-sm font-medium text-white/90">Compte Stripe</div>
                {stripeAccountId ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Connecté — {stripeAccountId.slice(0, 20)}…
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-white/35">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Non connecté — les paiements en ligne sont désactivés
                  </div>
                )}
              </div>

              <a
                href="/api/stripe/connect"
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-150',
                  stripeAccountId
                    ? 'border border-white/[0.1] bg-white/[0.04] text-white/60 hover:text-white hover:bg-white/[0.08]'
                    : 'bg-electric-500 text-white hover:bg-electric-400 hover:shadow-[0_8px_24px_-8px_rgba(59,130,255,0.5)]',
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {stripeAccountId ? 'Gérer Stripe' : 'Connecter Stripe'}
              </a>
            </div>

            <p className="text-[11px] text-white/30">
              BookedUp utilise Stripe Connect pour verser les paiements directement sur ton compte bancaire. Aucune donnée de carte n'est stockée par nos soins.
            </p>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          ONGLET 4 : COMPTE
      ══════════════════════════════════════════ */}
      {activeTab === 'compte' && (
        <motion.div
          key="compte"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Email */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Identifiants</h2>

            <div>
              <label className="label">
                <Mail className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                Adresse e-mail
              </label>
              <input
                className="input mt-1.5 cursor-not-allowed opacity-50"
                value={userEmail}
                readOnly
                disabled
              />
              <p className="mt-1 text-[11px] text-white/30">
                L'adresse e-mail ne peut pas être modifiée ici.
              </p>
            </div>

            <div className="border-t border-white/[0.06] pt-4">
              <label className="label">
                <Lock className="mr-1 inline h-3.5 w-3.5 text-white/40" />
                Mot de passe
              </label>
              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={handlePasswordReset}
                  disabled={passwordSent}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-150',
                    passwordSent
                      ? 'border border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-400 cursor-default'
                      : 'border border-white/[0.1] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white',
                  )}
                >
                  {passwordSent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" /> E-mail envoyé !
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Changer le mot de passe
                    </>
                  )}
                </button>
              </div>
              {passwordSent && (
                <p className="mt-1.5 text-[11px] text-white/40">
                  Vérifie ta boîte mail ({userEmail}) pour réinitialiser ton mot de passe.
                </p>
              )}
            </div>
          </div>

          {/* Déconnexion */}
          <div className="card p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/50">Session</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white/90">Se déconnecter</div>
                <div className="text-xs text-white/35">Tu seras redirigé vers la page d'accueil.</div>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-50"
              >
                {signingOut
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <LogOut className="h-4 w-4" />}
                {signingOut ? 'Déconnexion…' : 'Se déconnecter'}
              </button>
            </div>
          </div>

          {/* Danger zone */}
          <div className="card border-red-500/20 p-6 space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-400/70">Zone de danger</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-white/90">Supprimer mon compte</div>
                <div className="text-xs text-white/35">
                  Action irréversible. Toutes tes données seront supprimées.
                </div>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/[0.08] px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/[0.15] hover:text-red-300"
              >
                <Trash2 className="h-4 w-4" /> Supprimer
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════
          MODALE SUPPRESSION
      ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            />

            {/* Modal */}
            <motion.div
              key="modal"
              initial={{ opacity: 0, scale: 0.94, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-red-500/20 bg-[rgb(10,10,14)] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">Supprimer mon compte</h3>
                  <p className="mt-1 text-sm text-white/45">
                    Cette action est définitive et irréversible.
                  </p>
                </div>
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                  className="rounded-full p-1 text-white/30 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-300/80">
                <strong className="font-semibold">Attention :</strong> Tous tes rendez-vous, clients, services et données seront supprimés immédiatement. Aucune récupération ne sera possible.
              </div>

              <div className="mt-4">
                <label className="label">
                  Tape <span className="font-mono font-bold text-red-400">SUPPRIMER</span> pour confirmer
                </label>
                <input
                  className="input mt-1.5 font-mono"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                />
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm(''); }}
                  className="flex-1 rounded-full border border-white/[0.1] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/60 transition hover:text-white"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirm !== 'SUPPRIMER'}
                  className="flex-1 rounded-full bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-30 disabled:pointer-events-none"
                >
                  Supprimer définitivement
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
