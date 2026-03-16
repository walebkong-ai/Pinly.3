import { describe, expect, test } from "vitest";
import { getSelectedMapMarkerId, shouldDismissMapPopup } from "@/lib/map-selection-state";

describe("map selection state", () => {
  test("keeps popup-owned pin selection separate from expanded memory state", () => {
    expect(
      shouldDismissMapPopup({
        expandedPostId: "post-42",
        selectedLocationMarkerId: null
      })
    ).toBe(true);

    expect(
      getSelectedMapMarkerId({
        expandedPostMarkerId: null,
        popupMarkerId: null,
        selectedLocationMarkerId: null
      })
    ).toBeNull();
  });

  test("prioritizes the same-location cluster while that sheet is open", () => {
    expect(
      getSelectedMapMarkerId({
        expandedPostMarkerId: "bubble-post-42",
        popupMarkerId: "pin-post-42",
        selectedLocationMarkerId: "place-cluster-7"
      })
    ).toBe("place-cluster-7");
  });

  test("keeps the tapped preview pin selected only while the popup itself is open", () => {
    expect(
      getSelectedMapMarkerId({
        expandedPostMarkerId: null,
        popupMarkerId: "pin-post-42",
        selectedLocationMarkerId: null
      })
    ).toBe("pin-post-42");
  });

  test("keeps the expanded standalone post marker selected while the bottom sheet is open", () => {
    expect(
      getSelectedMapMarkerId({
        expandedPostMarkerId: "bubble-post-42",
        popupMarkerId: null,
        selectedLocationMarkerId: null
      })
    ).toBe("bubble-post-42");
  });
});
