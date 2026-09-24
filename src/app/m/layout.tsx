import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { MobileHeader } from "@/components/mobile-header";
import { OnboardingTour } from "@/components/onboarding-tour";
import { mobileTourSteps } from "@/lib/tour-definitions";
import { SwRegister } from "@/components/sw-register";

export const dynamic = "force-dynamic";

export default async function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");

  const { user } = result;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileHeader userName={user.name} />
      <main className="flex-1 p-4 pb-20">{children}</main>
      <MobileBottomNav />
      <OnboardingTour tourId="mobile" steps={mobileTourSteps} />
      <SwRegister />
    </div>
  );
}
