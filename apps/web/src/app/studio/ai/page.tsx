'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Sparkles, Copy, MessageSquare, ImageIcon, Bell,
  Loader2, Check, RefreshCw, Plus, X, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type Kind = 'caption' | 'story' | 'reminder';

interface Service { id: string; name: string }
interface Slot    { day: string; times: string }

const TOOLS = [
  {
    key: 'caption'  as Kind,
    Icon: MessageSquare,
    title: 'Caption Instagram',
    sub: 'Génère 3 captions prêts à poster.',
    color: 'electric',
  },
  {
    key: 'story'    as Kind,
    Icon: ImageIcon,
    title: 'Story créneaux dispos',
    sub: 'Annonce tes slots libres en 1 clic.',
    color: 'spark',
  },
  {
    key: 'reminder' as Kind,
    Icon: Bell,
    title: 'Rappel client',
    sub: 'SMS chaleureux, taux d\'ouverture +30 %.',
    color: 'electric',
  },
];

const VIBES = ['Street / Urban', 'Luxe / Premium', 'Friendly', 'Minimal', 'Hype / Viral'];

export default function AIStudioPage() {
  const supabase = createClient();

  // Barber data
  const [shopName, setShopName]   = useState('');
  const [barberId, setBarberId]   = useState<string | null>(null);
  const [services, setServices]   = useState<Service[]>([]);

  // Tool state
  const [kind, setKind]           = useState<Kind>('caption');

  // Caption inputs
  const [service, setService]     = useState('');
  const [vibe, setVibe]           = useState(VIBES[0]);

  // Story inputs
  const [slots, setSlots]         = useState<Slot[]>([{ day: 'Vendredi', times: '11:00, 15:30' }]);

  // Reminder inputs
  const [clientName, setClientName] = useState('');
  const [reminderService, setReminderService] = useState('');
  const [when, setWhen]           = useState('');

  // Output
  const [output, setOutput]       = useState('');
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied]       = useState(false);
  const outputRef                 = useRef<HTMLDivElement>(null);

  /* ── Load barber data ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: barber } = await supabase
        .from('barbers')
        .select('id, shop_name')
        .eq('owner_id', user.id)
        .single();
      if (barber) {
        setShopName(barber.shop_name);
        setBarberId(barber.id);
      }
      const { data: svcs } = await supabase
        .from('services')
        .select('id, name')
        .eq('barber_id', barber?.id)
        .eq('is_active', true)
        .order('sort_order');
      if (svcs?.length) {
        setServices(svcs);
        setService(svcs[0].name);
        setReminderService(svcs[0].name);
      }
    }
    load();
  }, []);

  /* ── Generate with streaming ── */
  async function generate() {
    setOutput('');
    setStreaming(true);

    const body: Record<string, any> = { kind, shopName, barberId };
    if (kind === 'caption')  { body.service = service; body.vibe = vibe; }
    if (kind === 'story')    { body.slots = slots.map(s => ({ day: s.day, times: s.times.split(',').map(t => t.trim()).filter(Boolean) })); }
    if (kind === 'reminder') { body.customerName = clientName; body.service = reminderService; body.when = when; }

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok || !res.body) {
        setOutput('Erreur — vérifie ta clé ANTHROPIC_API_KEY dans .env.local.');
        return;
      }

      const reader = res.body.getReader();
      const dec    = new TextDecoder();
      let acc      = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setOutput(acc);
        // Auto-scroll
        outputRef.current?.scrollTo({ top: outputRef.current.scrollHeight, behavior: 'smooth' });
      }
    } catch {
      setOutput('Erreur de connexion. Réessaie.');
    } finally {
      setStreaming(false);
    }
  }

  function copy() {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addSlot() {
    setSlots(s => [...s, { day: '', times: '' }]);
  }
  function removeSlot(i: number) {
    setSlots(s => s.filter((_, idx) => idx !== i));
  }
  function updateSlot(i: number, field: keyof Slot, val: string) {
    setSlots(s => s.map((sl, idx) => idx === i ? { ...sl, [field]: val } : sl));
  }

  const canGenerate = !streaming && !!shopName && (
    kind !== 'reminder' || (!!clientName && !!when)
  );

  return (
    <>
      <PageHeader
        title="AI Studio"
        subtitle="Génère du contenu pour tes réseaux et tes clients."
        actions={
          shopName
            ? <span className="chip-electric text-xs">{shopName}</span>
            : <span className="chip text-xs"><Loader2 className="h-3 w-3 animate-spin" /> Chargement…</span>
        }
      />

      {/* ── Tool selector ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {TOOLS.map((t) => {
          const active = kind === t.key;
          return (
            <button
              key={t.key}
              onClick={() => { setKind(t.key); setOutput(''); }}
              className={cn(
                'card group p-5 text-left transition-all duration-150',
                active
                  ? 'border-electric-500/40 bg-electric-500/[0.06] shadow-glow'
                  : 'hover:border-white/15',
              )}
            >
              <div className={cn(
                'mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl transition',
                active ? 'bg-electric-500/20 text-electric-300' : 'bg-white/[0.05] text-white/40 group-hover:text-white/70',
              )}>
                <t.Icon className="h-4 w-4" />
              </div>
              <div className={cn('text-sm font-semibold', active ? 'text-white' : 'text-white/70')}>{t.title}</div>
              <div className="mt-1 text-xs text-white/40">{t.sub}</div>
              {active && (
                <div className="mt-3 h-0.5 w-8 rounded-full bg-electric-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Inputs + Output ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">

        {/* Inputs panel */}
        <div className="card p-5 space-y-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Paramètres</div>

          {/* ── Caption inputs ── */}
          {kind === 'caption' && (
            <>
              <div>
                <label className="label">Prestation mise en avant</label>
                {services.length > 0 ? (
                  <select
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="input mt-1.5 appearance-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                    <option value="">Général (aucune)</option>
                  </select>
                ) : (
                  <input value={service} onChange={(e) => setService(e.target.value)} className="input mt-1.5" placeholder="Fade, coupe, barbe…" />
                )}
              </div>
              <div>
                <label className="label">Vibe</label>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {VIBES.map((v) => (
                    <button
                      key={v}
                      onClick={() => setVibe(v)}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition',
                        vibe === v
                          ? 'border-electric-500/50 bg-electric-500/10 text-electric-300'
                          : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white',
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Story inputs ── */}
          {kind === 'story' && (
            <div>
              <label className="label">Créneaux disponibles</label>
              <div className="mt-2 space-y-2">
                {slots.map((sl, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={sl.day}
                      onChange={(e) => updateSlot(i, 'day', e.target.value)}
                      className="input w-28 flex-none"
                      placeholder="Jour"
                    />
                    <input
                      value={sl.times}
                      onChange={(e) => updateSlot(i, 'times', e.target.value)}
                      className="input flex-1"
                      placeholder="11:00, 15:30"
                    />
                    {slots.length > 1 && (
                      <button onClick={() => removeSlot(i)} className="flex-none text-white/30 hover:text-white/70">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addSlot}
                  className="flex items-center gap-1.5 text-xs text-electric-300 hover:text-electric-200"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter un jour
                </button>
              </div>
            </div>
          )}

          {/* ── Reminder inputs ── */}
          {kind === 'reminder' && (
            <>
              <div>
                <label className="label">Nom du client</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input mt-1.5"
                  placeholder="Karim"
                />
              </div>
              <div>
                <label className="label">Prestation</label>
                {services.length > 0 ? (
                  <select
                    value={reminderService}
                    onChange={(e) => setReminderService(e.target.value)}
                    className="input mt-1.5 appearance-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                ) : (
                  <input value={reminderService} onChange={(e) => setReminderService(e.target.value)} className="input mt-1.5" placeholder="Fade + barbe" />
                )}
              </div>
              <div>
                <label className="label">Quand</label>
                <div className="relative mt-1.5">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                  <input
                    value={when}
                    onChange={(e) => setWhen(e.target.value)}
                    className="input pl-9"
                    placeholder="demain à 15h30"
                  />
                </div>
              </div>
            </>
          )}

          <Button onClick={generate} disabled={!canGenerate} className="w-full">
            {streaming
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération…</>
              : <><Sparkles className="h-4 w-4" /> Générer</>}
          </Button>
        </div>

        {/* Output panel */}
        <div className="card flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider text-white/40">Résultat</div>
            <div className="flex items-center gap-2">
              {output && (
                <>
                  <button
                    onClick={generate}
                    disabled={streaming}
                    className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-white/40 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
                  >
                    <RefreshCw className="h-3 w-3" /> Regénérer
                  </button>
                  <button
                    onClick={copy}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs transition',
                      copied
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'text-white/40 hover:bg-white/[0.05] hover:text-white',
                    )}
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copié !' : 'Copier'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div
            ref={outputRef}
            className="flex-1 min-h-[280px] max-h-[480px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/[0.06] bg-ink-900/60 p-5 text-sm leading-relaxed text-white/85"
          >
            {output ? (
              <>
                {output}
                {streaming && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-electric-400" />
                )}
              </>
            ) : (
              <span className="text-white/25">
                {streaming
                  ? 'Génération en cours…'
                  : 'Configure les paramètres et clique sur "Générer".'}
              </span>
            )}
          </div>

          {/* Token info */}
          {output && !streaming && (
            <div className="mt-3 text-right text-[11px] text-white/25">
              {output.length} caractères · sauvegardé dans l'historique
            </div>
          )}
        </div>
      </div>
    </>
  );
}
