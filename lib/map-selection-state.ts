export function getSelectedMapMarkerId({
  expandedPostMarkerId,
  popupMarkerId,
  selectedLocationMarkerId
}: {
  expandedPostMarkerId: string | null;
  popupMarkerId: string | null;
  selectedLocationMarkerId: string | null;
}) {
  return selectedLocationMarkerId ?? expandedPostMarkerId ?? popupMarkerId ?? null;
}

export function shouldDismissMapPopup({
  expandedPostId,
  selectedLocationMarkerId
}: {
  expandedPostId: string | null;
  selectedLocationMarkerId: string | null;
}) {
  return expandedPostId !== null || selectedLocationMarkerId !== null;
}
