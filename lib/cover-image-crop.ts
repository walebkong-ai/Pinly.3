export type CoverImageCropState = {
  imageWidth: number;
  imageHeight: number;
  frameWidth: number;
  frameHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function getCoverImageBaseScale(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number) {
  if (!imageWidth || !imageHeight || !frameWidth || !frameHeight) {
    return 1;
  }

  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function clampCoverImageOffsets({
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  zoom,
  offsetX,
  offsetY
}: CoverImageCropState) {
  const effectiveScale = getCoverImageBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) * zoom;
  const displayedWidth = imageWidth * effectiveScale;
  const displayedHeight = imageHeight * effectiveScale;
  const maxOffsetX = Math.max(0, (displayedWidth - frameWidth) / 2);
  const maxOffsetY = Math.max(0, (displayedHeight - frameHeight) / 2);
  const clampValue = (value: number, maxValue: number) => {
    const clamped = Math.min(maxValue, Math.max(-maxValue, value));
    return Object.is(clamped, -0) ? 0 : clamped;
  };

  return {
    offsetX: clampValue(offsetX, maxOffsetX),
    offsetY: clampValue(offsetY, maxOffsetY)
  };
}

export function getCoverImageSourceRect({
  imageWidth,
  imageHeight,
  frameWidth,
  frameHeight,
  zoom,
  offsetX,
  offsetY
}: CoverImageCropState) {
  const clamped = clampCoverImageOffsets({
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    zoom,
    offsetX,
    offsetY
  });
  const effectiveScale = getCoverImageBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) * zoom;
  const sourceWidth = frameWidth / effectiveScale;
  const sourceHeight = frameHeight / effectiveScale;
  const sourceLeft = imageWidth / 2 - (frameWidth / 2 + clamped.offsetX) / effectiveScale;
  const sourceTop = imageHeight / 2 - (frameHeight / 2 + clamped.offsetY) / effectiveScale;

  return {
    sourceX: Math.max(0, Math.min(imageWidth - sourceWidth, sourceLeft)),
    sourceY: Math.max(0, Math.min(imageHeight - sourceHeight, sourceTop)),
    sourceWidth,
    sourceHeight
  };
}
