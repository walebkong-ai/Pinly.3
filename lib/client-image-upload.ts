"use client";

const IMAGE_UPLOAD_OPTIMIZATION_THRESHOLD_BYTES = 1_500_000;
const IMAGE_UPLOAD_MAX_DIMENSION = 2048;
const IMAGE_UPLOAD_OUTPUT_QUALITY = 0.82;
const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DecodedImage = {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  dispose: () => void;
};

function buildOptimizedFileName(name: string, mimeType: string) {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/webp" ? "webp" : "png";
  const basename = name.includes(".") ? name.slice(0, name.lastIndexOf(".")) : name;
  return `${basename}.${extension}`;
}

async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof window === "undefined") {
    return null;
  }

  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(context, width, height) {
          context.drawImage(bitmap, 0, 0, width, height);
        },
        dispose() {
          bitmap.close();
        }
      };
    } catch {
      // Fall back to an HTMLImageElement below when createImageBitmap is unavailable or fails.
    }
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Could not decode the selected image."));
      nextImage.src = objectUrl;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
      draw(context, width, height) {
        context.drawImage(image, 0, 0, width, height);
      },
      dispose() {}
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export async function optimizeImageForUpload(file: File) {
  if (!OPTIMIZABLE_IMAGE_TYPES.has(file.type.toLowerCase())) {
    return file;
  }

  const decodedImage = await decodeImage(file);

  if (!decodedImage) {
    return file;
  }

  try {
    const longestSide = Math.max(decodedImage.width, decodedImage.height);
    const scale = longestSide > IMAGE_UPLOAD_MAX_DIMENSION ? IMAGE_UPLOAD_MAX_DIMENSION / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(decodedImage.width * scale));
    const targetHeight = Math.max(1, Math.round(decodedImage.height * scale));
    const resized = targetWidth !== decodedImage.width || targetHeight !== decodedImage.height;

    if (!resized && file.size <= IMAGE_UPLOAD_OPTIMIZATION_THRESHOLD_BYTES) {
      return file;
    }

    if (typeof document === "undefined") {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return file;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    decodedImage.draw(context, targetWidth, targetHeight);

    const outputType = file.type === "image/webp" ? "image/webp" : file.type === "image/png" ? "image/png" : "image/jpeg";
    const optimizedBlob = await canvasToBlob(
      canvas,
      outputType,
      outputType === "image/png" ? undefined : IMAGE_UPLOAD_OUTPUT_QUALITY
    );

    if (!optimizedBlob) {
      return file;
    }

    if (!resized && optimizedBlob.size >= file.size * 0.95) {
      return file;
    }

    return new File([optimizedBlob], buildOptimizedFileName(file.name, outputType), {
      type: outputType,
      lastModified: file.lastModified
    });
  } finally {
    decodedImage.dispose();
  }
}
