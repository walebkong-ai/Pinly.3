"use client";

import { useEffect, useRef, useState } from "react";
import { Crop, LoaderCircle, Move, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampCoverImageOffsets, getCoverImageBaseScale, getCoverImageSourceRect } from "@/lib/cover-image-crop";

const FRAME_WIDTH = 264;
const FRAME_HEIGHT = 330;
const OUTPUT_WIDTH = 1280;
const OUTPUT_HEIGHT = 1600;

type ImageMeta = {
  width: number;
  height: number;
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
  onSave: (file: File) => Promise<void>;
};

export function PostPhotoEditor({ file, onCancel, onSave }: PostPhotoEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setImageMeta(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setErrorMessage(null);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  const imageWidth = imageMeta?.width ?? 0;
  const imageHeight = imageMeta?.height ?? 0;
  const clampedOffsets = clampCoverImageOffsets({
    imageWidth,
    imageHeight,
    frameWidth: FRAME_WIDTH,
    frameHeight: FRAME_HEIGHT,
    zoom,
    offsetX,
    offsetY
  });
  const effectiveScale = getCoverImageBaseScale(imageWidth, imageHeight, FRAME_WIDTH, FRAME_HEIGHT) * zoom;

  function handleZoomChange(nextZoom: number) {
    const nextOffsets = clampCoverImageOffsets({
      imageWidth,
      imageHeight,
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
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
      frameWidth: FRAME_WIDTH,
      frameHeight: FRAME_HEIGHT,
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
        frameWidth: FRAME_WIDTH,
        frameHeight: FRAME_HEIGHT,
        zoom,
        offsetX: clampedOffsets.offsetX,
        offsetY: clampedOffsets.offsetY
      });
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = OUTPUT_HEIGHT;
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
        OUTPUT_WIDTH,
        OUTPUT_HEIGHT
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
        })
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
          4:5 post crop
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4">
        <div
          data-testid="post-photo-editor-frame"
          className="relative flex h-[354px] w-[288px] items-center justify-center rounded-[2rem] border border-[var(--foreground)]/10 bg-[var(--surface-soft)] p-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "none" }}
        >
          <div className="absolute inset-3 rounded-[1.5rem] border border-white/80 shadow-[0_0_0_999px_rgba(24,85,56,0.08)]" />
          <div className="relative h-[330px] w-[264px] overflow-hidden rounded-[1.4rem] bg-[var(--surface-strong)] shadow-inner">
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
                    setImageMeta({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight
                    });
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
