import { isValidCheckoutSessionId } from "./paymentSession";

describe("isValidCheckoutSessionId", () => {
  test.each([
    "cs_test_valid_123",
    "cs_live_valid_123",
  ])("accepts Stripe checkout session %s", (sessionId) => {
    expect(isValidCheckoutSessionId(sessionId)).toBe(true);
  });

  test.each([
    "",
    "cs_invalid_123",
    "pi_live_123",
    "cs_live_invalid-value",
  ])("rejects invalid checkout session %s", (sessionId) => {
    expect(isValidCheckoutSessionId(sessionId)).toBe(false);
  });
});
