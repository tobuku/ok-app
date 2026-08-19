/**
 * Seed script: 2 test organizations, each with LEADMAN, DISPATCHER, ORG_ADMIN,
 * a truck, and a default price book with truck-load fractions + common add-ons.
 *
 * Run: npx tsx prisma/seed.ts
 *
 * NOTE: You must first create these 6 users in Supabase Auth (email+password).
 * The authUid values below are placeholders — replace with real Supabase Auth UIDs.
 * See SETUP.md for instructions.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Plans ───
  const starterPlan = await prisma.plan.upsert({
    where: { id: "plan_starter" },
    update: {},
    create: {
      id: "plan_starter",
      name: "Starter",
      priceCentsMonthly: 4900, // $49/mo
      maxUsers: 5,
      maxJobsPerMonth: 100,
    },
  });

  // ─── Org A: Opala Kuleana ───
  const orgA = await prisma.organization.upsert({
    where: { slug: "opala-kuleana" },
    update: {},
    create: {
      id: "org_a",
      name: "Opala Kuleana",
      slug: "opala-kuleana",
      timezone: "Pacific/Honolulu",
      receiptsEmail: "receipts@opalakuleana.com",
      status: "ACTIVE",
      taxRateBps: 450, // Hawaii GET 4.5%
    },
  });

  // ─── Org B: Island Haulers ───
  const orgB = await prisma.organization.upsert({
    where: { slug: "island-haulers" },
    update: {},
    create: {
      id: "org_b",
      name: "Island Haulers",
      slug: "island-haulers",
      timezone: "Pacific/Honolulu",
      receiptsEmail: "receipts@islandhaulers.com",
      status: "ACTIVE",
      taxRateBps: 450,
    },
  });

  // ─── Subscriptions ───
  await prisma.subscription.upsert({
    where: { orgId: orgA.id },
    update: {},
    create: { orgId: orgA.id, planId: starterPlan.id, status: "active" },
  });
  await prisma.subscription.upsert({
    where: { orgId: orgB.id },
    update: {},
    create: { orgId: orgB.id, planId: starterPlan.id, status: "active" },
  });

  // ─── Users (replace authUid with real Supabase Auth UIDs) ───
  const usersData = [
    { id: "user_a_admin", orgId: orgA.id, name: "Alice Admin", email: "admin@opalakuleana.com", role: "ORG_ADMIN" as const, authUid: "35ec0c87-3cb2-4f69-a91c-d035f8968d20" },
    { id: "user_a_dispatch", orgId: orgA.id, name: "Dan Dispatch", email: "dispatch@opalakuleana.com", role: "DISPATCHER" as const, authUid: "c2f86174-3005-4a39-816f-5073d8313d76" },
    { id: "user_a_lead", orgId: orgA.id, name: "Leo Leadman", email: "lead@opalakuleana.com", role: "LEADMAN" as const, authUid: "3863f445-b3d7-4044-bdbc-af61ef26f99d" },
    { id: "user_b_admin", orgId: orgB.id, name: "Bob Admin", email: "admin@islandhaulers.com", role: "ORG_ADMIN" as const, authUid: "ea60efb2-c2ef-4d56-b52e-b004c74490a4" },
    { id: "user_b_dispatch", orgId: orgB.id, name: "Dana Dispatch", email: "dispatch@islandhaulers.com", role: "DISPATCHER" as const, authUid: "2e440a99-7065-4bd4-bab0-ae40db5ee576" },
    { id: "user_b_lead", orgId: orgB.id, name: "Luke Leadman", email: "lead@islandhaulers.com", role: "LEADMAN" as const, authUid: "ece8c52d-c434-4191-9be0-bf1b976eb91a" },
  ];

  for (const u of usersData) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: u,
    });
  }

  // ─── Trucks ───
  await prisma.truck.upsert({
    where: { id: "truck_a" },
    update: {},
    create: { id: "truck_a", orgId: orgA.id, name: "Truck 1", capacityCubicYards: 15 },
  });
  await prisma.truck.upsert({
    where: { id: "truck_b" },
    update: {},
    create: { id: "truck_b", orgId: orgB.id, name: "Truck 1", capacityCubicYards: 15 },
  });

  // ─── Default Price Books ───
  for (const org of [orgA, orgB]) {
    const pb = await prisma.priceBook.upsert({
      where: { id: `pb_${org.slug}` },
      update: {},
      create: { id: `pb_${org.slug}`, orgId: org.id, name: "Default", active: true },
    });

    const loadFractions = [
      { label: "Minimum Load", fraction: 0.0, amountCents: 7500, sortOrder: 0 },
      { label: "1/8 Truck Load", fraction: 0.125, amountCents: 12500, sortOrder: 1 },
      { label: "1/4 Truck Load", fraction: 0.25, amountCents: 20000, sortOrder: 2 },
      { label: "3/8 Truck Load", fraction: 0.375, amountCents: 27500, sortOrder: 3 },
      { label: "1/2 Truck Load", fraction: 0.5, amountCents: 35000, sortOrder: 4 },
      { label: "5/8 Truck Load", fraction: 0.625, amountCents: 42500, sortOrder: 5 },
      { label: "3/4 Truck Load", fraction: 0.75, amountCents: 50000, sortOrder: 6 },
      { label: "7/8 Truck Load", fraction: 0.875, amountCents: 57500, sortOrder: 7 },
      { label: "Full Truck Load", fraction: 1.0, amountCents: 65000, sortOrder: 8 },
    ];

    const addons = [
      { label: "Mattress", amountCents: 3500, sortOrder: 100 },
      { label: "Appliance", amountCents: 5000, sortOrder: 101 },
      { label: "Tire", amountCents: 1500, sortOrder: 102 },
      { label: "Stairs Fee", amountCents: 5000, sortOrder: 103 },
      { label: "Heavy Material Surcharge", amountCents: 7500, sortOrder: 104 },
    ];

    for (const lf of loadFractions) {
      await prisma.priceItem.upsert({
        where: { id: `pi_${org.slug}_lf_${lf.sortOrder}` },
        update: {},
        create: {
          id: `pi_${org.slug}_lf_${lf.sortOrder}`,
          orgId: org.id,
          priceBookId: pb.id,
          kind: "LOAD_FRACTION",
          label: lf.label,
          fraction: lf.fraction,
          amountCents: lf.amountCents,
          sortOrder: lf.sortOrder,
        },
      });
    }

    for (const addon of addons) {
      await prisma.priceItem.upsert({
        where: { id: `pi_${org.slug}_addon_${addon.sortOrder}` },
        update: {},
        create: {
          id: `pi_${org.slug}_addon_${addon.sortOrder}`,
          orgId: org.id,
          priceBookId: pb.id,
          kind: "ADDON",
          label: addon.label,
          fraction: null,
          amountCents: addon.amountCents,
          sortOrder: addon.sortOrder,
        },
      });
    }
  }

  // ─── Sample Customers (for isolation tests) ───
  await prisma.customer.upsert({
    where: { id: "cust_a_1" },
    update: {},
    create: { id: "cust_a_1", orgId: orgA.id, name: "Customer A1", phone: "808-555-0001" },
  });
  await prisma.customer.upsert({
    where: { id: "cust_b_1" },
    update: {},
    create: { id: "cust_b_1", orgId: orgB.id, name: "Customer B1", phone: "808-555-0002" },
  });

  // ─── Sample Jobs (for isolation tests) ───
  await prisma.job.upsert({
    where: { id: "job_a_1" },
    update: {},
    create: {
      id: "job_a_1",
      orgId: orgA.id,
      jobNumber: 1001,
      customerId: "cust_a_1",
      status: "SCHEDULED",
      createdById: "user_a_dispatch",
      assignedToId: "user_a_lead",
      scheduledDate: new Date("2026-08-20"),
    },
  });
  await prisma.job.upsert({
    where: { id: "job_b_1" },
    update: {},
    create: {
      id: "job_b_1",
      orgId: orgB.id,
      jobNumber: 1001,
      customerId: "cust_b_1",
      status: "SCHEDULED",
      createdById: "user_b_dispatch",
      assignedToId: "user_b_lead",
      scheduledDate: new Date("2026-08-20"),
    },
  });

  console.log("Seed complete.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
