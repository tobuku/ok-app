-- Organization business info
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "licenseNumber" TEXT;

-- Quote government/contract fields
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "validDays" INT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "projectName" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "projectLocation" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "solicitationNo" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "rfqNumber" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "contractNumber" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "agencyDept" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pocName" TEXT;
ALTER TABLE "Quote" ADD COLUMN IF NOT EXISTS "pocPhone" TEXT;

-- QuoteLine category
ALTER TABLE "QuoteLine" ADD COLUMN IF NOT EXISTS "category" TEXT;
