import "dotenv/config";
import {
  sendOrderCreatedNotification,
  sendAllocationNotification,
} from "../src/services/email.service";

// Runs the REAL service functions (same code path as order creation and
// truck allocation) so we can confirm notifications are delivered end-to-end.
//
// Usage: npx tsx scripts/testNotifications.ts
// Requires SMTP_USER, SMTP_PASS, SUPER_USER_EMAIL and
// TEAM_NOTIFICATION_EMAILS in .env.

async function main(): Promise<void> {
  console.log("--- Testing sendOrderCreatedNotification ---");
  await sendOrderCreatedNotification({
    orderId: 0,
    bolNumber: "TEST-BOL-001",
    customerName: "TEST Customer (ignore)",
    cargoType: "TEST Cargo",
    weightTonnes: "25",
    loadType: "Full Truck Load",
    pickup: "Test Pickup Location",
    delivery: "Test Delivery Location",
    etaDischarge: null,
    specialInstructions: "This is a test notification — please ignore.",
  });

  console.log("--- Testing sendAllocationNotification ---");
  await sendAllocationNotification({
    orderId: 0,
    bolNumber: "TEST-BOL-001",
    customerName: "TEST Customer (ignore)",
    truckRegistration: "TEST-TRUCK-001",
    truckCapacity: "30",
  });

  console.log("--- Done. Check inboxes (and spam). ---");
  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
