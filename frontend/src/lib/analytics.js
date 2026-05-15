const ASSET_NAME = "MejoraTuWeb";
const CHECKOUT = {
  price: 6.99,
  currency: "EUR",
  item_name: "Informe completo",
  item_category: "auditoria_web",
  checkout_provider: "Stripe",
};

export function getPageParams() {
  if (typeof window === "undefined") {
    return { asset_name: ASSET_NAME };
  }

  return {
    asset_name: ASSET_NAME,
    page_url: window.location.href,
    page_title: document.title,
  };
}

export function getAnalyzedDomain(input) {
  if (!input || typeof input !== "string") return undefined;

  try {
    const trimmed = input.trim();
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    return new URL(withProtocol).hostname.replace(/^www\./i, "");
  } catch (_) {
    return undefined;
  }
}

export function cleanParams(params = {}) {
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
  } catch (_) {
    // Analytics must never break the user experience.
  }
}

export function getCheckoutParams(extraParams = {}) {
  return cleanParams({
    ...getPageParams(),
    ...CHECKOUT,
    value: CHECKOUT.price,
    ...extraParams,
  });
}

export function trackCheckoutClick({ ctaText, ctaLocation, destinationUrl, analyzedDomain }) {
  const baseParams = getCheckoutParams({
    analyzed_domain: analyzedDomain,
    destination_url: destinationUrl,
  });

  trackEvent("unlock_report_click", {
    ...baseParams,
    cta_text: ctaText,
    cta_location: ctaLocation,
  });

  trackEvent("begin_checkout", baseParams);
}
