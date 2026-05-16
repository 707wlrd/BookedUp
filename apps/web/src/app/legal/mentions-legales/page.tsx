import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions Légales',
};

export default function MentionsLegalesPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-12">Mentions Légales</h1>

        <div className="space-y-10 text-white/70 text-sm leading-relaxed [&_h2]:text-white [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mb-3">

          <section>
            <h2>Éditeur</h2>
            <p>BookedUp SAS</p>
            <p>Capital social : 1 000 €</p>
            <p>RCS Paris — SIRET : XXX XXX XXX XXXXX</p>
            <p>Siège social : Paris, France</p>
            <p>
              E-mail :{' '}
              <a href="mailto:contact@bookedup.fr" className="text-[#A78BFA] hover:underline">
                contact@bookedup.fr
              </a>
            </p>
          </section>

          <section>
            <h2>Directeur de la publication</h2>
            <p>Le directeur de la publication est le représentant légal de BookedUp SAS.</p>
          </section>

          <section>
            <h2>Hébergement</h2>
            <p>
              <strong>Application web</strong> : Vercel Inc., 440 N Barranca Ave #4133, Covina,
              CA 91723, États-Unis — <a href="https://vercel.com" className="text-[#A78BFA] hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
            </p>
            <p>
              <strong>Base de données</strong> : Supabase Inc. — données stockées dans la région
              eu-west-1 (Europe) — <a href="https://supabase.com" className="text-[#A78BFA] hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a>
            </p>
          </section>

          <section>
            <h2>Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble du contenu de ce site (textes, graphismes, logo, images, code source)
              est la propriété exclusive de BookedUp SAS et est protégé par les lois françaises et
              internationales relatives à la propriété intellectuelle.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication ou adaptation, totale ou
              partielle, sans autorisation écrite préalable de BookedUp SAS est interdite.
            </p>
          </section>

          <section>
            <h2>Limitation de responsabilité</h2>
            <p>
              BookedUp SAS ne saurait être tenu responsable des dommages directs ou indirects
              résultant de l&apos;utilisation du site ou de l&apos;impossibilité d&apos;y accéder.
              Les informations présentes sur le site sont données à titre indicatif et peuvent être
              modifiées sans préavis.
            </p>
          </section>

          <section>
            <h2>Droit applicable</h2>
            <p>
              Le présent site est soumis au droit français. En cas de litige, les tribunaux français
              seront seuls compétents.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
