import { ProNav } from '@/components/marketing/Nav';
import { Pricing } from '@/components/marketing/Pricing';
import { FAQ } from '@/components/marketing/FAQ';
import { Footer } from '@/components/marketing/Footer';

export const metadata = { title: 'Tarifs Pro — BookedUp' };

export default function ProPricingPage() {
  return (
    <>
      <ProNav />
      <main className="pt-12">
        <Pricing standalone />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
