import {
  clampCoverImageOffsets,
  getCoverImageBaseScale,
  getCoverImageSourceRect
} from "@/lib/cover-image-crop";

export type AvatarCropState = {
  imageWidth: number;
  imageHeight: number;
  frameSize: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export function getAvatarBaseScale(imageWidth: number, imageHeight: number, frameSize: number) {
  return getCoverImageBaseScale(imageWidth, imageHeight, frameSize, frameSize);
}

export function clampAvatarOffsets({
  imageWidth,
  imageHeight,
  frameSize,
  zoom,
  offsetX,
  offsetY
}: AvatarCropState) {
  return clampCoverImageOffsets({
    imageWidth,
    imageHeight,
    frameWidth: frameSize,
    frameHeight: frameSize,
    zoom,
    offsetX,
    offsetY
  });
}

export function getAvatarSourceRect({
  imageWidth,
  imageHeight,
  frameSize,
  zoom,
  offsetX,
  offsetY
}: AvatarCropState) {
  return getCoverImageSourceRect({
    imageWidth,
    imageHeight,
    frameWidth: frameSize,
    frameHeight: frameSize,
    zoom,
    offsetX,
    offsetY
  });
}
