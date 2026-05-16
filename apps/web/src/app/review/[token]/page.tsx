'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type State = 'loading' | 'ready' | 'already_reviewed' | 'invalid' | 'submitted';

type ApptInfo = {
  shopName: string;
  serviceName: string;
  date: string;
  existingRating?: number;
};

export default function ReviewPage({ params }: { params: { token: string } }) {
  const searchParams = useSearchParams();
  const preRating = parseInt(searchParams.get('rating') ?? '0', 10);
  const skip = searchParams.get('skip') === '1';

  const [state, setState] = useState<State>('loading');
  const [appt, setAppt] = useState<ApptInfo | null>(null);
  const [rating, setRating] = useState(preRating || 0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/reviews/${params.token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error === 'not_found' || data.error === 'invalid') {
          setState('invalid');
          return;
        }
        if (data.already_reviewed) {
          setAppt(data);
          setState('already_reviewed');
          return;
        }
        setAppt(data);
        setState('ready');
        // Pre-select rating from URL param
        if (preRating >= 1 && preRating <= 5) setRating(preRating);
      })
      .catch(() => setState('invalid'));
  }, [params.token]);

  async function handleSubmit() {
    if (rating === 0) { setError('Choisis une note.'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/reviews/${params.token}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erreur'); setSubmitting(false); return; }
      setState('submitted');
    } catch {
      setError('Erreur réseau, réessaie.');
      setSubmitting(false);
    }
  }

  const stars = rating > 0 ? rating : hovered;

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
                Ce lien d'avis est invalide ou a expiré.
              </p>
            </motion.div>
          )}

          {/* ── Already reviewed ── */}
          {state === 'already_reviewed' && (
            <motion.div key="done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="card p-8 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <h2 className="text-lg font-bold">Déjà noté !</h2>
              <p className="mt-2 text-sm text-white/50">
                Tu as déjà laissé un avis pour ce rendez-vous. Merci !
              </p>
              {appt?.existingRating && (
                <div className="mt-4 flex justify-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn('h-5 w-5', i < (appt.existingRating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-white/20')} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Review form ── */}
          {state === 'ready' && (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4">
              {/* Context card */}
              {appt && (
                <div className="card px-5 py-4">
                  <div className="text-xs uppercase tracking-wider text-white/40">Tu as visité</div>
                  <div className="mt-1 text-lg font-bold">{appt.shopName}</div>
                  <div className="mt-0.5 text-sm text-white/50">
                    {appt.serviceName} · {appt.date}
                  </div>
                </div>
              )}

              {/* Rating card */}
              <div className="card p-6">
                <h2 className="mb-1 text-lg font-bold">Comment c'était ?</h2>
                <p className="mb-6 text-sm text-white/50">
                  Ton avis aide le salon à s'améliorer et d'autres clients à choisir.
                </p>

                {/* Stars */}
                <div
                  className="flex justify-center gap-2"
                  onMouseLeave={() => setHovered(0)}
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const n = i + 1;
                    const filled = n <= stars;
                    return (
                      <motion.button
                        key={n}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onMouseEnter={() => setHovered(n)}
                        onClick={() => { setRating(n); setError(''); }}
                        className="focus:outline-none"
                        aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={cn(
                            'h-10 w-10 transition-colors duration-100',
                            filled
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-white/20 hover:text-yellow-400/50',
                          )}
                        />
                      </motion.button>
                    );
                  })}
                </div>

                {/* Rating label */}
                <AnimatePresence mode="wait">
                  {stars > 0 && (
                    <motion.div
                      key={stars}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-center text-sm font-medium"
                    >
                      {['', 'Mauvais 😕', 'Bof 😐', 'Bien 🙂', 'Très bien 😊', 'Excellent ! 🔥'][stars]}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Comment */}
                <div className="mt-6">
                  <label className="label">Commentaire (optionnel)</label>
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    className="input mt-1.5 min-h-[100px] resize-none"
                    placeholder="Ambiance, accueil, résultat… Dis-nous tout !"
                    maxLength={500}
                  />
                  <div className="mt-1 text-right text-xs text-white/30">{comment.length}/500</div>
                </div>

                {error && (
                  <p className="mt-3 text-sm text-red-400">{error}</p>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || rating === 0}
                  className={cn(
                    'mt-5 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition-all',
                    rating > 0
                      ? 'bg-electric-500 text-white hover:bg-electric-400'
                      : 'cursor-not-allowed bg-white/[0.06] text-white/30',
                  )}
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</>
                    : 'Publier mon avis'}
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Success ── */}
          {state === 'submitted' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              className="card p-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 260, damping: 16 }}
                className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-400"
              >
                <CheckCircle2 className="h-8 w-8" />
              </motion.div>
              <h2 className="text-2xl font-bold tracking-tight">Merci pour ton avis !</h2>
              <p className="mt-2 text-sm text-white/50">
                Ton retour a bien été publié.{' '}
                {rating >= 4 ? `On est super contents que ça t'ait plu ✨` : `On prend note pour s'améliorer 🙏`}
              </p>
              {/* Stars recap */}
              <div className="mt-5 flex justify-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('h-6 w-6', i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-white/15')} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
