import { getToken } from "next-auth/jwt";
import { StorageConfigError, assertStorageConfiguration, getMaxUploadSizeBytes, inferMediaType, saveUploadedFile } from "@/lib/storage";
import { apiError } from "@/lib/api";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const useSecureCookies = process.env.NODE_ENV === "production" || request.url.startsWith("https://");
  const cookieName = useSecureCookies ? "__Secure-authjs.session-token" : "authjs.session-token";

  const token = await getToken({ 
    req: request, 
    secret: process.env.AUTH_SECRET || "",
    cookieName,
    salt: cookieName,
    secureCookie: useSecureCookies
  });

  if (!token?.id) {
    return apiError("Unauthorized", 401);
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch (error) {
    return apiError("Upload payload could not be parsed.", 400, {
      code: "UPLOAD_INVALID_MULTIPART",
      details: error instanceof Error ? error.message : "Unknown multipart parse failure"
    });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return apiError("No file uploaded.", 400, { code: "UPLOAD_MISSING_FILE" });
  }

  let maxSize = 0;

  try {
    assertStorageConfiguration();
    maxSize = getMaxUploadSizeBytes();
  } catch (error) {
    if (error instanceof StorageConfigError) {
      return apiError("Upload storage is misconfigured.", 500, {
        code: "UPLOAD_STORAGE_MISCONFIGURED",
        details: error.message
      });
    }

    return apiError("Upload storage is unavailable.", 500, {
      code: "UPLOAD_STORAGE_UNAVAILABLE"
    });
  }

  if (file.size > maxSize) {
    return apiError("File is too large.", 413, {
      code: "UPLOAD_TOO_LARGE",
      details: `Upload limit is ${Math.round(maxSize / (1024 * 1024))} MB.`
    });
  }

  try {
    const mediaType = inferMediaType(file);
    const mediaUrl = await saveUploadedFile(file);

    return Response.json({
      mediaUrl,
      mediaType,
      thumbnailUrl: null
    });
  } catch (error) {
    console.error(error);

    if (error instanceof Error && error.message === "Unsupported file type") {
      return apiError("Only images and videos are supported.", 415, {
        code: "UPLOAD_UNSUPPORTED_FILE_TYPE"
      });
    }

    if (error instanceof StorageConfigError) {
      return apiError("Upload storage is misconfigured.", 500, {
        code: "UPLOAD_STORAGE_MISCONFIGURED",
        details: error.message
      });
    }

    return apiError("Upload failed while saving the file.", 500, {
      code: "UPLOAD_SAVE_FAILED",
      details: error instanceof Error ? error.message : "Unknown upload failure"
    });
  }
}
