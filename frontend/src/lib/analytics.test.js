import { trackEventOnce } from "./analytics";

describe("analytics deduplication", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.gtag = jest.fn();
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
});
