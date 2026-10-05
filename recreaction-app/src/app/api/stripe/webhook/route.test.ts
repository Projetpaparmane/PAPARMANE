import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/payments", () => ({
  confirmPaidSession: vi.fn(async () => 1001),
  cancelExpiredSession: vi.fn(async () => undefined),
}));

const SECRET = "whsec_test_recreaction";
process.env.STRIPE_SECRET_KEY = "sk_test_recreaction";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

const { POST } = await import("./route");
const payments = await import("@/lib/payments");

function signedRequest(event: object, secret = SECRET) {
  const payload = JSON.stringify(event);
  const signature = new Stripe("sk_test_recreaction").webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/stripe/webhook", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signature, "content-type": "application/json" },
  });
}

const session = { id: "cs_test_1", object: "checkout.session", payment_status: "paid", metadata: { registration_id: "r1" } };

describe("webhook Stripe", () => {
  beforeEach(() => vi.clearAllMocks());

  it("confirme l'inscription quand le paiement est complété", async () => {
    const response = await POST(signedRequest({ id: "evt_1", type: "checkout.session.completed", data: { object: session } }));
    expect(response.status).toBe(200);
    expect(payments.confirmPaidSession).toHaveBeenCalledWith(expect.objectContaining({ id: "cs_test_1" }));
  });

  it("annule l'inscription quand la session de paiement expire", async () => {
    const response = await POST(signedRequest({ id: "evt_2", type: "checkout.session.expired", data: { object: session } }));
    expect(response.status).toBe(200);
    expect(payments.cancelExpiredSession).toHaveBeenCalledOnce();
  });

  it("refuse un appel dont la signature est fausse", async () => {
    const response = await POST(signedRequest({ id: "evt_3", type: "checkout.session.completed", data: { object: session } }, "whsec_autre"));
    expect(response.status).toBe(400);
    expect(payments.confirmPaidSession).not.toHaveBeenCalled();
  });

  it("refuse un appel sans signature", async () => {
    const response = await POST(new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }));
    expect(response.status).toBe(400);
  });

  it("demande à Stripe de réessayer si la confirmation échoue", async () => {
    vi.mocked(payments.confirmPaidSession).mockRejectedValueOnce(new Error("base indisponible"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await POST(signedRequest({ id: "evt_4", type: "checkout.session.completed", data: { object: session } }));
    expect(response.status).toBe(500);
  });
});
