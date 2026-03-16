export function getSelectedMapMarkerId({
  popupMarkerId,
  selectedLocationMarkerId
}: {
  popupMarkerId: string | null;
  selectedLocationMarkerId: string | null;
}) {
  return selectedLocationMarkerId ?? popupMarkerId ?? null;
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
