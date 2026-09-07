import Link from "next/link";

export const metadata = { title: "Privacy Policy — JunkMint" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 text-sm text-foreground">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: September 6, 2026</p>

      <div className="space-y-6 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Introduction</h2>
          <p>
            Know Leap Strategies LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates JunkMint, a
            software-as-a-service platform for junk removal companies. This Privacy Policy explains
            how we collect, use, store, and protect information when you use our Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>

          <h3 className="font-medium mt-3 mb-1">From Subscribers (junk removal companies):</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Account information: name, email, phone, company name</li>
            <li>Billing information: processed and stored by Stripe (we do not store card numbers)</li>
            <li>Usage data: login times, feature usage, job counts</li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">From Subscriber Customers (entered by Subscribers):</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Contact information: name, phone, email, service address</li>
            <li>Job details: service dates, quotes, payment amounts, payment method</li>
            <li>Photos: before/after job photos uploaded by Subscriber staff</li>
            <li>Signatures: electronic signatures captured during quote acceptance</li>
          </ul>

          <h3 className="font-medium mt-3 mb-1">Automatically collected:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>IP address, browser type, device information</li>
            <li>Error and performance data (via Sentry)</li>
            <li>Page views and analytics (via Google Analytics)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. How We Use Information</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>To provide, maintain, and improve the Platform</li>
            <li>To process subscription payments</li>
            <li>To send transactional emails (receipts, invitations, billing notices)</li>
            <li>To monitor for errors and security issues</li>
            <li>To respond to support requests</li>
          </ul>
          <p className="mt-2">
            We do <strong>not</strong> sell, rent, or share personal information with third parties
            for marketing purposes.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Data Storage & Security</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Data is stored in PostgreSQL (hosted by Supabase, US West region)</li>
            <li>Photos and files are stored in Supabase Storage with organization-scoped access keys</li>
            <li>All data is encrypted in transit (TLS) and at rest</li>
            <li>Each Subscriber&apos;s data is logically isolated — no cross-organization access is possible</li>
            <li>Platform administrator access to Subscriber data is audit-logged</li>
            <li>Passwords are hashed using bcrypt; we never store plaintext passwords</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Third-Party Services</h2>
          <p>We use the following third-party services that may process data:</p>
          <ul className="list-disc pl-6 mt-1 space-y-1">
            <li><strong>Supabase</strong> — database hosting, authentication, file storage</li>
            <li><strong>Vercel</strong> — application hosting</li>
            <li><strong>Stripe</strong> — payment processing (Subscriber billing and customer payments)</li>
            <li><strong>Resend</strong> — transactional email delivery</li>
            <li><strong>Sentry</strong> — error monitoring (receives error stack traces, not customer PII)</li>
            <li><strong>Google Analytics</strong> — anonymous usage analytics</li>
          </ul>
          <p className="mt-2">
            Each service has its own privacy policy and data processing terms. We select services
            that maintain industry-standard security practices.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Data Retention</h2>
          <p>
            Subscriber data is retained for the duration of the subscription. Upon account
            termination, data is retained for 30 days to allow export, after which it may be
            permanently deleted. Audit logs are retained for 1 year. Billing records are retained
            as required by applicable tax and accounting laws.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Subscriber Responsibilities</h2>
          <p>
            Subscribers are data controllers for their customers&apos; personal information. Subscribers
            are responsible for obtaining any necessary consent from their customers before entering
            their data into the Platform and for complying with applicable privacy laws in their
            jurisdiction.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc pl-6 mt-1 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of analytics tracking</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{" "}
            <a href="mailto:privacy@junkmint.com" className="text-primary underline">privacy@junkmint.com</a>.
            If you are a customer of a Subscriber company, please contact that company directly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">9. Cookies</h2>
          <p>
            The Platform uses essential cookies for authentication and session management. We use
            Google Analytics which sets its own cookies for usage tracking. No advertising cookies
            are used.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">10. Children&apos;s Privacy</h2>
          <p>
            The Platform is not intended for use by individuals under 18. We do not knowingly
            collect personal information from children.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via email or in-app notice. The &quot;Last updated&quot; date at the top indicates
            the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">12. Contact</h2>
          <p>
            For privacy-related questions or requests, contact us at{" "}
            <a href="mailto:privacy@junkmint.com" className="text-primary underline">privacy@junkmint.com</a>.
          </p>
          <p className="mt-2">
            Know Leap Strategies LLC<br />
            Honolulu, Hawaii
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-border text-muted-foreground text-xs">
        <Link href="/terms" className="underline">Terms of Service</Link>
        {" · "}
        <Link href="/login" className="underline">Back to Login</Link>
      </div>
    </div>
  );
}
