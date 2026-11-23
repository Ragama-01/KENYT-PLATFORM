import type { FastifyLoggerInstance } from "fastify";

export interface MakeContainerPayload {
  containerNumber: string;
  containerType: string;
  contents: string;
  weightTonnes: number;
}

export interface MakeOrderPayload {
  orderId: number;
  createdAt: string;
  bolNumber: string;
  customer: string;
  loadType: string;
  etaDischargeDate: string;
  gfDoGiven: string;
  im4Im7Given: string;
  pickupLocation: string;
  deliveryLocation: string;
  emptyDropOff: string;
  consigneeName: string;
  consigneePhone: string;
  specialInstructions: string;
  containers: MakeContainerPayload[];
}

function envOrEmpty(name: string): string {
  const raw = process.env[name];
  return raw ? String(raw).trim() : "";
}

export async function sendOrderToMake(
  order: any,
  containers: any[],
  log: FastifyLoggerInstance = console as unknown as FastifyLoggerInstance,
): Promise<void> {
  const url = envOrEmpty("MAKE_WEBHOOK_URL");
  const apiKey = envOrEmpty("MAKE_API_KEY");

  if (!url || !apiKey) {
    log.warn(
      "Make webhook not configured: MAKE_WEBHOOK_URL or MAKE_API_KEY is missing. Skipping webhook call.",
    );
    return;
  }

  const payload: MakeOrderPayload = {
    orderId: order.orderId,
    createdAt: order.createdAt
      ? new Date(order.createdAt).toISOString()
      : new Date().toISOString(),
    bolNumber: order.bolNumber ?? "",
    customer: order.customerName ?? "",
    loadType: order.loadType ?? "",
    etaDischargeDate: order.etaDischargeDate
      ? new Date(order.etaDischargeDate).toISOString().split("T")[0]
      : "",
    gfDoGiven: order.gfDoType ?? "",
    im4Im7Given: order.im4Im7Type ?? "",
    pickupLocation: order.pickupLocation?.name ?? "",
    deliveryLocation: order.deliveryLocation?.name ?? "",
    emptyDropOff: order.emptyDropOff ?? "",
    consigneeName: order.consigneeName ?? "",
    consigneePhone: order.consigneePhone ?? "",
    specialInstructions: order.specialInstructions ?? "",
    containers: (containers || []).map((c) => ({
      containerNumber: c.containerNumber ?? "",
      containerType: c.containerType ?? "",
      contents: c.cargoType ?? "",
      weightTonnes: Number(c.weightTonnes ?? 0),
    })),
  };

  log.info(`sending order ${order.orderId} to Make`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-make-apikey": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      log.warn(
        `Make webhook returned non-2xx status ${response.status} for order ${order.orderId}`,
      );
      return;
    }

    log.info(
      `Make webhook accepted order ${order.orderId} with status ${response.status}`,
    );
  } catch (err) {
    clearTimeout(timeoutId);
    log.warn(
      `Make webhook failed for order ${order.orderId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
