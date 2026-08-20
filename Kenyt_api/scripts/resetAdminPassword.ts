import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

// Resets (or creates) a user's password to a proper bcrypt hash against the
// database in DATABASE_URL. Use this to fix Login-401 on Railway (e.g. when the
// DB was populated with a plaintext password or the admin user is missing).
//
//   cd Kenyt_api
//   $env:DATABASE_URL="postgresql://<railway-db-uri>" ; npx tsx scripts/resetAdminPassword.ts
//     (defaults: email=admin@kenyt.com, password=admin123)
//   or override: $env:ADMIN_EMAIL=... ; $env:ADMIN_PASSWORD=...

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@kenyt.com").toLowerCase().trim();
  const plain = process.env.ADMIN_PASSWORD || "admin123";

  const hashed = await bcrypt.hash(plain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashed,
      role: "super_admin",
      isActive: true,
    },
    create: {
      email,
      password: hashed,
      fullName: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });

  console.log(`✅ Password reset for ${user.email} to a bcrypt hash.`);
  console.log(`   Login with: ${email} / ${plain}`);
  console.log("   ⚠️  IMPORTANT: Change it after first login!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Reset failed:", e);
    process.exit(1);
  });