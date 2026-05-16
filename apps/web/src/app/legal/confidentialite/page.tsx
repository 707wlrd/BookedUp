import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de Confidentialité',
  description: 'Politique de confidentialité de BookedUp — comment nous collectons et protégeons vos données.',
};

const LAST_UPDATE = '1er janvier 2025';
const COMPANY = 'BookedUp SAS';
const EMAIL = 'privacy@bookedup.fr';
const DPO_EMAIL = 'dpo@bookedup.fr';

export default function PrivacyPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-2">Politique de Confidentialité</h1>
        <p className="text-sm text-white/40 mb-12">Dernière mise à jour : {LAST_UPDATE}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3">

          <section>
            <h2>1. Responsable du traitement</h2>
            <p>
              {COMPANY} est responsable du traitement de vos données personnelles conformément au
              Règlement Général sur la Protection des Données (RGPD — UE 2016/679).
            </p>
            <p>Contact DPO : <a href={`mailto:${DPO_EMAIL}`} className="text-[#A78BFA] hover:underline">{DPO_EMAIL}</a></p>
          </section>

          <section>
            <h2>2. Données collectées</h2>
            <p>Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Compte</strong> : adresse e-mail, mot de passe (haché)</li>
              <li><strong>Réservation</strong> : nom, e-mail, téléphone, notes</li>
              <li><strong>Profil Professionnel</strong> : nom du salon, adresse, photos, bio</li>
              <li><strong>Paiement</strong> : traité directement par Stripe — nous ne stockons aucune donnée bancaire</li>
              <li><strong>Notifications</strong> : token push (optionnel, avec votre consentement)</li>
              <li><strong>Logs techniques</strong> : adresse IP, user-agent (sécurité et débogage)</li>
            </ul>
          </section>

          <section>
            <h2>3. Finalités et bases légales</h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 pr-4 text-white/50 font-medium">Finalité</th>
                  <th className="text-left py-2 text-white/50 font-medium">Base légale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  ['Exécution des réservations', 'Contrat'],
                  ['Envoi de confirmations et rappels par e-mail', 'Contrat'],
                  ['Notifications push', 'Consentement'],
                  ['Amélioration du service (analytics)', 'Intérêt légitime'],
                  ['Conformité légale et fiscale', 'Obligation légale'],
                ].map(([fin, base]) => (
                  <tr key={fin}>
                    <td className="py-2 pr-4">{fin}</td>
                    <td className="py-2 text-white/50">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>4. Destinataires des données</h2>
            <p>Vos données peuvent être partagées avec :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Supabase</strong> (hébergement base de données — UE)</li>
              <li><strong>Stripe</strong> (paiements — EU-US Data Privacy Framework)</li>
              <li><strong>Resend</strong> (envoi d&apos;e-mails transactionnels)</li>
              <li><strong>Vercel</strong> (hébergement — EU-US Data Privacy Framework)</li>
              <li>Le Professionnel concerné par votre réservation</li>
            </ul>
            <p>Aucune donnée n&apos;est vendue à des tiers.</p>
          </section>

          <section>
            <h2>5. Durée de conservation</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Données de compte : durée de l&apos;inscription + 3 ans</li>
              <li>Données de réservation : 5 ans (obligation comptable)</li>
              <li>Logs techniques : 90 jours</li>
              <li>Données de notifications : supprimées à la désinscription</li>
            </ul>
          </section>

          <section>
            <h2>6. Vos droits (RGPD)</h2>
            <p>Vous disposez des droits suivants :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Accès</strong> à vos données personnelles</li>
              <li><strong>Rectification</strong> de données inexactes</li>
              <li><strong>Effacement</strong> (« droit à l&apos;oubli »)</li>
              <li><strong>Limitation</strong> du traitement</li>
              <li><strong>Portabilité</strong> de vos données</li>
              <li><strong>Opposition</strong> au traitement basé sur l&apos;intérêt légitime</li>
              <li><strong>Retrait du consentement</strong> à tout moment (notifications push)</li>
            </ul>
            <p>
              Pour exercer vos droits :{' '}
              <a href={`mailto:${EMAIL}`} className="text-[#A78BFA] hover:underline">{EMAIL}</a>.
              Réponse sous 30 jours. En cas de litige, vous pouvez saisir la{' '}
              <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#A78BFA] hover:underline">CNIL</a>.
            </p>
          </section>

          <section>
            <h2>7. Cookies</h2>
            <p>
              BookedUp utilise uniquement des cookies strictement nécessaires au fonctionnement du
              service (session d&apos;authentification). Aucun cookie publicitaire ou de traçage
              tiers n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2>8. Sécurité</h2>
            <p>
              Vos données sont chiffrées en transit (TLS 1.3) et au repos. L&apos;accès est limité
              aux seuls collaborateurs qui en ont besoin. Des audits de sécurité réguliers sont
              effectués.
            </p>
          </section>

          <section>
            <h2>9. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique. En cas de modification substantielle, vous
              serez notifié par e-mail au moins 30 jours avant l&apos;entrée en vigueur.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
