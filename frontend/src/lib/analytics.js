const CHECKOUT_PROVIDER = "Stripe";
const REPORT_ITEM = {
  item_id: "premium_web_report",
  item_name: "Informe completo MejoraTuWeb",
  price: 6.99,
  quantity: 1,
};

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

export function trackEvent(eventName, params = {}) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  try {
    window.gtag("event", eventName, cleanParams(params));
  } catch (error) {
    // Analytics nunca debe romper la experiencia de usuario.
    console.warn("GA4 event error", eventName, error);
  }
}

export function trackEventOnce(eventName, uniqueKey, params = {}) {
  const storageKey = `mtw_event_${eventName}_${uniqueKey}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    trackEvent(eventName, params);
    window.sessionStorage.setItem(storageKey, "1");
  } catch (_) {
    trackEvent(eventName, params);
  }
}

export function getPageParams() {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    page_location: `${window.location.origin}${window.location.pathname}`,
    page_path: window.location.pathname,
    page_title: document.title,
  };
}

export function getAnalyzedDomain(rawUrl = "") {
  try {
    const normalizedUrl = rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;
    return new URL(normalizedUrl).hostname.replace(/^www\./, "");
  } catch (_) {
    return rawUrl.trim();
  }
}

export function trackCheckoutClick({ ctaText, ctaLocation, analyzedDomain, analysisId } = {}) {
  const params = {
    ...getPageParams(),
    cta_text: ctaText,
    cta_location: ctaLocation,
    analyzed_domain: analyzedDomain,
    analysis_id: analysisId,
    checkout_provider: CHECKOUT_PROVIDER,
    currency: "EUR",
    value: 6.99,
    items: [REPORT_ITEM],
  };

  trackEventOnce("begin_checkout", analysisId || ctaLocation, params);
}

export function trackCheckoutError({ ctaLocation, analyzedDomain, analysisId, errorCode } = {}) {
  trackEvent("checkout_error", {
    ...getPageParams(),
    cta_location: ctaLocation,
    analyzed_domain: analyzedDomain,
    analysis_id: analysisId,
    checkout_provider: CHECKOUT_PROVIDER,
    error_code: errorCode,
  });
}

export function trackPurchase({ uniqueKey, transactionId, analyzedDomain, analysisId } = {}) {
  trackEventOnce("purchase", uniqueKey, {
    ...getPageParams(),
    transaction_id: transactionId,
    analysis_id: analysisId,
    analyzed_domain: analyzedDomain,
    currency: "EUR",
    value: 6.99,
    items: [REPORT_ITEM],
  });
}
