import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation",
  description: "CGU de BookedUp — plateforme de réservation en ligne pour barbers et coiffeurs.",
};

const LAST_UPDATE = '1er janvier 2025';
const COMPANY = 'BookedUp SAS';
const EMAIL = 'legal@bookedup.fr';
const APP_URL = 'https://bookedup.fr';

export default function CGUPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-2">
          Conditions Générales d&apos;Utilisation
        </h1>
        <p className="text-sm text-white/40 mb-12">Dernière mise à jour : {LAST_UPDATE}</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-10 [&_h2]:mb-3">

          <section>
            <h2>1. Objet</h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (« CGU ») régissent l&apos;accès et
              l&apos;utilisation de la plateforme BookedUp accessible à l&apos;adresse {APP_URL},
              éditée par {COMPANY}.
            </p>
            <p>
              BookedUp est une plateforme de réservation en ligne mettant en relation des
              professionnels de la coiffure et de la barberie (« Professionnels ») avec leurs clients
              (« Utilisateurs »).
            </p>
          </section>

          <section>
            <h2>2. Acceptation des conditions</h2>
            <p>
              En accédant à la plateforme ou en créant un compte, vous acceptez sans réserve les
              présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous ne devez pas utiliser
              la plateforme.
            </p>
          </section>

          <section>
            <h2>3. Inscription et compte</h2>
            <p>
              La création d&apos;un compte nécessite de fournir une adresse e-mail valide et un mot
              de passe. Vous êtes responsable de la confidentialité de vos identifiants et de toute
              activité réalisée depuis votre compte.
            </p>
            <p>
              Les Professionnels doivent compléter un processus d&apos;onboarding pour créer leur
              profil salon. Les informations fournies doivent être exactes et à jour.
            </p>
          </section>

          <section>
            <h2>4. Réservations et paiements</h2>
            <p>
              Les réservations sont effectuées directement sur la plateforme. Un acompte peut être
              requis par le Professionnel au moment de la réservation. Le paiement de l&apos;acompte
              est traité de manière sécurisée par Stripe.
            </p>
            <p>
              L&apos;acompte est déduit du prix total de la prestation le jour du rendez-vous, sauf
              conditions particulières définies par le Professionnel.
            </p>
          </section>

          <section>
            <h2>5. Annulation</h2>
            <p>
              Les annulations doivent être effectuées au minimum <strong>24 heures avant</strong> le
              rendez-vous via le lien d&apos;annulation reçu par e-mail. Toute annulation tardive
              peut entraîner la perte de l&apos;acompte versé, à la discrétion du Professionnel.
            </p>
          </section>

          <section>
            <h2>6. Obligations des Professionnels</h2>
            <p>Les Professionnels s&apos;engagent à :</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Fournir des informations exactes sur leurs services et tarifs</li>
              <li>Honorer les rendez-vous confirmés</li>
              <li>Respecter la réglementation applicable à leur activité</li>
              <li>Ne pas utiliser la plateforme à des fins illicites</li>
            </ul>
          </section>

          <section>
            <h2>7. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments de la plateforme (logo, design, code, textes) est la
              propriété exclusive de {COMPANY}. Toute reproduction, même partielle, est interdite
              sans autorisation préalable écrite.
            </p>
            <p>
              Les Professionnels accordent à BookedUp une licence non exclusive d&apos;utilisation
              de leurs contenus (photos, descriptions) pour les besoins du service.
            </p>
          </section>

          <section>
            <h2>8. Limitation de responsabilité</h2>
            <p>
              BookedUp est un intermédiaire technique. La prestation est réalisée exclusivement par
              le Professionnel. BookedUp ne saurait être tenu responsable de la qualité des
              prestations, des litiges entre Professionnels et Utilisateurs, ni des dommages
              indirects liés à l&apos;utilisation de la plateforme.
            </p>
          </section>

          <section>
            <h2>9. Résiliation</h2>
            <p>
              Chaque partie peut résilier son compte à tout moment. BookedUp se réserve le droit de
              suspendre ou supprimer tout compte en cas de violation des présentes CGU.
            </p>
          </section>

          <section>
            <h2>10. Droit applicable</h2>
            <p>
              Les présentes CGU sont soumises au droit français. En cas de litige, les parties
              s&apos;engagent à rechercher une solution amiable avant tout recours judiciaire. À
              défaut, le tribunal compétent sera celui du siège social de {COMPANY}.
            </p>
          </section>

          <section>
            <h2>11. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU :{' '}
              <a href={`mailto:${EMAIL}`} className="text-[#A78BFA] hover:underline">
                {EMAIL}
              </a>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
