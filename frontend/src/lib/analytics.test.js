import { getPageParams, trackEventOnce } from "./analytics";

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
    trackEventOnce("purchase_completed", "session_1", {});
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
    trackEventOnce("purchase_completed", "purchase_1", params);

    expect(params.page_location).toBe(`${window.location.origin}/payment-success`);
    expect(params.page_path).toBe("/payment-success");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("session_id");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("cs_test_sensitive");
    expect(JSON.stringify(window.gtag.mock.calls)).not.toContain("premium_sensitive");
  });
});
