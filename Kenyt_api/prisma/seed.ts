import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create default super admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@kenyt.com" },
    update: {},
    create: {
      email: "admin@kenyt.com",
      password: hashedPassword,
      fullName: "Super Admin",
      role: "super_admin",
      isActive: true,
    },
  });

  console.log("✅ Created super admin user:");
  console.log("   Email: admin@kenyt.com");
  console.log("   Password: admin123");
  console.log("   Role: super_admin");
  console.log("");
  console.log("⚠️  IMPORTANT: Change the password after first login!");
  console.log("");
  console.log("🌱 Seed completed successfully!");

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });