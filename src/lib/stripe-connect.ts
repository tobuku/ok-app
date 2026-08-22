/**
 * Stripe Connect — tenant payments.
 * Each org connects its own Stripe Standard account.
 * Payments go directly to the tenant; platform takes an optional application fee.
 *
 * SEPARATE from stripe-billing.ts (platform subscriptions).
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

/** Platform application fee: 2.5% of payment (250 bps) — set to 0 to disable */
const APPLICATION_FEE_BPS = 250;

/**
 * Generate a Stripe Connect onboarding link for an org.
 * Creates a Standard account if the org doesn't have one yet.
 */
export async function createConnectOnboardingLink(opts: {
  orgId: string;
  existingAccountId?: string | null;
  orgName: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ accountId: string; url: string }> {
  let accountId = opts.existingAccountId;

  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "standard",
      metadata: { orgId: opts.orgId },
      business_profile: { name: opts.orgName },
    });
    accountId = account.id;
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    return_url: opts.returnUrl,
    refresh_url: opts.refreshUrl,
    type: "account_onboarding",
  });

  return { accountId, url: link.url };
}

/**
 * Check if a connected account has completed onboarding and can accept charges.
 */
export async function isConnectAccountReady(
  accountId: string
): Promise<boolean> {
  const account = await stripe().accounts.retrieve(accountId);
  return account.charges_enabled === true;
}

/**
 * Create a Stripe Checkout Session on the tenant's connected account.
 * Money goes to the tenant; platform takes an application fee.
 */
export async function createCheckoutSession(opts: {
  connectedAccountId: string;
  amountCents: number;
  orgName: string;
  jobNumber: number;
  customerEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}): Promise<{ sessionId: string; url: string }> {
  const applicationFeeCents =
    APPLICATION_FEE_BPS > 0
      ? Math.round((opts.amountCents * APPLICATION_FEE_BPS) / 10000)
      : undefined;

  const session = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${opts.orgName} — Job #${opts.jobNumber}`,
            },
            unit_amount: opts.amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        metadata: opts.metadata,
      },
      ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: opts.metadata,
    },
    { stripeAccount: opts.connectedAccountId }
  );

  return { sessionId: session.id, url: session.url! };
}

/**
 * Construct a Stripe webhook event from the raw body + signature.
 */
export function constructConnectWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET!
  );
}

/**
 * Retrieve a Checkout Session from a connected account.
 */
export async function retrieveCheckoutSession(
  sessionId: string,
  connectedAccountId: string
): Promise<Stripe.Checkout.Session> {
  return stripe().checkout.sessions.retrieve(sessionId, undefined, {
    stripeAccount: connectedAccountId,
  });
}

export { stripe, Stripe };
