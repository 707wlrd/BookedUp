import { Nav } from '@/components/marketing/Nav';
import { Footer } from '@/components/marketing/Footer';

export const metadata = { title: 'Mon compte — BookedUp' };

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[rgb(5,6,8)]">
      <Nav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
