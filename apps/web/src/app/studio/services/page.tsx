'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus, Trash2, GripVertical, Loader2, CheckCircle2,
  AlertCircle, Clock, Euro, ToggleLeft, ToggleRight, Pencil, X, Check,
} from 'lucide-react';
import { PageHeader } from '@/components/studio/StatCard';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDuration, cn } from '@/lib/utils';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  _dirty?: boolean;
  _new?: boolean;
  _deleting?: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ServicesPage() {
  const supabase = createClient();
  const [barberId, setBarberId] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: barber } = await supabase
        .from('barbers').select('id').eq('owner_id', user.id).single();
      if (!barber) return;
      setBarberId(barber.id);
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', barber.id)
        .order('sort_order');
      setServices(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  /* ── Helpers ── */
  function patch(id: string, changes: Partial<Service>) {
    setServices(s => s.map(x => x.id === id ? { ...x, ...changes, _dirty: true } : x));
  }

  function addService() {
    const newService: Service = {
      id: crypto.randomUUID(),
      name: '',
      description: null,
      duration_minutes: 30,
      price_cents: 2500,
      is_active: true,
      sort_order: services.length,
      _dirty: true,
      _new: true,
    };
    setServices(s => [...s, newService]);
    setEditingId(newService.id);
  }

  async function deleteService(id: string) {
    const svc = services.find(s => s.id === id);
    if (!svc) return;

    // Optimistic
    setServices(s => s.filter(x => x.id !== id));

    if (!svc._new) {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) {
        // Rollback
        setServices(s => [...s, svc].sort((a, b) => a.sort_order - b.sort_order));
        setSaveStatus('error');
      }
    }
  }

  async function saveAll() {
    if (!barberId) return;
    setSaveStatus('saving');

    const toSave = services.filter(s => s._dirty);

    for (const svc of toSave) {
      const payload = {
        barber_id: barberId,
        name: svc.name || 'Sans nom',
        description: svc.description,
        duration_minutes: svc.duration_minutes,
        price_cents: svc.price_cents,
        is_active: svc.is_active,
        sort_order: services.indexOf(svc),
      };

      if (svc._new) {
        const { data, error } = await supabase
          .from('services').insert({ ...payload, id: undefined }).select().single();
        if (!error && data) {
          setServices(s => s.map(x => x.id === svc.id ? { ...data, _dirty: false, _new: false } : x));
        } else {
          setSaveStatus('error'); return;
        }
      } else {
        const { error } = await supabase
          .from('services').update(payload).eq('id', svc.id);
        if (error) { setSaveStatus('error'); return; }
      }
    }

    setServices(s => s.map(x => ({ ...x, _dirty: false, _new: false })));
    setSaveStatus('saved');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setSaveStatus('idle'), 3000);
  }

  async function handleReorder(newOrder: Service[]) {
    setServices(newOrder.map((s, i) => ({ ...s, sort_order: i, _dirty: true })));
  }

  const dirty = services.some(s => s._dirty);
  const avgPrice = services.length
    ? services.reduce((a, s) => a + s.price_cents, 0) / services.length
    : 0;
  const avgDuration = services.length
    ? services.reduce((a, s) => a + s.duration_minutes, 0) / services.length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/40 py-20 justify-center">
        <Loader2 className="h-5 w-5 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="Ajoute, modifie et réorganise tes prestations."
        actions={
          <Button onClick={addService}>
            <Plus className="h-4 w-4" /> Nouveau service
          </Button>
        }
      />

      {/* Stats bar */}
      {services.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="chip">
            <span className="text-white/40">{services.length} prestation{services.length > 1 ? 's' : ''}</span>
          </div>
          <div className="chip">
            <Euro className="h-3 w-3 text-white/30" />
            <span className="text-white/40">Ticket moyen</span>
            <span className="font-semibold text-white/70">{formatPrice(avgPrice)}</span>
          </div>
          <div className="chip">
            <Clock className="h-3 w-3 text-white/30" />
            <span className="text-white/40">Durée moyenne</span>
            <span className="font-semibold text-white/70">{formatDuration(Math.round(avgDuration))}</span>
          </div>
        </div>
      )}

      {/* Services list */}
      {services.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-electric-500/10">
            <Plus className="h-6 w-6 text-electric-300" />
          </div>
          <div className="text-base font-semibold">Aucune prestation</div>
          <p className="mt-1 max-w-xs text-sm text-white/40">
            Ajoute tes premières prestations pour qu'elles apparaissent sur ton profil public.
          </p>
          <Button onClick={addService} className="mt-6">
            <Plus className="h-4 w-4" /> Ajouter une prestation
          </Button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={services}
          onReorder={handleReorder}
          className="card divide-y divide-white/[0.05] overflow-hidden"
        >
          <AnimatePresence initial={false}>
            {services.map((svc) => (
              <Reorder.Item
                key={svc.id}
                value={svc}
                className="group relative bg-transparent"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3.5 transition-colors',
                    svc._dirty && 'bg-white/[0.015]',
                    !svc.is_active && 'opacity-50',
                  )}
                >
                  {/* Drag handle */}
                  <div className="cursor-grab active:cursor-grabbing touch-none text-white/20 hover:text-white/50 transition flex-none">
                    <GripVertical className="h-4 w-4" />
                  </div>

                  {/* Name */}
                  {editingId === svc.id ? (
                    <input
                      autoFocus
                      value={svc.name}
                      onChange={(e) => patch(svc.id, { name: e.target.value })}
                      onBlur={() => setEditingId(null)}
                      onKeyDown={(e) => e.key === 'Enter' && setEditingId(null)}
                      className="flex-1 bg-transparent text-sm font-semibold outline-none border-b border-electric-500/50 pb-0.5 text-white"
                      placeholder="Nom de la prestation"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingId(svc.id)}
                      className="flex-1 text-left text-sm font-semibold text-white hover:text-electric-200 transition flex items-center gap-2 group/name"
                    >
                      {svc.name || <span className="text-white/30 italic">Sans nom</span>}
                      <Pencil className="h-3 w-3 opacity-0 group-hover/name:opacity-40 transition" />
                    </button>
                  )}

                  {/* Duration */}
                  <div className="flex items-center gap-1 flex-none">
                    <Clock className="h-3 w-3 text-white/25" />
                    <input
                      type="number"
                      value={svc.duration_minutes}
                      onChange={(e) => patch(svc.id, { duration_minutes: Math.max(5, Number(e.target.value)) })}
                      className="w-14 rounded-lg border border-white/10 bg-ink-800/60 px-2 py-1 text-right text-xs text-white outline-none focus:border-electric-500/50"
                      min={5}
                      step={5}
                    />
                    <span className="text-xs text-white/30">min</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-center gap-1 flex-none">
                    <input
                      type="number"
                      value={svc.price_cents / 100}
                      onChange={(e) => patch(svc.id, { price_cents: Math.round(Math.max(0, Number(e.target.value)) * 100) })}
                      className="w-20 rounded-lg border border-white/10 bg-ink-800/60 px-2 py-1 text-right text-xs text-white outline-none focus:border-electric-500/50"
                      min={0}
                      step={0.5}
                    />
                    <span className="text-xs text-white/30">€</span>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => patch(svc.id, { is_active: !svc.is_active })}
                    className={cn(
                      'flex-none transition-colors',
                      svc.is_active ? 'text-electric-400' : 'text-white/20 hover:text-white/40',
                    )}
                    title={svc.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {svc.is_active
                      ? <ToggleRight className="h-7 w-7" strokeWidth={1.5} />
                      : <ToggleLeft  className="h-7 w-7" strokeWidth={1.5} />}
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => deleteService(svc.id)}
                    className="flex-none rounded-lg p-1.5 text-white/20 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                  {/* Dirty indicator */}
                  {svc._dirty && (
                    <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-spark-400" />
                  )}
                </motion.div>
              </Reorder.Item>
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      {/* Save bar */}
      <div className="mt-6 flex items-center justify-between">
        <AnimatePresence mode="wait">
          {saveStatus === 'saved' && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm text-emerald-400"
            >
              <CheckCircle2 className="h-4 w-4" /> Enregistré !
            </motion.span>
          )}
          {saveStatus === 'error' && (
            <motion.span
              key="error"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4" /> Erreur — réessaie
            </motion.span>
          )}
          {dirty && saveStatus === 'idle' && (
            <motion.span
              key="unsaved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-white/30"
            >
              Modifications non enregistrées
            </motion.span>
          )}
          {!dirty && saveStatus === 'idle' && <span />}
        </AnimatePresence>

        <div className="flex gap-2">
          {dirty && (
            <Button
              variant="ghost"
              onClick={async () => {
                setLoading(true);
                const { data } = await supabase
                  .from('services').select('*').eq('barber_id', barberId!).order('sort_order');
                setServices(data ?? []);
                setLoading(false);
              }}
            >
              <X className="h-4 w-4" /> Annuler
            </Button>
          )}
          <Button
            onClick={saveAll}
            disabled={!dirty || saveStatus === 'saving'}
          >
            {saveStatus === 'saving'
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Enregistrement…</>
              : <><Check className="h-4 w-4" /> Enregistrer</>}
          </Button>
        </div>
      </div>
    </>
  );
}
