'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Trash2, Check, X, User, Pencil, ToggleLeft, ToggleRight, Info,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type Stylist = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  specialties: string[];
  is_active: boolean;
  sort_order: number;
};

type FormState = { name: string; bio: string; specialties: string; avatar_url: string };
const emptyForm: FormState = { name: '', bio: '', specialties: '', avatar_url: '' };

export default function StylistsPage() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: barber } = await supabase
      .from('barbers').select('id').eq('owner_id', user.id).single();
    if (!barber) return;

    setBarberId(barber.id);

    const { data } = await supabase
      .from('stylists')
      .select('*')
      .eq('barber_id', barber.id)
      .order('sort_order');

    setStylists((data ?? []) as Stylist[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function parseSpecialties(raw: string) {
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  }

  async function handleAdd() {
    if (!form.name.trim() || !barberId) return;
    setSaving(true);
    const { data } = await supabase
      .from('stylists')
      .insert({
        barber_id: barberId,
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        specialties: parseSpecialties(form.specialties),
        sort_order: stylists.length,
      })
      .select()
      .single();

    if (data) {
      setStylists(prev => [...prev, data as Stylist]);
      setForm(emptyForm);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    await supabase.from('stylists').update({
      name: editForm.name.trim(),
      bio: editForm.bio.trim() || null,
      avatar_url: editForm.avatar_url.trim() || null,
      specialties: parseSpecialties(editForm.specialties),
    }).eq('id', id);

    setStylists(prev => prev.map(s =>
      s.id === id ? {
        ...s,
        name: editForm.name.trim(),
        bio: editForm.bio.trim() || null,
        avatar_url: editForm.avatar_url.trim() || null,
        specialties: parseSpecialties(editForm.specialties),
      } : s,
    ));
    setEditingId(null);
    setSaving(false);
  }

  function startEdit(s: Stylist) {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      bio: s.bio ?? '',
      avatar_url: s.avatar_url ?? '',
      specialties: (s.specialties ?? []).join(', '),
    });
  }

  async function toggleActive(s: Stylist) {
    await supabase.from('stylists').update({ is_active: !s.is_active }).eq('id', s.id);
    setStylists(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
  }

  async function deleteStylist(id: string) {
    await supabase.from('stylists').delete().eq('id', id);
    setStylists(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-electric-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 sm:p-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coiffeurs</h1>
          <p className="mt-1 text-sm text-white/50">
            Ajoute les membres de ton équipe. Chaque coiffeur a ses propres disponibilités lors de la réservation.
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setForm(emptyForm); }} size="md">
          <Plus className="h-4 w-4" /> Ajouter
        </Button>
      </div>

      {/* Info banner (only when no stylists yet) */}
      {stylists.length === 0 && !showForm && (
        <div className="flex items-start gap-3 rounded-2xl border border-electric-500/20 bg-electric-500/[0.06] p-5 text-sm text-electric-200/70">
          <Info className="mt-0.5 h-4 w-4 flex-none text-electric-300" />
          <div>
            <strong className="font-semibold text-electric-200">Salon avec plusieurs coiffeurs ?</strong>
            <br />
            Ajoute tes coiffeurs ici et les clients pourront choisir avec qui ils souhaitent prendre rendez-vous.
            Les créneaux disponibles s'adapteront automatiquement au planning de chaque coiffeur.
          </div>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-electric-500/30 bg-electric-500/[0.05] p-6"
          >
            <h3 className="mb-4 font-semibold">Nouveau coiffeur</h3>
            <StylistForm form={form} setForm={setForm} />
            <div className="mt-4 flex gap-2">
              <Button onClick={handleAdd} disabled={saving || !form.name.trim()} size="md">
                {saving ? 'Enregistrement…' : <><Check className="h-4 w-4" /> Ajouter</>}
              </Button>
              <Button variant="subtle" size="md" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" /> Annuler
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stylists list */}
      <div className="space-y-3">
        <AnimatePresence>
          {stylists.map((s) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20, height: 0 }}
              className={cn(
                'rounded-2xl border bg-white/[0.02] transition',
                s.is_active ? 'border-white/[0.08]' : 'border-white/[0.04] opacity-60',
              )}
            >
              {editingId === s.id ? (
                /* ── Edit mode ── */
                <div className="p-5">
                  <div className="mb-3 text-sm font-medium text-white/70">Modifier {s.name}</div>
                  <StylistForm form={editForm} setForm={setEditForm} />
                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => handleSaveEdit(s.id)} disabled={saving || !editForm.name.trim()} size="md">
                      {saving ? 'Sauvegarde…' : <><Check className="h-4 w-4" /> Sauvegarder</>}
                    </Button>
                    <Button variant="subtle" size="md" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" /> Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                /* ── View mode ── */
                <div className="flex items-center gap-4 p-5">
                  {/* Avatar */}
                  <div
                    className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-xl bg-white/[0.06] text-base font-bold text-white/60"
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.name}</span>
                      {!s.is_active && (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/40">
                          Inactif
                        </span>
                      )}
                    </div>
                    {s.bio && <div className="mt-0.5 truncate text-xs text-white/45">{s.bio}</div>}
                    {s.specialties && s.specialties.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {s.specialties.map((sp) => (
                          <span key={sp} className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/50">
                            {sp}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-none items-center gap-1">
                    <button
                      onClick={() => toggleActive(s)}
                      title={s.is_active ? 'Désactiver' : 'Activer'}
                      className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {s.is_active
                        ? <ToggleRight className="h-4 w-4 text-electric-400" />
                        : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(s)}
                      className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteStylist(s.id)}
                      className="rounded-lg p-2 text-white/40 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Stats */}
      {stylists.length > 0 && (
        <p className="text-xs text-white/30">
          {stylists.filter(s => s.is_active).length} coiffeur{stylists.filter(s => s.is_active).length > 1 ? 's' : ''} actif{stylists.filter(s => s.is_active).length > 1 ? 's' : ''} ·{' '}
          {stylists.length} au total
        </p>
      )}
    </div>
  );
}

// ── Reusable form fields ───────────────────────────────────────────────────

function StylistForm({
  form,
  setForm,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
}) {
  function set(k: keyof FormState, v: string) {
    setForm({ ...form, [k]: v });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label">Nom *</label>
        <input
          className="input mt-1.5"
          placeholder="Malik, Karim, Yasmine…"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Bio / spécialité courte</label>
        <input
          className="input mt-1.5"
          placeholder="Expert en fades et dégradés"
          value={form.bio}
          onChange={e => set('bio', e.target.value)}
        />
      </div>
      <div>
        <label className="label">Spécialités (séparées par virgule)</label>
        <input
          className="input mt-1.5"
          placeholder="Fade, Barbe, Design"
          value={form.specialties}
          onChange={e => set('specialties', e.target.value)}
        />
      </div>
      <div>
        <label className="label">URL photo (optionnel)</label>
        <input
          className="input mt-1.5"
          placeholder="https://…"
          value={form.avatar_url}
          onChange={e => set('avatar_url', e.target.value)}
        />
      </div>
    </div>
  );
}
