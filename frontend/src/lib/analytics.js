const CHECKOUT_PROVIDER = "Stripe";

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
  };

  trackEventOnce("checkout_started", analysisId || ctaLocation, params);
}
