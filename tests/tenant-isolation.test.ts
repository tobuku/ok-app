/**
 * Tenant Isolation Test Suite — Phase 0 acceptance criteria.
 *
 * Logs in as Org A users and attempts to read AND write Org B's
 * jobs, customers, photos, quotes. Every attempt must fail.
 *
 * Run: npm test
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { tenantScope, type AuditContext } from "../src/lib/tenant";

const prisma = new PrismaClient();

// Test context for Org A user
const orgACtx: AuditContext = {
  orgId: "org_a",
  actorUserId: "user_a_admin",
};

// Test context for Org B user
const orgBCtx: AuditContext = {
  orgId: "org_b",
  actorUserId: "user_b_admin",
};

beforeAll(async () => {
  // Verify seed data exists
  const orgA = await prisma.organization.findUnique({ where: { id: "org_a" } });
  const orgB = await prisma.organization.findUnique({ where: { id: "org_b" } });
  if (!orgA || !orgB) {
    throw new Error("Seed data not found. Run: npx tsx prisma/seed.ts");
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Tenant Isolation — Reads", () => {
  it("Org A cannot read Org B customers", async () => {
    const tA = tenantScope(orgACtx);
    const customers = await tA.findMany("customer");
    const ids = (customers as { id: string }[]).map((c) => c.id);
    expect(ids).not.toContain("cust_b_1");
  });

  it("Org A cannot find Org B customer by ID", async () => {
    const tA = tenantScope(orgACtx);
    const cust = await tA.findUnique("customer", { where: { id: "cust_b_1" } });
    expect(cust).toBeNull();
  });

  it("Org A cannot read Org B jobs", async () => {
    const tA = tenantScope(orgACtx);
    const jobs = await tA.findMany("job");
    const ids = (jobs as { id: string }[]).map((j) => j.id);
    expect(ids).not.toContain("job_b_1");
  });

  it("Org A cannot find Org B job by ID", async () => {
    const tA = tenantScope(orgACtx);
    const job = await tA.findUnique("job", { where: { id: "job_b_1" } });
    expect(job).toBeNull();
  });

  it("Org B cannot read Org A customers", async () => {
    const tB = tenantScope(orgBCtx);
    const customers = await tB.findMany("customer");
    const ids = (customers as { id: string }[]).map((c) => c.id);
    expect(ids).not.toContain("cust_a_1");
  });

  it("Org B cannot read Org A jobs", async () => {
    const tB = tenantScope(orgBCtx);
    const jobs = await tB.findMany("job");
    const ids = (jobs as { id: string }[]).map((j) => j.id);
    expect(ids).not.toContain("job_a_1");
  });

  it("Org A can read its own customers", async () => {
    const tA = tenantScope(orgACtx);
    const customers = await tA.findMany("customer");
    expect((customers as { id: string }[]).some((c) => c.id === "cust_a_1")).toBe(true);
  });

  it("Org A can read its own jobs", async () => {
    const tA = tenantScope(orgACtx);
    const jobs = await tA.findMany("job");
    expect((jobs as { id: string }[]).some((j) => j.id === "job_a_1")).toBe(true);
  });

  it("Org A cannot read Org B price books", async () => {
    const tA = tenantScope(orgACtx);
    const pbs = await tA.findMany("priceBook");
    const ids = (pbs as { id: string }[]).map((p) => p.id);
    expect(ids).not.toContain("pb_island-haulers");
  });

  it("Org A cannot read Org B trucks", async () => {
    const tA = tenantScope(orgACtx);
    const trucks = await tA.findMany("truck");
    const ids = (trucks as { id: string }[]).map((t) => t.id);
    expect(ids).not.toContain("truck_b");
  });
});

describe("Tenant Isolation — Writes", () => {
  it("Org A cannot update Org B customer", async () => {
    const tA = tenantScope(orgACtx);
    await expect(
      tA.update("customer", {
        where: { id: "cust_b_1" },
        data: { name: "HACKED" },
      })
    ).rejects.toThrow();
  });

  it("Org A cannot update Org B job", async () => {
    const tA = tenantScope(orgACtx);
    await expect(
      tA.update("job", {
        where: { id: "job_b_1" },
        data: { notes: "HACKED" },
      })
    ).rejects.toThrow();
  });

  it("Org A cannot delete Org B customer", async () => {
    const tA = tenantScope(orgACtx);
    await expect(
      tA.delete("customer", { where: { id: "cust_b_1" } })
    ).rejects.toThrow();
  });

  it("Org A cannot delete Org B job", async () => {
    const tA = tenantScope(orgACtx);
    await expect(
      tA.delete("job", { where: { id: "job_b_1" } })
    ).rejects.toThrow();
  });

  it("Org A cannot create a customer in Org B (orgId is overridden)", async () => {
    const tA = tenantScope(orgACtx);
    // Even if malicious data tries to set orgId to org_b, tenantScope forces orgId to org_a
    const cust = (await tA.create("customer", {
      data: { orgId: "org_b", name: "Sneaky Customer", phone: "000" },
    })) as { id: string; orgId: string };
    expect(cust.orgId).toBe("org_a"); // forced to Org A
    // Clean up
    await prisma.customer.delete({ where: { id: cust.id } });
  });

  it("Org B cannot update Org A job", async () => {
    const tB = tenantScope(orgBCtx);
    await expect(
      tB.update("job", {
        where: { id: "job_a_1" },
        data: { notes: "HACKED" },
      })
    ).rejects.toThrow();
  });
});

describe("Tenant Isolation — Photos (storage keys)", () => {
  it("Org A cannot read Org B photos", async () => {
    // Create a test photo in Org B
    await prisma.photo.upsert({
      where: { id: "photo_b_test" },
      update: {},
      create: {
        id: "photo_b_test",
        orgId: "org_b",
        jobId: "job_b_1",
        type: "BEFORE",
        storageKey: "org/org_b/photos/test.jpg",
        takenById: "user_b_lead",
      },
    });

    const tA = tenantScope(orgACtx);
    const photos = await tA.findMany("photo");
    const ids = (photos as { id: string }[]).map((p) => p.id);
    expect(ids).not.toContain("photo_b_test");

    // Clean up
    await prisma.photo.delete({ where: { id: "photo_b_test" } });
  });
});

describe("Tenant Isolation — Quotes", () => {
  let quoteB: { id: string };

  beforeAll(async () => {
    quoteB = await prisma.quote.upsert({
      where: { id: "quote_b_test" },
      update: {},
      create: {
        id: "quote_b_test",
        orgId: "org_b",
        jobId: "job_b_1",
        status: "DRAFT",
        subtotalCents: 35000,
        totalCents: 35000,
      },
    });
  });

  afterAll(async () => {
    await prisma.quote.deleteMany({ where: { id: "quote_b_test" } });
  });

  it("Org A cannot read Org B quotes", async () => {
    const tA = tenantScope(orgACtx);
    const quotes = await tA.findMany("quote");
    const ids = (quotes as { id: string }[]).map((q) => q.id);
    expect(ids).not.toContain(quoteB.id);
  });

  it("Org A cannot update Org B quote", async () => {
    const tA = tenantScope(orgACtx);
    await expect(
      tA.update("quote", {
        where: { id: quoteB.id },
        data: { totalCents: 0 },
      })
    ).rejects.toThrow();
  });
});

describe("Audit Logging", () => {
  it("create operations generate audit logs", async () => {
    const tA = tenantScope(orgACtx);
    const cust = (await tA.create("customer", {
      data: { name: "Audit Test Customer", phone: "808-555-9999" },
    })) as { id: string };

    const logs = await prisma.auditLog.findMany({
      where: { entityId: cust.id, action: "CREATE", entity: "customer" },
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].orgId).toBe("org_a");
    expect(logs[0].actorUserId).toBe("user_a_admin");

    // Clean up
    await prisma.customer.delete({ where: { id: cust.id } });
  });

  it("update operations generate audit logs", async () => {
    const tA = tenantScope(orgACtx);
    await tA.update("customer", {
      where: { id: "cust_a_1" },
      data: { notes: "Updated in test" },
    });

    const logs = await prisma.auditLog.findMany({
      where: { entityId: "cust_a_1", action: "UPDATE", entity: "customer" },
      orderBy: { createdAt: "desc" },
    });
    expect(logs.length).toBeGreaterThan(0);

    // Restore
    await prisma.customer.update({
      where: { id: "cust_a_1" },
      data: { notes: null },
    });
  });
});
