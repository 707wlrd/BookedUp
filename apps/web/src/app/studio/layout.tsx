import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StudioSidebar } from '@/components/studio/Sidebar';

export const metadata = { title: 'Studio — BookedUp' };

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=/studio');

  // Fetch barber profile
  const { data: barber } = await supabase
    .from('barbers')
    .select('shop_name, slug, subscription_tier, deposit_required, deposit_amount_cents, onboarding_completed')
    .eq('owner_id', user.id)
    .single();

  // No barber profile yet, or onboarding not finished → redirect
  if (!barber || barber.onboarding_completed === false) redirect('/onboarding');

  const displayName = user.user_metadata?.full_name ?? user.email ?? 'Mon compte';

  return (
    <div className="flex min-h-screen">
      <StudioSidebar
        userEmail={user.email ?? ''}
        userName={displayName}
        shopName={barber.shop_name}
        plan={barber.subscription_tier}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
