/**
 * Job status transition guard.
 * Only allows valid transitions — prevents skipping steps.
 *
 * Flow: NEW → SCHEDULED → EN_ROUTE → ON_SITE → QUOTED → ACCEPTED → PAID → IN_PROGRESS → COMPLETED
 * Payment happens BEFORE loading (ACCEPTED → PAID), then work begins (PAID → IN_PROGRESS → COMPLETED).
 */
import type { JobStatus } from "@prisma/client";

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  NEW: ["SCHEDULED", "CANCELED"],
  SCHEDULED: ["EN_ROUTE", "CANCELED"],
  EN_ROUTE: ["ON_SITE", "CANCELED"],
  ON_SITE: ["QUOTED", "CANCELED"],
  QUOTED: ["ACCEPTED", "DECLINED", "CANCELED"],
  ACCEPTED: ["PAID", "CANCELED"], // payment transitions to PAID via pay routes
  DECLINED: ["QUOTED", "CANCELED"], // can re-quote
  PAID: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "CANCELED"],
  COMPLETED: [],
  CANCELED: [],
};

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Invalid job status transition: ${from} → ${to}`
    );
  }
}
