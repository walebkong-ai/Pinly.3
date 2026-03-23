import { describe, expect, test } from "vitest";
import {
  buildNotificationDeepLink,
  buildNotificationMapLink,
  getPushNotificationBody,
  getPushNotificationTitle,
  resolvePushNavigationPath
} from "@/lib/push-notifications";

describe("push notification helpers", () => {
  test("builds a post deep link when a notification references a post", () => {
    expect(
      buildNotificationDeepLink({
        type: "POST_LIKED",
        postId: "post_123"
      })
    ).toBe("/posts/post_123");
  });

  test("builds a map deep link when coordinates are present", () => {
    expect(
      buildNotificationMapLink({
        postId: "post_123",
        latitude: 43.6532,
        longitude: -79.3832
      })
    ).toBe("/map?postId=post_123&lat=43.6532&lng=-79.3832");
  });

  test("falls back to a map path when that is the only destination in the payload", () => {
    expect(
      resolvePushNavigationPath({
        mapPath: "/map?postId=post_123&lat=43.6532&lng=-79.3832"
      })
    ).toBe("/map?postId=post_123&lat=43.6532&lng=-79.3832");
  });

  test("creates clear copy for likes and accepted friend requests", () => {
    expect(
      getPushNotificationTitle({
        type: "POST_LIKED",
        actorName: "Jordan"
      })
    ).toBe("Jordan liked your memory");

    expect(
      getPushNotificationBody({
        type: "FRIEND_REQUEST_ACCEPTED"
      })
    ).toBe("You can now see each other's memories.");
  });
});
