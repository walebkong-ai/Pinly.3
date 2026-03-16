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
        popupMarkerId: null,
        selectedLocationMarkerId: null
      })
    ).toBeNull();
  });

  test("prioritizes the same-location cluster while that sheet is open", () => {
    expect(
      getSelectedMapMarkerId({
        popupMarkerId: "pin-post-42",
        selectedLocationMarkerId: "place-cluster-7"
      })
    ).toBe("place-cluster-7");
  });

  test("keeps the tapped preview pin selected only while the popup itself is open", () => {
    expect(
      getSelectedMapMarkerId({
        popupMarkerId: "pin-post-42",
        selectedLocationMarkerId: null
      })
    ).toBe("pin-post-42");
  });
});
