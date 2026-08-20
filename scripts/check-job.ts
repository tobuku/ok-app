import { PrismaClient } from "@prisma/client";

async function main() {
  const p = new PrismaClient();
  const jobs = await p.job.findMany({
    where: { orgId: "org_a" },
    select: { id: true, jobNumber: true, scheduledDate: true, status: true, assignedToId: true },
  });
  console.log("Jobs in org_a:");
  console.log(JSON.stringify(jobs, null, 2));

  const now = new Date();
  console.log("\nServer now:", now.toISOString());
  console.log("Local date:", now.toLocaleDateString());
  console.log("getDate():", now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0"));

  await p.$disconnect();
}
main();
