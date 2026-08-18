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

  test("legacy OAuth fragments stay on the public landing page", () => {
    window.history.replaceState({}, "", "/#session_id=legacy_oauth_value");

    act(() => root.render(<App />));

    expect(container.querySelector('[data-testid="hero-section"]')).not.toBeNull();
    expect(window.location.hostname).not.toBe("auth.emergentagent.com");
  });
});
