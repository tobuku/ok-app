import Link from "next/link";

export const metadata = { title: "Terms of Service — JunkMint" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-foreground">
      <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground mb-8">Last updated: September 6, 2026</p>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Agreement to Terms</h2>
          <p>
            By accessing or using JunkMint (&quot;the Platform&quot;), operated by Know Leap Strategies LLC
            (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), you agree to be bound by these Terms of Service.
            If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Description of Service</h2>
          <p>
            JunkMint is a software-as-a-service platform that provides junk removal companies
            (&quot;Subscribers&quot;) with tools for job scheduling, onsite quoting, payment processing,
            photo documentation, and business management. The Platform is an internal operations tool
            for Subscribers and is not a consumer-facing marketplace.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. Subscriber Accounts</h2>
          <p>
            Access to the Platform is by invitation only. Each Subscriber organization is responsible
            for maintaining the confidentiality of its users&apos; login credentials and for all
            activities under its account. Subscribers must promptly notify us of any unauthorized
            access.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Subscription & Billing</h2>
          <p>
            Subscribers select a plan and are billed monthly via Stripe. Plans auto-renew unless
            canceled through the billing portal. We reserve the right to change pricing with 30 days&apos;
            notice. Failure to pay may result in account suspension or termination.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Payment Processing</h2>
          <p>
            Customer payments collected through the Platform are processed via Stripe Connect.
            Funds are deposited directly into the Subscriber&apos;s connected Stripe account. We are
            not a party to transactions between Subscribers and their customers and are not liable
            for disputes, refunds, or chargebacks.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Data Ownership</h2>
          <p>
            Subscribers retain ownership of all data they input into the Platform, including customer
            records, job details, photos, quotes, and payment records (&quot;Subscriber Data&quot;). We do not
            sell, share, or use Subscriber Data for any purpose other than providing the Platform
            service.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Data Isolation</h2>
          <p>
            Each Subscriber&apos;s data is logically isolated. No Subscriber can access another
            Subscriber&apos;s data. Platform administrators may access Subscriber data only for support
            purposes, and all such access is audit-logged.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 mt-1 space-y-1">
            <li>Use the Platform for any unlawful purpose</li>
            <li>Attempt to access another Subscriber&apos;s data</li>
            <li>Reverse-engineer, decompile, or disassemble the Platform</li>
            <li>Upload malicious code, viruses, or harmful content</li>
            <li>Exceed reasonable usage limits or abuse API endpoints</li>
            <li>Resell or sublicense access to the Platform</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Photos & Storage</h2>
          <p>
            Photos uploaded through the Platform are stored securely in cloud storage, scoped to the
            Subscriber&apos;s organization. We do not access, analyze, or share uploaded photos except as
            necessary to provide the service or as required by law.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Limitation of Liability</h2>
          <p>
            The Platform is provided &quot;as is&quot; without warranty of any kind. To the maximum extent
            permitted by law, we shall not be liable for any indirect, incidental, special,
            consequential, or punitive damages, including lost profits, data loss, or business
            interruption, arising from your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">11. Termination</h2>
          <p>
            Either party may terminate the subscription at any time. Upon termination, Subscriber
            data will be retained for 30 days to allow export, after which it may be permanently
            deleted. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">12. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated via
            email or in-app notice at least 14 days before taking effect. Continued use of the
            Platform after changes constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">13. Governing Law</h2>
          <p>
            These Terms are governed by the laws of the State of Hawaii, without regard to conflict
            of law principles. Any disputes shall be resolved in the state or federal courts located
            in Honolulu, Hawaii.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">14. Contact</h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <a href="mailto:support@junkmint.com" className="text-primary underline">support@junkmint.com</a>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-border text-muted-foreground text-xs">
        <Link href="/privacy" className="underline">Privacy Policy</Link>
        {" · "}
        <Link href="/login" className="underline">Back to Login</Link>
      </div>
    </div>
  );
}
