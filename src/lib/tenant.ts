/**
 * Tenant-scoping helper.
 * ALL tenant-owned queries go through this module — never raw prisma.* for tenant tables.
 * Every read/write is scoped by orgId in one central place.
 */
import { prisma } from "./prisma";
import { auditLog } from "./audit";

// Tables that carry orgId and must always be scoped
const TENANT_TABLES = [
  "customer",
  "address",
  "job",
  "photo",
  "priceBook",
  "priceItem",
  "quote",
  "quoteLine",
  "payment",
  "emailLog",
  "truck",
  "dumpSite",
  "dumpRun",
  "jobNote",
  "addressNote",
] as const;

type TenantTable = (typeof TENANT_TABLES)[number];

export type AuditContext = {
  orgId: string;
  actorUserId?: string;
  actorPlatformUserId?: string;
};

/**
 * Returns a scoped query helper for a given org.
 * Usage:
 *   const t = tenantScope({ orgId, actorUserId });
 *   const jobs = await t.findMany("job", { where: { status: "SCHEDULED" } });
 *   const job = await t.create("job", { data: { ... } });
 */
export function tenantScope(ctx: AuditContext) {
  const { orgId } = ctx;

  function getDelegate(table: TenantTable) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any)[table];
  }

  return {
    orgId,

    async findMany<T = unknown>(
      table: TenantTable,
      args: { where?: Record<string, unknown>; [key: string]: unknown } = {}
    ): Promise<T[]> {
      const delegate = getDelegate(table);
      return delegate.findMany({
        ...args,
        where: { ...args.where, orgId },
      });
    },

    async findFirst<T = unknown>(
      table: TenantTable,
      args: { where?: Record<string, unknown>; [key: string]: unknown } = {}
    ): Promise<T | null> {
      const delegate = getDelegate(table);
      return delegate.findFirst({
        ...args,
        where: { ...args.where, orgId },
      });
    },

    async findUnique<T = unknown>(
      table: TenantTable,
      args: { where: Record<string, unknown>; [key: string]: unknown }
    ): Promise<T | null> {
      const delegate = getDelegate(table);
      // findUnique doesn't support adding orgId to composite where easily,
      // so we use findFirst with the same where + orgId
      return delegate.findFirst({
        ...args,
        where: { ...args.where, orgId },
      });
    },

    async count(
      table: TenantTable,
      args: { where?: Record<string, unknown> } = {}
    ): Promise<number> {
      const delegate = getDelegate(table);
      return delegate.count({
        where: { ...args.where, orgId },
      });
    },

    async create<T = unknown>(
      table: TenantTable,
      args: { data: Record<string, unknown>; [key: string]: unknown }
    ): Promise<T> {
      const delegate = getDelegate(table);
      const record = await delegate.create({
        ...args,
        data: { ...args.data, orgId },
      });
      await auditLog({
        ...ctx,
        action: "CREATE",
        entity: table,
        entityId: record.id,
        meta: {},
      });
      return record;
    },

    async update<T = unknown>(
      table: TenantTable,
      args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
        [key: string]: unknown;
      }
    ): Promise<T> {
      const delegate = getDelegate(table);
      // First verify the record belongs to this org
      const existing = await delegate.findFirst({
        where: { ...args.where, orgId },
        select: { id: true },
      });
      if (!existing) {
        throw new Error(`${table} not found in org ${orgId}`);
      }
      const record = await delegate.update({
        ...args,
        where: { id: existing.id },
        data: args.data,
      });
      await auditLog({
        ...ctx,
        action: "UPDATE",
        entity: table,
        entityId: record.id,
        meta: {},
      });
      return record;
    },

    async delete(
      table: TenantTable,
      args: { where: Record<string, unknown> }
    ): Promise<void> {
      const delegate = getDelegate(table);
      const existing = await delegate.findFirst({
        where: { ...args.where, orgId },
        select: { id: true },
      });
      if (!existing) {
        throw new Error(`${table} not found in org ${orgId}`);
      }
      await delegate.delete({ where: { id: existing.id } });
      await auditLog({
        ...ctx,
        action: "DELETE",
        entity: table,
        entityId: existing.id,
        meta: {},
      });
    },
  };
}

export { TENANT_TABLES };
