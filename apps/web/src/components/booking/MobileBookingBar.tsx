'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarDays } from 'lucide-react';
import { BookingFlow } from './BookingFlow';
import { formatPrice } from '@/lib/utils';
import type { Barber, Service } from '@bookedup/shared';

type Stylist = { id: string; name: string; bio?: string | null; avatar_url?: string | null; specialties?: string[] };
type B = Barber & { services: Service[]; stylists?: Stylist[]; portfolio?: string[] };

export function MobileBookingBar({
  barber,
  initialServiceId,
  minPrice,
}: {
  barber: B;
  initialServiceId?: string;
  minPrice: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Sticky bottom bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.08] bg-[rgba(5,6,8,0.92)] p-4 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-4">
          <div>
            <div className="text-xs text-white/40">À partir de</div>
            <div className="text-xl font-bold">{formatPrice(minPrice)}</div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-electric-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-electric-400 hover:shadow-[0_8px_32px_-8px_rgba(59,130,255,0.5)]"
          >
            <CalendarDays className="h-4 w-4" />
            Réserver maintenant
          </button>
        </div>
      </div>

      {/* ── Bottom sheet ── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-[28px] bg-[rgb(5,6,8)] pb-8 shadow-[0_-8px_40px_rgba(0,0,0,0.6)] lg:hidden"
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              {/* Close button */}
              <div className="flex items-center justify-between px-6 pb-2 pt-1">
                <span className="text-sm font-semibold text-white/70">Réservation</span>
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] transition hover:bg-white/[0.10]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* BookingFlow */}
              <div className="px-4">
                <BookingFlow barber={barber} initialServiceId={initialServiceId} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
