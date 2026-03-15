export type AvatarCropState = {
  imageWidth: number;
  imageHeight: number;
  frameSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function getAvatarBaseScale(imageWidth: number, imageHeight: number, frameSize: number) {
  if (!imageWidth || !imageHeight || !frameSize) {
    return 1;
  }

  return Math.max(frameSize / imageWidth, frameSize / imageHeight);
}

export function clampAvatarOffsets({
  imageWidth,
  imageHeight,
  frameSize,
  zoom,
  offsetX,
  offsetY
}: AvatarCropState) {
  const effectiveScale = getAvatarBaseScale(imageWidth, imageHeight, frameSize) * zoom;
  const displayedWidth = imageWidth * effectiveScale;
  const displayedHeight = imageHeight * effectiveScale;
  const maxOffsetX = Math.max(0, (displayedWidth - frameSize) / 2);
  const maxOffsetY = Math.max(0, (displayedHeight - frameSize) / 2);
  const clampValue = (value: number, maxValue: number) => {
    const clamped = Math.min(maxValue, Math.max(-maxValue, value));
    return Object.is(clamped, -0) ? 0 : clamped;
  };

  return {
    offsetX: clampValue(offsetX, maxOffsetX),
    offsetY: clampValue(offsetY, maxOffsetY)
  };
}

export function getAvatarSourceRect({
  imageWidth,
  imageHeight,
  frameSize,
  zoom,
  offsetX,
  offsetY
}: AvatarCropState) {
  const clamped = clampAvatarOffsets({
    imageWidth,
    imageHeight,
    frameSize,
    zoom,
    offsetX,
    offsetY
  });
  const effectiveScale = getAvatarBaseScale(imageWidth, imageHeight, frameSize) * zoom;
  const sourceWidth = frameSize / effectiveScale;
  const sourceHeight = frameSize / effectiveScale;
  const sourceLeft = imageWidth / 2 - (frameSize / 2 + clamped.offsetX) / effectiveScale;
  const sourceTop = imageHeight / 2 - (frameSize / 2 + clamped.offsetY) / effectiveScale;

  return {
    sourceX: Math.max(0, Math.min(imageWidth - sourceWidth, sourceLeft)),
    sourceY: Math.max(0, Math.min(imageHeight - sourceHeight, sourceTop)),
    sourceWidth,
    sourceHeight
  };
}
