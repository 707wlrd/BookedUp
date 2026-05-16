'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ToggleLeft, ToggleRight, Loader2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function DepositSection() {
  const supabase = createClient();

  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState('10');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [loading, setLoading] = useState(true);
  const amountRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Load current values from Supabase ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('barbers')
        .select('deposit_required, deposit_amount_cents')
        .eq('owner_id', user.id)
        .single();

      if (data) {
        setEnabled(data.deposit_required ?? false);
        setAmount(data.deposit_amount_cents ? String(Math.round(data.deposit_amount_cents / 100)) : '10');
      }
      setLoading(false);
    }
    load();
  }, []);

  /* Focus amount input when toggled on */
  useEffect(() => {
    if (enabled && amountRef.current) {
      setTimeout(() => amountRef.current?.focus(), 300);
    }
  }, [enabled]);

  async function handleSave() {
    setSaveState('saving');
    if (timerRef.current) clearTimeout(timerRef.current);

    const amountCents = Math.round(parseFloat(amount || '0') * 100);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaveState('error'); return; }

    const { error } = await supabase
      .from('barbers')
      .update({
        deposit_required: enabled,
        deposit_amount_cents: enabled ? amountCents : 0,
      })
      .eq('owner_id', user.id);

    if (error) {
      setSaveState('error');
    } else {
      setSaveState('saved');
      timerRef.current = setTimeout(() => setSaveState('idle'), 3000);
    }
  }

  const amountNum = parseFloat(amount || '0');
  const isValidAmount = amountNum > 0 && amountNum <= 9999;

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-white/40">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* ── Toggle row ── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-white/90">Exiger un acompte à la réservation</div>
          <div className="mt-0.5 text-xs text-white/40">
            Le client paie l'acompte via Stripe avant que le RDV soit confirmé.
          </div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={cn(
            'flex-none transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electric-500/50 rounded-full',
            enabled ? 'text-electric-400' : 'text-white/20 hover:text-white/40',
          )}
          aria-pressed={enabled}
        >
          {enabled
            ? <ToggleRight className="h-9 w-9" strokeWidth={1.5} />
            : <ToggleLeft  className="h-9 w-9" strokeWidth={1.5} />}
        </button>
      </div>

      {/* ── Amount field (animated) ── */}
      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <label className="label">Montant de l'acompte</label>
              <div className="mt-2 flex items-center gap-3">
                <div className="relative flex-1 max-w-[160px]">
                  <input
                    ref={amountRef}
                    type="number"
                    min="1"
                    max="9999"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={cn(
                      'input pr-8 tabular-nums',
                      !isValidAmount && amount !== '' && 'border-red-500/50 focus:border-red-500/60 focus:ring-red-500/20',
                    )}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-white/40">€</span>
                </div>
                {amount && !isValidAmount && (
                  <span className="text-xs text-red-400">Entre 1 € et 9 999 €</span>
                )}
              </div>

              {/* Preview bubble */}
              {isValidAmount && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 flex items-start gap-2 rounded-xl border border-electric-500/20 bg-electric-500/[0.06] px-3 py-2.5 text-xs text-white/70"
                >
                  <Info className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300" />
                  <span>
                    Le client paiera <span className="font-semibold text-white">{amountNum} €</span> à la réservation.
                    Le reste sera réglé en salon.
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trust note (always visible) ── */}
      <div className="flex items-start gap-2 text-xs text-white/40">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-none text-electric-300/60" />
        Paiement géré par Stripe. Les acomptes sont reversés automatiquement sur ton compte.
      </div>

      {/* ── Save button + feedback ── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saveState === 'saving' || (enabled && !isValidAmount)}
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-150',
            'bg-electric-500 text-white hover:bg-electric-400 hover:shadow-[0_8px_32px_-8px_rgba(59,130,255,0.5)] hover:-translate-y-[1px]',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          {saveState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
          {saveState === 'saving' ? 'Enregistrement…' : 'Enregistrer'}
        </button>

        <AnimatePresence mode="wait">
          {saveState === 'saved' && (
            <motion.span
              key="saved"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs font-medium text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Enregistré !
            </motion.span>
          )}
          {saveState === 'error' && (
            <motion.span
              key="error"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs font-medium text-red-400"
            >
              <AlertCircle className="h-3.5 w-3.5" /> Erreur — réessaie
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
