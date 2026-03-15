"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Move, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clampAvatarOffsets, getAvatarBaseScale, getAvatarSourceRect } from "@/lib/avatar-crop";

const FRAME_SIZE = 224;
const OUTPUT_SIZE = 512;

type AvatarPhotoEditorProps = {
  file: File;
  name: string;
  onCancel: () => void;
  onSave: (file: File) => Promise<void>;
};

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

export function AvatarPhotoEditor({
  file,
  name,
  onCancel,
  onSave
}: AvatarPhotoEditorProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMeta, setImageMeta] = useState<ImageMeta | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const nextUrl = URL.createObjectURL(file);
    setImageUrl(nextUrl);
    setImageMeta(null);
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);

    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [file]);

  const imageWidth = imageMeta?.width ?? 0;
  const imageHeight = imageMeta?.height ?? 0;
  const clampedOffsets = clampAvatarOffsets({
    imageWidth,
    imageHeight,
    frameSize: FRAME_SIZE,
    zoom,
    offsetX,
    offsetY
  });
  const effectiveScale = getAvatarBaseScale(imageWidth, imageHeight, FRAME_SIZE) * zoom;

  function handleZoomChange(nextZoom: number) {
    const nextOffsets = clampAvatarOffsets({
      imageWidth,
      imageHeight,
      frameSize: FRAME_SIZE,
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

    const nextOffsets = clampAvatarOffsets({
      imageWidth,
      imageHeight,
      frameSize: FRAME_SIZE,
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

    try {
      const crop = getAvatarSourceRect({
        imageWidth,
        imageHeight,
        frameSize: FRAME_SIZE,
        zoom,
        offsetX: clampedOffsets.offsetX,
        offsetY: clampedOffsets.offsetY
      });
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Avatar editor is unavailable on this device.");
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
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Could not prepare your avatar.");
      }

      const nextFileName = file.name.replace(/\.[^.]+$/, "") || "avatar";
      await onSave(new File([blob], `${nextFileName}-avatar.jpg`, { type: "image/jpeg" }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 rounded-[1.5rem] border bg-[var(--surface-strong)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--foreground)]">Preview your avatar</p>
          <p className="mt-1 text-xs leading-5 text-[var(--foreground)]/58">
            Drag to reposition and pinch-style zoom with the slider before saving.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-soft)] px-3 py-1.5 text-xs text-[var(--foreground)]/58">
          <Move className="h-3.5 w-3.5" />
          Final circle preview
        </div>
      </div>

      <div className="mt-5 flex flex-col items-center gap-4">
        <div
          className="relative flex h-[240px] w-[240px] items-center justify-center rounded-[2rem] border border-[var(--foreground)]/10 bg-[var(--surface-soft)] p-2"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          style={{ touchAction: "none" }}
        >
          <div className="absolute inset-4 rounded-full border border-white/80 shadow-[0_0_0_999px_rgba(24,85,56,0.08)]" />
          <div className="relative h-full w-full overflow-hidden rounded-full bg-[var(--surface-strong)] shadow-inner">
            {imageUrl ? (
              <img
                ref={imageRef}
                src={imageUrl}
                alt={`${name} avatar preview`}
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
            ) : null}
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-[var(--surface-strong)]/95 px-2.5 py-1 text-[11px] font-medium text-[var(--foreground)] shadow-sm">
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
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
            className="w-full accent-[var(--map-accent)]"
          />
          <div className="flex items-center justify-center gap-3 text-xs text-[var(--foreground)]/52">
            <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border bg-[var(--surface-strong)]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
                  draggable={false}
                  style={{
                    width: imageWidth || undefined,
                    height: imageHeight || undefined,
                    transform: `translate(calc(-50% + ${clampedOffsets.offsetX / 3}px), calc(-50% + ${clampedOffsets.offsetY / 3}px)) scale(${effectiveScale ? effectiveScale / 3 : 1})`,
                    transformOrigin: "center center"
                  }}
                />
              ) : null}
            </span>
            <span>Small preview</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void handleSave()} disabled={!imageMeta || saving}>
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save photo
        </Button>
      </div>
    </div>
  );
}
