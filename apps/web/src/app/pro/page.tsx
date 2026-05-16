import { ProNav } from '@/components/marketing/Nav';
import { Hero } from '@/components/marketing/Hero';
import { Features } from '@/components/marketing/Features';
import { Testimonials } from '@/components/marketing/Testimonials';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { CTA } from '@/components/marketing/CTA';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'BookedUp Pro — Le système de réservation pour barbers.',
  description:
    "Réduis tes no-shows, remplis ton agenda et automatise ta com'. Tout ce dont tu as besoin pour rester booked.",
};

export default function ProLandingPage() {
  return (
    <>
      <ProNav />
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
