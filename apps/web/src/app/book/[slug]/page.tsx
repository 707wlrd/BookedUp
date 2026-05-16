import { notFound } from 'next/navigation';
import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';
import { findBarber } from '@/lib/mock-data';
import { BookingFlow } from '@/components/booking/BookingFlow';

export default function BookingPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { service?: string };
}) {
  const barber = findBarber(params.slug);
  if (!barber) notFound();

  return (
    <>
      <Nav />
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        <BookingFlow barber={barber} initialServiceId={searchParams.service} />
      </main>
      <Footer />
    </>
  );
}
