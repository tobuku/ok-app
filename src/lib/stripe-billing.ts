/**
 * Stripe Billing — platform subscriptions.
 * YOU collecting subscription money from tenant orgs.
 *
 * SEPARATE from stripe-connect.ts (tenant customer payments).
 */
import Stripe from "stripe";

let _stripe: Stripe | null = null;
function stripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return _stripe;
}

/** Trial duration in days */
export const TRIAL_DAYS = 7;

/**
 * Create a Stripe Customer for an org (for billing subscriptions).
 */
export async function createBillingCustomer(opts: {
  orgId: string;
  orgName: string;
  email: string;
}): Promise<string> {
  const customer = await stripe().customers.create({
    name: opts.orgName,
    email: opts.email,
    metadata: { orgId: opts.orgId },
  });
  return customer.id;
}

/**
 * Create a Stripe Billing Checkout Session for subscribing to a plan.
 * Includes a 7-day free trial.
 */
export async function createBillingCheckoutSession(opts: {
  customerId: string;
  priceId: string;
  orgId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    customer: opts.customerId,
    line_items: [{ price: opts.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { orgId: opts.orgId },
    },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: { orgId: opts.orgId },
  });

  return { sessionId: session.id, url: session.url! };
}

/**
 * Generate a Stripe Customer Portal link for self-service billing management.
 */
export async function createBillingPortalSession(opts: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await stripe().billingPortal.sessions.create({
    customer: opts.customerId,
    return_url: opts.returnUrl,
  });
  return session.url;
}

/**
 * Retrieve a subscription from Stripe.
 */
export async function retrieveSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe().subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription at period end.
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return stripe().subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Construct a billing webhook event from raw body + signature.
 */
export function constructBillingWebhookEvent(
  rawBody: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe().webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET_BILLING!
  );
}

export { stripe as billingStripe, Stripe };
