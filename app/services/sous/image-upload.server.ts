import * as fs from "fs";
import * as path from "path";
import { SousError } from "./errors.server";

const UPLOAD_DIR = path.resolve(process.cwd(), "public/food/images");
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

function getExtensionFromType(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mimeType] || "";
}

export async function validateImageFile(file: {
  size: number;
  type: string;
}): Promise<void> {
  if (file.size > MAX_FILE_SIZE) {
    throw new SousError(
      400,
      "FILE_TOO_LARGE",
      `Image must be under 5MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
      { fieldErrors: { imageFile: ["File is too large."] } }
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new SousError(
      400,
      "INVALID_FILE_TYPE",
      `Image must be JPEG, PNG, GIF, or WebP (got ${file.type}).`,
      { fieldErrors: { imageFile: ["Unsupported image format."] } }
    );
  }
}

export async function saveImageFile(
  fileBuffer: Buffer,
  slug: string,
  mimeType: string
): Promise<string> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 200) {
    throw new SousError(400, "INVALID_SLUG", "Invalid recipe slug.");
  }
  const ext = getExtensionFromType(mimeType);
  if (!ext) {
    throw new SousError(
      400,
      "INVALID_FILE_TYPE",
      "Unable to determine file type."
    );
  }

  // Ensure upload directory exists
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // Build filename and full path
  const filename = `${slug}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);

  // Write file
  fs.writeFileSync(fullPath, fileBuffer);

  // Return relative URL path
  return `/food/images/${filename}`;
}

export function deleteImageFile(imageUrl: string | null | undefined): void {
  if (!imageUrl || !imageUrl.startsWith("/food/images/")) {
    return; // Not a local image, skip
  }

  const filename = path.basename(imageUrl);
  const fullPath = path.join(UPLOAD_DIR, filename);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    // Log but don't throw - deletion failures shouldn't fail the recipe operation
    console.error(`Failed to delete image at ${fullPath}:`, error);
  }
}
