import {
  getPageParams,
  trackCheckoutClick,
  trackCheckoutError,
  trackEventOnce,
  trackPurchase,
} from "./analytics";

describe("analytics deduplication", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.gtag = jest.fn();
    window.history.replaceState({}, "", "/");
  });

  test("does not emit the same approved event twice", () => {
    trackEventOnce("free_result_viewed", "analysis_1", { analysis_id: "analysis_1" });
    trackEventOnce("free_result_viewed", "analysis_1", { analysis_id: "analysis_1" });
    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "free_result_viewed",
      expect.objectContaining({ analysis_id: "analysis_1" })
    );
  });

  test("allows different approved events for the same analysis", () => {
    trackEventOnce("purchase", "session_1", {});
    trackEventOnce("premium_report_viewed", "analysis_1", {});
    trackEventOnce("pdf_downloaded", "analysis_1", {});
    expect(window.gtag).toHaveBeenCalledTimes(3);
  });

  test("never sends checkout session ids or query parameters to analytics", () => {
    window.history.replaceState(
      {},
      "",
      "/payment-success?session_id=cs_test_sensitive&token=premium_sensitive#checkout"
    );

    const params = getPageParams();
    trackEventOnce("purchase", "purchase_1", params);

    expect(params.page_location).toBe(`${window.location.origin}/payment-success`);
    expect(params.page_path).toBe("/payment-success");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("session_id");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("cs_test_sensitive");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("premium_sensitive");
  });

  test("emits only the standard GA4 begin_checkout event", () => {
    trackCheckoutClick({
      ctaText: "Desbloquear informe completo por 6,99€",
      ctaLocation: "premium_unlock",
      analyzedDomain: "example.com",
      analysisId: "analysis_1",
    });

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "begin_checkout",
      expect.objectContaining({
        currency: "EUR",
        value: 6.99,
        items: [expect.objectContaining({ item_id: "premium_web_report", quantity: 1 })],
      })
    );
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("checkout_started");
  });

  test("emits purchase once with ecommerce parameters and no Stripe session id", () => {
    trackPurchase({
      uniqueKey: "cs_live_sensitive",
      transactionId: "analysis_1",
      analysisId: "analysis_1",
      analyzedDomain: "example.com",
    });
    trackPurchase({
      uniqueKey: "cs_live_sensitive",
      transactionId: "analysis_1",
      analysisId: "analysis_1",
      analyzedDomain: "example.com",
    });

    expect(window.gtag).toHaveBeenCalledTimes(1);
    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "purchase",
      expect.objectContaining({
        transaction_id: "analysis_1",
        currency: "EUR",
        value: 6.99,
        items: [expect.objectContaining({ item_id: "premium_web_report", quantity: 1 })],
      })
    );
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("cs_live_sensitive");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("purchase_completed");
  });

  test("emits checkout errors without sensitive Stripe data", () => {
    trackCheckoutError({
      ctaLocation: "quick_scan_card",
      analyzedDomain: "example.com",
      analysisId: "analysis_1",
      errorCode: 503,
    });

    expect(window.gtag).toHaveBeenCalledWith(
      "event",
      "checkout_error",
      expect.objectContaining({ error_code: 503, checkout_provider: "Stripe" })
    );
  });
});
