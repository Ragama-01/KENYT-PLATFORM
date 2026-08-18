import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

import truckRoutes from "./routes/trucks";
import driverRoutes from "./routes/drivers";
import orderRoutes from "./routes/orders";
import allocationRoutes from "./routes/allocations";
import locationRoutes from "./routes/locations";
import userRoutes from "./routes/users";
import { startWialonPolling } from "./services/wialonPolling.service.js";

const app = Fastify({
  logger: true
});

async function main() {

  await app.register(cors, {
    origin: true
  });

  await app.register(truckRoutes);
  await app.register(driverRoutes);
  await app.register(orderRoutes);
  await app.register(locationRoutes);
  await app.register(allocationRoutes);
  await app.register(userRoutes);

  app.get("/", async () => {

    return {
      status: "ok",
      service: "kenyt-api",
    };

  });

  app.get("/status", async () => {

    return {
      status: "ok",
    };

  });

  app.get("/health", async () => {

    return {
      status: "ok"
    };

  });

  const port = Number(process.env.PORT ?? 4000);

  await app.listen({
    port,
    host: "0.0.0.0"
  });

  // Start hourly truck location polling for accurate allocation
  startWialonPolling().catch((err) => {
    app.log.error({ err }, "Failed to start Wialon polling");
  });
}

main().catch((err) => {

  app.log.error(err);
  process.exit(1);

});