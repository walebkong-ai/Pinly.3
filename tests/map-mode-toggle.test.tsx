import React from "react";
import { describe, expect, test } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MapModeToggle } from "@/components/map/map-mode-toggle";

describe("MapModeToggle", () => {
  test("renders dedicated toolbox styling hooks so bottom-nav styles do not bleed into it", () => {
    const html = renderToStaticMarkup(<MapModeToggle value="default" onChange={() => {}} />);

    expect(html).toContain('data-pinly-map-toolbox="true"');
    expect(html).toContain('class="pinly-map-toolbox-button"');
    expect(html).toContain('data-state="default"');
    expect(html).toContain('data-availability="available"');
    expect(html).toContain('class="pinly-map-toolbox-button__icon"');
    expect(html).toContain("pinly-map-toolbox-button__status pinly-map-toolbox-button__status--inactive");
  });

  test("keeps the active satellite state and availability messaging intact", () => {
    const html = renderToStaticMarkup(<MapModeToggle value="satellite" onChange={() => {}} satelliteAvailability="failed" />);

    expect(html).toContain('data-state="satellite"');
    expect(html).toContain('data-availability="failed"');
    expect(html).toContain('aria-label="Satellite view is temporarily unavailable"');
    expect(html).toContain('title="Satellite is unavailable right now"');
    expect(html).toContain("pinly-map-toolbox-button__status pinly-map-toolbox-button__status--active");
  });
});
