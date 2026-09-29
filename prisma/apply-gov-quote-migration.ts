/**
 * Apply government quote fields migration via $executeRawUnsafe (pooler workaround).
 * Run: npx tsx prisma/apply-gov-quote-migration.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const statements = [
  // Organization
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "address" TEXT`,
  `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT`,
  // Quote
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "validDays" INT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "projectName" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "projectLocation" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "solicitationNo" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "rfqNumber" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "agencyDept" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pocName" TEXT`,
  `ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pocPhone" TEXT`,
  // QuoteLine
  `ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "category" TEXT`,
];

async function main() {
  for (const sql of statements) {
    console.log(`Running: ${sql.slice(0, 60)}...`);
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("Done — all columns added.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
