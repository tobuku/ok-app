/**
 * Creates the 6 test users in Supabase Auth and prints their UIDs.
 * Run: npx tsx scripts/create-auth-users.ts
 */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TEST_USERS = [
  { email: "admin@opalakuleana.com", password: "testpass123" },
  { email: "dispatch@opalakuleana.com", password: "testpass123" },
  { email: "lead@opalakuleana.com", password: "testpass123" },
  { email: "admin@islandhaulers.com", password: "testpass123" },
  { email: "dispatch@islandhaulers.com", password: "testpass123" },
  { email: "lead@islandhaulers.com", password: "testpass123" },
];

async function main() {
  const uids: Record<string, string> = {};

  for (const user of TEST_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
    });

    if (error) {
      // User might already exist
      if (error.message.includes("already been registered")) {
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list?.users.find((u) => u.email === user.email);
        if (existing) {
          uids[user.email] = existing.id;
          console.log(`EXISTS  ${user.email} → ${existing.id}`);
          continue;
        }
      }
      console.error(`FAILED  ${user.email}: ${error.message}`);
      continue;
    }

    uids[user.email] = data.user.id;
    console.log(`CREATED ${user.email} → ${data.user.id}`);
  }

  // Print the seed.ts update snippet
  console.log("\n--- Paste these authUid values into prisma/seed.ts ---\n");
  const mapping = [
    ["admin@opalakuleana.com", "AUTH_UID_ORG_A_ADMIN"],
    ["dispatch@opalakuleana.com", "AUTH_UID_ORG_A_DISPATCHER"],
    ["lead@opalakuleana.com", "AUTH_UID_ORG_A_LEADMAN"],
    ["admin@islandhaulers.com", "AUTH_UID_ORG_B_ADMIN"],
    ["dispatch@islandhaulers.com", "AUTH_UID_ORG_B_DISPATCHER"],
    ["lead@islandhaulers.com", "AUTH_UID_ORG_B_LEADMAN"],
  ];
  for (const [email, placeholder] of mapping) {
    if (uids[email]) {
      console.log(`${placeholder} → "${uids[email]}"`);
    }
  }
}

main();
