"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, LoaderCircle, Move, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampCoverImageOffsets, getCoverImageBaseScale, getCoverImageSourceRect } from "@/lib/cover-image-crop";
import {
  DEFAULT_POST_MEDIA_ASPECT_RATIO,
  POST_MEDIA_FRAME_DEFINITIONS,
  getInitialPostMediaAspectRatioForImage,
  getPostMediaFrameDefinition,
  type PostMediaAspectRatio
} from "@/lib/post-display";

const MAX_FRAME_WIDTH = 288;
const MAX_FRAME_HEIGHT = 360;

type ImageMeta = {
  width: number;
  height: number;
};

export type PostPhotoEditMetadata = {
  mediaAspectRatio: PostMediaAspectRatio;
  mediaWidth: number;
  mediaHeight: number;
  cropZoom: number;
  cropOffsetX: number;
  cropOffsetY: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startOffsetX: number;
  startOffsetY: number;
};

type PostPhotoEditorProps = {
  file: File;
  onCancel: () => void;
  onSave: (file: File, metadata: PostPhotoEditMetadata) => Promise<void>;
};

function getPreviewFrameSize(aspectRatio: number) {
  if (aspectRatio >= 1) {
    return {
      width: MAX_FRAME_WIDTH,
      height: Math.round(MAX_FRAME_WIDTH / aspectRatio)
    };
  }

  const height = Math.min(MAX_FRAME_HEIGHT, Math.round(MAX_FRAME_WIDTH / aspectRatio));

  return {
    width: Math.round(height * aspectRatio),
    height
  };
}

async function createCropSourceObjectUrl(file: File) {
  return URL.createObjectURL(file);
}

export function PostPhotoEditor({ file, onCancel, onSave }: PostPhotoEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<PostMediaAspectRatio>(DEFAULT_POST_MEDIA_ASPECT_RATIO);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let nextUrl = "";

    void createCropSourceObjectUrl(file)
      .catch(() => URL.createObjectURL(file))
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        nextUrl = url;
        setImageUrl(url);
      });

    setImageUrl("");
    setImageMeta(null);
    setSelectedAspectRatio(DEFAULT_POST_MEDIA_ASPECT_RATIO);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setErrorMessage(null);

    return () => {
      active = false;

      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [file]);

  const selectedFrame = getPostMediaFrameDefinition(selectedAspectRatio) ?? POST_MEDIA_FRAME_DEFINITIONS[1];
  const previewFrame = getPreviewFrameSize(selectedFrame.ratio);
  const frameWidth = previewFrame.width;
  const frameHeight = previewFrame.height;
  const imageWidth = imageMeta?.width ?? 0;
  const imageHeight = imageMeta?.height ?? 0;
  const clampedOffsets = clampCoverImageOffsets({
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    zoom,
    offsetX,
    offsetY
  });
  const effectiveScale = getCoverImageBaseScale(imageWidth, imageHeight, frameWidth, frameHeight) * zoom;

  function handleAspectRatioChange(nextAspectRatio: PostMediaAspectRatio) {
    const nextFrame = getPostMediaFrameDefinition(nextAspectRatio) ?? selectedFrame;
    const nextPreviewFrame = getPreviewFrameSize(nextFrame.ratio);
    const nextOffsets = clampCoverImageOffsets({
      imageWidth,
      imageHeight,
      frameWidth: nextPreviewFrame.width,
      frameHeight: nextPreviewFrame.height,
      zoom,
      offsetX,
      offsetY
    });

    setSelectedAspectRatio(nextAspectRatio);
    setOffsetX(nextOffsets.offsetX);
    setOffsetY(nextOffsets.offsetY);
  }

  function handleZoomChange(nextZoom: number) {
    const nextOffsets = clampCoverImageOffsets({
      imageWidth,
      imageHeight,
      frameWidth,
      frameHeight,
      zoom: nextZoom,
      offsetX,
      offsetY
    });

    setZoom(nextZoom);
    setOffsetX(nextOffsets.offsetX);
    setOffsetY(nextOffsets.offsetY);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!imageMeta) {
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: clampedOffsets.offsetX,
      startOffsetY: clampedOffsets.offsetY
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextOffsets = clampCoverImageOffsets({
      imageWidth,
      imageHeight,
      frameWidth,
      frameHeight,
      zoom,
      offsetX: dragRef.current.startOffsetX + (event.clientX - dragRef.current.startX),
      offsetY: dragRef.current.startOffsetY + (event.clientY - dragRef.current.startY)
    });

    setOffsetX(nextOffsets.offsetX);
    setOffsetY(nextOffsets.offsetY);
  }

  function endDrag(event: React.PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  async function handleSave() {
    if (!imageMeta || !imageRef.current) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const crop = getCoverImageSourceRect({
        imageWidth,
        imageHeight,
        frameWidth,
        frameHeight,
        zoom,
        offsetX: clampedOffsets.offsetX,
        offsetY: clampedOffsets.offsetY
      });
      const canvas = document.createElement("canvas");
      canvas.width = selectedFrame.outputWidth;
      canvas.height = selectedFrame.outputHeight;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Photo editing is unavailable on this device.");
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        imageRef.current,
        crop.sourceX,
        crop.sourceY,
        crop.sourceWidth,
        crop.sourceHeight,
        0,
        0,
        selectedFrame.outputWidth,
        selectedFrame.outputHeight
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.9);
      });

      if (!blob) {
        throw new Error("Could not prepare the cropped photo. Try again.");
      }

      const nextFileName = file.name.replace(/\.[^.]+$/, "") || "memory";
      await onSave(
        new File([blob], `${nextFileName}-post.jpg`, {
          type: "image/jpeg",
          lastModified: file.lastModified
        }),
        {
          mediaAspectRatio: selectedFrame.value,
          mediaWidth: selectedFrame.outputWidth,
          mediaHeight: selectedFrame.outputHeight,
          cropZoom: zoom,
          cropOffsetX: clampedOffsets.offsetX,
          cropOffsetY: clampedOffsets.offsetY
        }
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not prepare the cropped photo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="post-photo-editor" className="mt-6 rounded-[1.75rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Adjust your photo before posting</p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/58">
            Drag to reposition and use the slider to zoom. The confirmed crop becomes the photo Pinly uploads.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--foreground)]/58">
          <Crop className="h-3.5 w-3.5" />
          {selectedFrame.label} crop
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4">
        <div
          className="grid w-full grid-cols-4 rounded-full bg-[var(--surface-soft)] p-1 text-xs font-medium"
          role="radiogroup"
          aria-label="Post crop aspect ratio"
          data-testid="post-photo-editor-aspect-ratios"
        >
          {POST_MEDIA_FRAME_DEFINITIONS.map((frame) => {
            const selected = frame.value === selectedFrame.value;

            return (
              <button
                key={frame.value}
                type="button"
                role="radio"
                aria-checked={selected}
                data-testid={`post-photo-editor-aspect-${frame.value}`}
                onClick={() => handleAspectRatioChange(frame.value)}
                className={
                  selected
                    ? "min-h-10 rounded-full bg-[var(--surface-strong)] px-2 text-[var(--foreground)] shadow-sm"
                    : "min-h-10 rounded-full px-2 text-[var(--foreground)]/58 transition hover:text-[var(--foreground)]"
                }
              >
                <span className="block leading-4">{frame.label}</span>
                <span className="block text-[10px] leading-3 text-[var(--foreground)]/50">{frame.shortLabel}</span>
              </button>
            );
          })}
        </div>
        <div
          data-testid="post-photo-editor-frame"
          className="relative flex w-full max-w-[20rem] items-center justify-center rounded-[2rem] border border-[var(--foreground)]/10 bg-[var(--surface-soft)] p-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "none" }}
        >
          <div className="absolute inset-3 rounded-[1.5rem] border border-white/80 shadow-[0_0_0_999px_rgba(24,85,56,0.08)]" />
          <div
            className="relative overflow-hidden rounded-[1.4rem] bg-[var(--surface-strong)] shadow-inner transition-[width,height] duration-150 ease-out"
            style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}
          >
            {imageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Post photo crop preview"
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  draggable={false}
                  onLoad={(event) => {
                    const width = event.currentTarget.naturalWidth;
                    const height = event.currentTarget.naturalHeight;

                    setImageMeta({
                      width,
                      height
                    });
                    setSelectedAspectRatio(getInitialPostMediaAspectRatioForImage(width, height));
                  }}
                  style={{
                    width: imageWidth || undefined,
                    height: imageHeight || undefined,
                    transform: `translate(calc(-50% + ${clampedOffsets.offsetX}px), calc(-50% + ${clampedOffsets.offsetY}px)) scale(${effectiveScale || 1})`,
                    transformOrigin: "center center"
                  }}
                />
              </>
            ) : null}
          </div>
          <div className="pointer-events-none absolute bottom-5 right-5 rounded-full bg-[var(--surface-strong)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm">
            Drag photo
          </div>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[var(--foreground)]/65">
            <span className="inline-flex items-center gap-1.5">
              <ZoomIn className="h-3.5 w-3.5" />
              Zoom
            </span>
            <span>{zoom.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.01"
            aria-label="Zoom post photo"
            data-testid="post-photo-editor-zoom"
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
            className="w-full accent-[var(--map-accent)]"
          />
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--foreground)]/56">
            <Move className="h-3.5 w-3.5" />
            Keep the important detail centered in the frame.
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          type="button"
          data-testid="post-photo-editor-save"
          onClick={() => void handleSave()}
          disabled={!imageMeta || saving}
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Use cropped photo
        </Button>
      </div>
    </div>
  );
}
