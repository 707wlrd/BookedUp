'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export function WelcomeBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (searchParams.get('welcome') === '1') {
      setShow(true);
      // Clean up the URL
      router.replace('/studio', { scroll: false });
    }
  }, [searchParams, router]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="mb-6 flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-spark-500/25 bg-gradient-to-r from-spark-500/10 to-electric-500/10 px-5 py-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-spark-500/20">
              <Sparkles className="h-5 w-5 text-spark-400" />
            </div>
            <div>
              <div className="text-sm font-semibold">Bienvenue sur ton studio ! 🎉</div>
              <div className="text-xs text-white/50">
                Ton salon est créé. Configure tes horaires et partage ton lien de réservation.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShow(false)}
            className="flex-none rounded-lg p-1.5 text-white/30 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
