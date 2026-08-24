import { resolveAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdmin } from "@/lib/supabase-server";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export default async function BrandingPage() {
  const result = await resolveAuth();
  if (!result.ok) redirect("/login");
  if (!("user" in result)) redirect("/platform");
  const { user } = result;

  if (user.role !== "ORG_ADMIN") redirect("/app");

  const org = await prisma.organization.findUnique({
    where: { id: user.orgId },
    select: { name: true, logoKey: true, receiptsEmail: true, taxRateBps: true },
  });

  if (!org) redirect("/app");

  let logoUrl: string | null = null;
  if (org.logoKey) {
    const supabase = await createSupabaseAdmin();
    const { data } = await supabase.storage
      .from("photos")
      .createSignedUrl(org.logoKey, 3600);
    logoUrl = data?.signedUrl ?? null;
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Branding & Settings</h1>
      <BrandingForm
        orgName={org.name}
        initialLogoUrl={logoUrl}
        initialReceiptsEmail={org.receiptsEmail ?? ""}
        initialTaxRateBps={org.taxRateBps}
      />
    </div>
  );
}
