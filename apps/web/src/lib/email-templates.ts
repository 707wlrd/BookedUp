/** ─────────────────────────────────────────────────────────────────────────
 *  BookedUp — Email Templates
 *  All templates return a plain HTML string compatible with major email clients.
 * ─────────────────────────────────────────────────────────────────────────── */

export type ApptEmailData = {
  customerName: string;
  customerEmail: string;
  shopName: string;
  city?: string | null;
  serviceName: string;
  stylistName?: string | null;
  startsAt: string;        // ISO string
  durationMinutes: number;
  priceCents: number;
  depositCents: number;
  appointmentId: string;
};

// ── Helpers ────────────────────────────────────────────────────────────────

function price(cents: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
}

function formatDatetime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function duration(min: number) {
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? min % 60 : ''}`;
}

// ── Shared layout wrapper ──────────────────────────────────────────────────

function wrap(title: string, content: string) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Logo header -->
        <tr><td style="background:#05060a;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
          <span style="display:inline-block;background:#3b82ff;color:#fff;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:6px 16px;border-radius:999px;">BookedUp</span>
        </td></tr>

        <!-- Content -->
        <tr><td style="background:#ffffff;padding:40px 32px;">
          ${content}
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f4f5f7;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
            BookedUp · Plateforme de réservation pour les professionnels de la coiffure<br/>
            <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr'}" style="color:#6b7280;text-decoration:underline;">bookedup.fr</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Info block row ─────────────────────────────────────────────────────────

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;width:140px;">${label}</td>
    <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:500;">${value}</td>
  </tr>`;
}

// ── 1. Customer confirmation (after booking, no deposit required) ───────────

export function emailCustomerConfirmation(data: ApptEmailData) {
  const { date, time } = formatDatetime(data.startsAt);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';

  return wrap(
    `Réservation confirmée chez ${data.shopName}`,
    `<h1 style="margin:0 0 8px;font-size:24px;color:#111827;font-weight:700;">
       Réservation confirmée ✓
     </h1>
     <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong>, ton rendez-vous chez
       <strong style="color:#111827;">${data.shopName}</strong>${data.city ? ` à ${data.city}` : ''} est confirmé.
     </p>

     <!-- Appointment card -->
     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Service', data.serviceName)}
         ${data.stylistName ? infoRow('Coiffeur', data.stylistName) : ''}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
         ${infoRow('Durée', duration(data.durationMinutes))}
         <tr><td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:4px 0;"/></td></tr>
         ${infoRow('Total', price(data.priceCents))}
         ${data.depositCents > 0 ? infoRow('Acompte payé', price(data.depositCents)) : ''}
       </table>
     </div>

     <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;">
       🗓️ Annulation gratuite jusqu'à <strong>24h avant</strong> ton rendez-vous.<br/>
       ❓ Une question ? Réponds directement à cet email.
     </p>
     <p style="margin:16px 0 0;text-align:center;">
       <a href="${appUrl}/cancel/${data.appointmentId}"
          style="color:#9ca3af;font-size:12px;text-decoration:underline;">
         Annuler mon rendez-vous
       </a>
     </p>
    `,
  );
}

// ── 2. Customer — deposit paid confirmation ────────────────────────────────

export function emailCustomerDepositPaid(data: ApptEmailData) {
  const { date, time } = formatDatetime(data.startsAt);

  return wrap(
    `Acompte reçu — RDV confirmé chez ${data.shopName}`,
    `<h1 style="margin:0 0 8px;font-size:24px;color:#111827;font-weight:700;">
       Acompte reçu — RDV confirmé ✓
     </h1>
     <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong> ! Ton acompte de
       <strong style="color:#3b82ff;">${price(data.depositCents)}</strong> a bien été reçu.
       Ton rendez-vous chez <strong style="color:#111827;">${data.shopName}</strong> est maintenant confirmé.
     </p>

     <!-- Appointment card -->
     <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Service', data.serviceName)}
         ${data.stylistName ? infoRow('Coiffeur', data.stylistName) : ''}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
         ${infoRow('Durée', duration(data.durationMinutes))}
         <tr><td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #bfdbfe;margin:4px 0;"/></td></tr>
         ${infoRow('Prix total', price(data.priceCents))}
         ${infoRow('Acompte payé', price(data.depositCents))}
         ${infoRow('Reste à payer', price(data.priceCents - data.depositCents))}
       </table>
     </div>

     <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
       Le solde de <strong>${price(data.priceCents - data.depositCents)}</strong> sera réglé directement au salon le jour du rendez-vous.<br/>
       🗓️ Annulation gratuite jusqu'à <strong>24h avant</strong>.
     </p>
     <p style="margin:16px 0 0;text-align:center;">
       <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr'}/cancel/${data.appointmentId}"
          style="color:#9ca3af;font-size:12px;text-decoration:underline;">
         Annuler mon rendez-vous
       </a>
     </p>
    `,
  );
}

// ── 3. Barber — new booking notification ──────────────────────────────────

export type BarberNotifData = ApptEmailData & { barberEmail: string };

export function emailBarberNewBooking(data: BarberNotifData) {
  const { date, time } = formatDatetime(data.startsAt);

  return wrap(
    `Nouveau RDV — ${data.customerName}`,
    `<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">
       Nouveau rendez-vous 🎉
     </h1>
     <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">
       Un client vient de réserver en ligne.
     </p>

     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Client', data.customerName)}
         ${infoRow('Email', data.customerEmail)}
         ${infoRow('Service', data.serviceName)}
         ${data.stylistName ? infoRow('Coiffeur', data.stylistName) : ''}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
         ${infoRow('Durée', duration(data.durationMinutes))}
         <tr><td colspan="2" style="padding:8px 0;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:4px 0;"/></td></tr>
         ${infoRow('Montant', price(data.priceCents))}
         ${data.depositCents > 0 ? infoRow('Acompte', price(data.depositCents) + ' (payé en ligne)') : infoRow('Acompte', 'Aucun')}
       </table>
     </div>

     <p style="margin:0;color:#6b7280;font-size:13px;">
       Connecte-toi à ton Studio pour voir les détails et gérer ce rendez-vous.<br/>
       <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr'}/studio/appointments" style="color:#3b82ff;">
         Voir dans le Studio →
       </a>
     </p>
    `,
  );
}

// ── 4. Customer — 24h reminder ────────────────────────────────────────────

export function emailCustomerReminder(data: ApptEmailData) {
  const { date, time } = formatDatetime(data.startsAt);

  return wrap(
    `Rappel RDV demain — ${data.shopName}`,
    `<h1 style="margin:0 0 8px;font-size:24px;color:#111827;font-weight:700;">
       Rappel : RDV demain ⏰
     </h1>
     <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong> !<br/>
       On te rappelle ton rendez-vous de demain chez <strong style="color:#111827;">${data.shopName}</strong>.
     </p>

     <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Service', data.serviceName)}
         ${data.stylistName ? infoRow('Coiffeur', data.stylistName) : ''}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
         ${infoRow('Durée', duration(data.durationMinutes))}
       </table>
     </div>

     <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
       📍 ${data.city ? `À ${data.city}` : 'Adresse communiquée par le salon'}<br/>
       ❌ Pour annuler, réponds à cet email <strong>avant 24h</strong>.
     </p>
    `,
  );
}

// ── 5. Review request (J+1 after completed appointment) ───────────────────

export type ReviewEmailData = {
  customerName: string;
  customerEmail: string;
  shopName: string;
  serviceName: string;
  startsAt: string;
  appointmentId: string;
};

export function emailReviewRequest(data: ReviewEmailData) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr';
  const reviewUrl = `${appUrl}/review/${data.appointmentId}`;
  const { date } = formatDatetime(data.startsAt);

  return wrap(
    `Comment s'est passé ton RDV chez ${data.shopName} ?`,
    `<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">
       Comment s'est passé ton RDV ? ⭐
     </h1>
     <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong> !<br/>
       On espère que ta visite chez <strong style="color:#111827;">${data.shopName}</strong> s'est bien passée.
       Ton avis aide le salon à s'améliorer et d'autres clients à choisir.
     </p>

     <!-- Context card -->
     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:28px;">
       <p style="margin:0;color:#374151;font-size:14px;">
         <strong>${data.serviceName}</strong> · ${date}
       </p>
     </div>

     <!-- Stars CTA -->
     <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
       <tr>
         <td align="center">
           <p style="margin:0 0 16px;color:#6b7280;font-size:13px;">Clique sur ta note :</p>
           <table cellpadding="0" cellspacing="0">
             <tr>
               ${[1,2,3,4,5].map(n => `
               <td style="padding:0 4px;">
                 <a href="${reviewUrl}?rating=${n}" style="display:inline-block;text-decoration:none;font-size:32px;line-height:1;">
                   ☆
                 </a>
               </td>`).join('')}
             </tr>
           </table>
           <br/>
           <a href="${reviewUrl}"
              style="display:inline-block;background:#3b82ff;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:999px;text-decoration:none;margin-top:8px;">
             Laisser mon avis →
           </a>
           <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">Ça prend moins de 30 secondes.</p>
         </td>
       </tr>
     </table>

     <p style="margin:0;color:#d1d5db;font-size:12px;text-align:center;">
       Tu n'as pas visité ${data.shopName} ? <a href="${reviewUrl}?skip=1" style="color:#9ca3af;">Ignorer</a>
     </p>
    `,
  );
}

// ── 6. Waitlist — slot opened notification ────────────────────────────────

export type WaitlistEmailData = {
  customerName:  string;
  customerEmail: string;
  shopName:      string;
  date:          string;   // formatted date string
  bookingUrl:    string;   // direct link to booking page
};

export function emailWaitlistSlotOpen(data: WaitlistEmailData) {
  return wrap(
    `Un créneau s'est libéré chez ${data.shopName} !`,
    `<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">
       Un créneau s'est libéré ! 🎉
     </h1>
     <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong> !<br/>
       Tu étais sur la liste d'attente chez <strong style="color:#111827;">${data.shopName}</strong>.
       Un créneau vient de se libérer le <strong style="color:#111827;">${data.date}</strong>.
     </p>

     <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
       <tr><td align="center">
         <a href="${data.bookingUrl}"
            style="display:inline-block;background:#3b82ff;color:#fff;font-size:14px;font-weight:600;padding:14px 32px;border-radius:999px;text-decoration:none;">
           Réserver maintenant →
         </a>
         <p style="margin:12px 0 0;color:#9ca3af;font-size:12px;">
           Dépêche-toi, ce créneau peut partir vite !
         </p>
       </td></tr>
     </table>

     <p style="margin:0;color:#d1d5db;font-size:12px;text-align:center;">
       Tu ne veux plus être notifié(e) ? Ignore simplement cet email.
     </p>
    `,
  );
}

// ── 7. Customer — cancellation confirmation ───────────────────────────────

export type CancelEmailData = {
  customerName: string;
  customerEmail: string;
  shopName: string;
  serviceName: string;
  startsAt: string;
  depositCents: number;   // 0 if no deposit
};

export function emailCustomerCancellation(data: CancelEmailData) {
  const { date, time } = formatDatetime(data.startsAt);

  return wrap(
    `Annulation confirmée — ${data.shopName}`,
    `<h1 style="margin:0 0 8px;font-size:24px;color:#111827;font-weight:700;">
       Annulation confirmée
     </h1>
     <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6;">
       Bonjour <strong style="color:#111827;">${data.customerName}</strong>,<br/>
       ton rendez-vous chez <strong style="color:#111827;">${data.shopName}</strong> a bien été annulé.
     </p>

     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Service', data.serviceName)}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
       </table>
     </div>

     ${data.depositCents > 0 ? `
     <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
       <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
         ⚠️ Un acompte de <strong>${price(data.depositCents)}</strong> avait été versé.
         Pour toute question sur le remboursement, contacte directement le salon.
       </p>
     </div>` : ''}

     <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
       Tu veux reprendre rendez-vous ?
       <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr'}" style="color:#3b82ff;">
         Réserver à nouveau →
       </a>
     </p>
    `,
  );
}

// ── 8. Barber — cancellation notification ─────────────────────────────────

export function emailBarberCancellation(data: CancelEmailData & { barberEmail: string }) {
  const { date, time } = formatDatetime(data.startsAt);

  return wrap(
    `RDV annulé — ${data.customerName}`,
    `<h1 style="margin:0 0 8px;font-size:22px;color:#111827;font-weight:700;">
       Rendez-vous annulé ❌
     </h1>
     <p style="margin:0 0 28px;color:#6b7280;font-size:15px;">
       Un client vient d'annuler son rendez-vous.
     </p>

     <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:24px;margin-bottom:24px;">
       <table width="100%" cellpadding="0" cellspacing="0">
         ${infoRow('Client', data.customerName)}
         ${infoRow('Service', data.serviceName)}
         ${infoRow('Date', date)}
         ${infoRow('Heure', time)}
       </table>
     </div>

     <p style="margin:0;color:#6b7280;font-size:13px;">
       Le créneau est maintenant libéré dans ton agenda.<br/>
       <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://bookedup.fr'}/studio/appointments"
          style="color:#3b82ff;">
         Voir mon agenda →
       </a>
     </p>
    `,
  );
}
