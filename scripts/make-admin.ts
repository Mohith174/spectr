/**
 * Grant admin role to a Clerk user.
 *
 * Usage:
 *   npx tsx scripts/make-admin.ts <userId>
 *
 * Find the userId in the Clerk dashboard under Users.
 * Example: npx tsx scripts/make-admin.ts user_2abc123xyz
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
const userId = process.argv[2];

if (!CLERK_SECRET_KEY) {
  console.error("Error: CLERK_SECRET_KEY not found in .env.local");
  process.exit(1);
}

if (!userId) {
  console.error("Usage: npx tsx scripts/make-admin.ts <userId>");
  console.error("Example: npx tsx scripts/make-admin.ts user_2abc123xyz");
  process.exit(1);
}

async function makeAdmin() {
  console.log(`Setting role=admin for user: ${userId}`);

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: { role: "admin" } }),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Failed to update user:", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  const data = await res.json();
  console.log(`✓ User ${data.id} (${data.email_addresses?.[0]?.email_address ?? "unknown"}) is now an admin.`);
  console.log("  public_metadata:", JSON.stringify(data.public_metadata));
}

makeAdmin().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
