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

export function getPageParams() {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    page_location: window.location.href,
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

export function trackCheckoutClick({ ctaText, ctaLocation, destinationUrl, analyzedDomain } = {}) {
  const params = {
    ...getPageParams(),
    cta_text: ctaText,
    cta_location: ctaLocation,
    destination_url: destinationUrl,
    analyzed_domain: analyzedDomain,
    checkout_provider: CHECKOUT_PROVIDER,
    currency: "EUR",
  };

  trackEvent("unlock_report_click", params);
  trackEvent("begin_checkout", params);
}
