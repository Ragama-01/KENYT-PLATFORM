import Fastify from "fastify";
import cors from "@fastify/cors";

import truckRoutes from "./routes/trucks";
import driverRoutes from "./routes/drivers";
import orderRoutes from "./routes/orders";
import allocationRoutes from "./routes/allocations";
import locationRoutes from "./routes/locations";

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

}

main().catch((err) => {

  app.log.error(err);
  process.exit(1);

});