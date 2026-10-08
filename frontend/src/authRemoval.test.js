import React, { act } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

jest.mock("./components/AnalysisResults", () => () => null);

describe("public V1 without legacy authentication", () => {
  let container;
  let root;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState({}, "", "/");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test("does not show login or logout controls", () => {
    act(() => root.render(<App />));

    expect(container.querySelector('[data-testid="login-btn"]')).toBeNull();
    expect(container.querySelector('[data-testid="logout-btn"]')).toBeNull();
    expect(container.querySelector('[data-testid="language-toggle"]')).not.toBeNull();
  });

  test("keeps analysis accessible while removing redundant floating controls", () => {
    act(() => root.render(<App />));

    expect(container.querySelector('[data-testid="analyze-btn"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="floating-try-btn"]')).toBeNull();
    expect(container.querySelector('[data-testid="floating-unlock-btn"]')).toBeNull();
    expect(container.querySelector('[data-testid="chat-widget-btn"]')).toBeNull();
  });

  test("preserves the commercial destinations and opens the agent form without checkout", () => {
    act(() => root.render(<App />));
    expect(container.querySelector('[data-testid="ladder-49-cta"]').href).toBe("https://buy.stripe.com/28E7sMbKhelIeUN8Tq63K00");
    expect(container.querySelector('[data-testid="ladder-499-cta"]').tagName).toBe("BUTTON");
    act(() => container.querySelector('[data-testid="ladder-499-cta"]').click());
    expect(container.querySelector('[data-testid="agent-lead-modal"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="agent-lead-modal"] input[name="first_name"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="agent-lead-modal"] input[name="privacy_consent"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="agent-lead-modal"] a[href="/legal/privacidad"]')).not.toBeNull();
    expect(container.textContent).toContain("REPRESENTACIÓN DEL SERVICIO");
    expect(container.textContent).toContain("DEMO");
  });

  test("legacy OAuth fragments stay on the public landing page", () => {
    window.history.replaceState({}, "", "/#session_id=legacy_oauth_value");

    act(() => root.render(<App />));

    expect(container.querySelector('[data-testid="hero-section"]')).not.toBeNull();
    expect(window.location.hostname).not.toBe("auth.emergentagent.com");
  });
});

