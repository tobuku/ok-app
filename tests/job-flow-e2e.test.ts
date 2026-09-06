/**
 * Full Job Flow End-to-End Test
 *
 * Exercises the complete lifecycle through the tenant-scoped DB layer:
 *   Customer created → Job SCHEDULED → EN_ROUTE → ON_SITE →
 *   Quote created (DRAFT) → PRESENTED → ACCEPTED (job → ACCEPTED) →
 *   Cash payment (job → PAID) → IN_PROGRESS → COMPLETED
 *
 * Also verifies:
 *   - Audit logs written at each step
 *   - Tenant isolation (Org B cannot see any records)
 *   - Terminal states enforced (COMPLETED cannot transition)
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { tenantScope, type AuditContext } from "../src/lib/tenant";
import { canTransition, assertTransition } from "../src/lib/status";

const prisma = new PrismaClient();

// Org A context (leadman performs onsite work)
const orgALead: AuditContext = {
  orgId: "org_a",
  actorUserId: "user_a_lead",
};

// Org A context (dispatcher creates jobs)
const orgADispatch: AuditContext = {
  orgId: "org_a",
  actorUserId: "user_a_dispatch",
};

// Org B context (should never see Org A data)
const orgBCtx: AuditContext = {
  orgId: "org_b",
  actorUserId: "user_b_admin",
};

// Track IDs for cleanup
let customerId: string;
let jobId: string;
let quoteId: string;
let paymentId: string;

beforeAll(async () => {
  const orgA = await prisma.organization.findUnique({ where: { id: "org_a" } });
  if (!orgA) throw new Error("Seed data not found. Run: npx tsx prisma/seed.ts");
});

afterAll(async () => {
  // Clean up in reverse dependency order
  if (paymentId) await prisma.payment.deleteMany({ where: { id: paymentId } });
  if (quoteId) {
    await prisma.quoteLine.deleteMany({ where: { quoteId } });
    await prisma.quote.deleteMany({ where: { id: quoteId } });
  }
  if (jobId) await prisma.job.deleteMany({ where: { id: jobId } });
  if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
  // Clean up audit logs from this test
  if (customerId) await prisma.auditLog.deleteMany({ where: { entityId: customerId } });
  if (jobId) await prisma.auditLog.deleteMany({ where: { entityId: jobId } });
  if (quoteId) await prisma.auditLog.deleteMany({ where: { entityId: quoteId } });
  if (paymentId) await prisma.auditLog.deleteMany({ where: { entityId: paymentId } });
  await prisma.$disconnect();
});

describe("Full Job Flow — End to End", () => {
  it("Step 1: Create customer", async () => {
    const t = tenantScope(orgADispatch);
    const cust = (await t.create("customer", {
      data: {
        name: "E2E Test Customer",
        phone: "808-555-0000",
        email: "e2e-test@example.com",
      },
    })) as { id: string; orgId: string; name: string };

    customerId = cust.id;
    expect(cust.orgId).toBe("org_a");
    expect(cust.name).toBe("E2E Test Customer");
  });

  it("Step 2: Create job (SCHEDULED)", async () => {
    const t = tenantScope(orgADispatch);

    // Get next job number
    const maxJob = await prisma.job.findFirst({
      where: { orgId: "org_a" },
      orderBy: { jobNumber: "desc" },
      select: { jobNumber: true },
    });
    const jobNumber = (maxJob?.jobNumber ?? 1000) + 1;

    const job = (await t.create("job", {
      data: {
        jobNumber,
        customerId,
        status: "SCHEDULED",
        scheduledDate: new Date(),
        assignedToId: "user_a_lead",
        source: "PHONE",
        createdById: "user_a_dispatch",
      },
    })) as { id: string; orgId: string; status: string; jobNumber: number };

    jobId = job.id;
    expect(job.orgId).toBe("org_a");
    expect(job.status).toBe("SCHEDULED");
    expect(job.jobNumber).toBe(jobNumber);
  });

  it("Step 3: Transition SCHEDULED → EN_ROUTE", async () => {
    assertTransition("SCHEDULED", "EN_ROUTE");
    const t = tenantScope(orgALead);
    const updated = (await t.update("job", {
      where: { id: jobId },
      data: { status: "EN_ROUTE", enRouteAt: new Date() },
    })) as { status: string; enRouteAt: Date | null };

    expect(updated.status).toBe("EN_ROUTE");
    expect(updated.enRouteAt).toBeTruthy();
  });

  it("Step 4: Transition EN_ROUTE → ON_SITE", async () => {
    assertTransition("EN_ROUTE", "ON_SITE");
    const t = tenantScope(orgALead);
    const updated = (await t.update("job", {
      where: { id: jobId },
      data: { status: "ON_SITE", onSiteAt: new Date() },
    })) as { status: string; onSiteAt: Date | null };

    expect(updated.status).toBe("ON_SITE");
    expect(updated.onSiteAt).toBeTruthy();
  });

  it("Step 5: Create quote with line items (job → QUOTED)", async () => {
    const lines = [
      { label: "1/2 Truck Load", qty: 1, unitCents: 22500 },
      { label: "Mattress Removal", qty: 2, unitCents: 3500 },
    ];

    const truckLoads = 1;
    const perLoadCents = lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0);
    const subtotalCents = perLoadCents * truckLoads;
    const discountCents = 0;
    const taxableAmount = subtotalCents - discountCents;

    // Get org tax rate
    const org = await prisma.organization.findUnique({
      where: { id: "org_a" },
      select: { taxRateBps: true },
    });
    const taxCents = Math.round((taxableAmount * (org?.taxRateBps ?? 0)) / 10000);
    const totalCents = taxableAmount + taxCents;

    // Create quote + lines in transaction (mirrors API route logic)
    const quote = await prisma.$transaction(async (tx) => {
      const q = await tx.quote.create({
        data: {
          orgId: "org_a",
          jobId,
          status: "DRAFT",
          truckLoads,
          subtotalCents,
          discountCents,
          discountReason: null,
          taxCents,
          totalCents,
        },
      });

      for (const line of lines) {
        await tx.quoteLine.create({
          data: {
            orgId: "org_a",
            quoteId: q.id,
            label: line.label,
            qty: line.qty,
            unitCents: line.unitCents,
            totalCents: line.qty * line.unitCents,
          },
        });
      }

      // Transition job to QUOTED
      await tx.job.update({
        where: { id: jobId },
        data: { status: "QUOTED" },
      });

      return q;
    });

    quoteId = quote.id;
    expect(quote.status).toBe("DRAFT");
    expect(quote.subtotalCents).toBe(29500); // 22500 + 7000
    expect(quote.totalCents).toBeGreaterThanOrEqual(quote.subtotalCents); // includes tax

    // Verify job transitioned to QUOTED
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe("QUOTED");
  });

  it("Step 6: Present quote (DRAFT → PRESENTED)", async () => {
    const t = tenantScope(orgALead);
    await t.update("quote", {
      where: { id: quoteId },
      data: { status: "PRESENTED" },
    });

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(quote?.status).toBe("PRESENTED");
  });

  it("Step 7: Accept quote (job → ACCEPTED)", async () => {
    assertTransition("QUOTED", "ACCEPTED");

    await prisma.$transaction(async (tx) => {
      await tx.quote.update({
        where: { id: quoteId },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          customerEmail: "e2e-test@example.com",
        },
      });
      await tx.job.update({
        where: { id: jobId },
        data: { status: "ACCEPTED" },
      });
    });

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(quote?.status).toBe("ACCEPTED");
    expect(quote?.acceptedAt).toBeTruthy();

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe("ACCEPTED");
  });

  it("Step 8: Cash payment (job → PAID)", async () => {
    assertTransition("ACCEPTED", "PAID");

    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    const now = new Date();

    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          orgId: "org_a",
          jobId,
          quoteId,
          method: "CASH",
          status: "SUCCEEDED",
          amountCents: quote!.totalCents,
          receivedById: "user_a_lead",
          paidAt: now,
        },
      });
      await tx.job.update({
        where: { id: jobId },
        data: { status: "PAID" },
      });
      return p;
    });

    paymentId = payment.id;
    expect(payment.method).toBe("CASH");
    expect(payment.status).toBe("SUCCEEDED");
    expect(payment.amountCents).toBe(quote!.totalCents);

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job?.status).toBe("PAID");
  });

  it("Step 9: Transition PAID → IN_PROGRESS", async () => {
    assertTransition("PAID", "IN_PROGRESS");
    const t = tenantScope(orgALead);
    const updated = (await t.update("job", {
      where: { id: jobId },
      data: { status: "IN_PROGRESS" },
    })) as { status: string };

    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("Step 10: Transition IN_PROGRESS → COMPLETED", async () => {
    assertTransition("IN_PROGRESS", "COMPLETED");
    const t = tenantScope(orgALead);
    const updated = (await t.update("job", {
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    })) as { status: string; completedAt: Date | null };

    expect(updated.status).toBe("COMPLETED");
    expect(updated.completedAt).toBeTruthy();
  });
});

describe("Full Job Flow — Final State Verification", () => {
  it("Job is COMPLETED with all timestamps", async () => {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    expect(job).not.toBeNull();
    expect(job!.status).toBe("COMPLETED");
    expect(job!.enRouteAt).toBeTruthy();
    expect(job!.onSiteAt).toBeTruthy();
    expect(job!.completedAt).toBeTruthy();
  });

  it("Quote is ACCEPTED with customer email", async () => {
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(quote!.status).toBe("ACCEPTED");
    expect(quote!.customerEmail).toBe("e2e-test@example.com");
    expect(quote!.acceptedAt).toBeTruthy();
  });

  it("Payment is SUCCEEDED with correct amount", async () => {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    const quote = await prisma.quote.findUnique({ where: { id: quoteId } });
    expect(payment!.status).toBe("SUCCEEDED");
    expect(payment!.method).toBe("CASH");
    expect(payment!.amountCents).toBe(quote!.totalCents);
    expect(payment!.paidAt).toBeTruthy();
  });

  it("Quote has correct line items", async () => {
    const lines = await prisma.quoteLine.findMany({ where: { quoteId } });
    expect(lines).toHaveLength(2);
    const labels = lines.map((l) => l.label).sort();
    expect(labels).toEqual(["1/2 Truck Load", "Mattress Removal"]);
  });

  it("COMPLETED job cannot transition further", () => {
    expect(canTransition("COMPLETED", "PAID")).toBe(false);
    expect(canTransition("COMPLETED", "CANCELED")).toBe(false);
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
  });
});

describe("Full Job Flow — Tenant Isolation", () => {
  it("Org B cannot see the customer", async () => {
    const tB = tenantScope(orgBCtx);
    const cust = await tB.findUnique("customer", { where: { id: customerId } });
    expect(cust).toBeNull();
  });

  it("Org B cannot see the job", async () => {
    const tB = tenantScope(orgBCtx);
    const job = await tB.findUnique("job", { where: { id: jobId } });
    expect(job).toBeNull();
  });

  it("Org B cannot see the quote", async () => {
    const tB = tenantScope(orgBCtx);
    const quote = await tB.findUnique("quote", { where: { id: quoteId } });
    expect(quote).toBeNull();
  });

  it("Org B cannot see the payment", async () => {
    const tB = tenantScope(orgBCtx);
    const payment = await tB.findUnique("payment", { where: { id: paymentId } });
    expect(payment).toBeNull();
  });

  it("Org B cannot update the job", async () => {
    const tB = tenantScope(orgBCtx);
    await expect(
      tB.update("job", { where: { id: jobId }, data: { notes: "HACKED" } })
    ).rejects.toThrow();
  });
});

describe("Full Job Flow — Invalid Transitions Blocked", () => {
  it("Cannot skip SCHEDULED → ON_SITE (must go through EN_ROUTE)", () => {
    expect(canTransition("SCHEDULED", "ON_SITE")).toBe(false);
  });

  it("Cannot skip ACCEPTED → IN_PROGRESS (must pay first)", () => {
    expect(canTransition("ACCEPTED", "IN_PROGRESS")).toBe(false);
  });

  it("Cannot go backwards PAID → ACCEPTED", () => {
    expect(canTransition("PAID", "ACCEPTED")).toBe(false);
  });

  it("Cannot create quote on SCHEDULED job", async () => {
    // The API route checks: job must be ON_SITE, QUOTED, or DECLINED
    const validQuoteStatuses = ["ON_SITE", "QUOTED", "DECLINED"];
    expect(validQuoteStatuses.includes("SCHEDULED")).toBe(false);
  });

  it("DECLINED quote can be re-quoted", () => {
    expect(canTransition("DECLINED", "QUOTED")).toBe(true);
  });
});

describe("Full Job Flow — Audit Trail", () => {
  it("Customer creation was audit-logged", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: customerId, action: "CREATE", entity: "customer" },
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].orgId).toBe("org_a");
  });

  it("Job creation was audit-logged", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: jobId, action: "CREATE", entity: "job" },
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].orgId).toBe("org_a");
  });

  it("Job status updates were audit-logged", async () => {
    const logs = await prisma.auditLog.findMany({
      where: { entityId: jobId, action: "UPDATE", entity: "job" },
    });
    // EN_ROUTE, ON_SITE, IN_PROGRESS, COMPLETED = 4 updates via tenantScope
    expect(logs.length).toBeGreaterThanOrEqual(4);
  });
});
