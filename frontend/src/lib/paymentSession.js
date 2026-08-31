export const isValidCheckoutSessionId = (sessionId) =>
  /^cs_(test|live)_[A-Za-z0-9_]+$/.test(sessionId || "");
