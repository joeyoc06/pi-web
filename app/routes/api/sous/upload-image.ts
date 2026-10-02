import type { Route } from "./+types/upload-image";
import { validateImageFile, saveImageFile } from "~/services/sous/image-upload.server";
import { api, ok, methodNotAllowed } from "~/services/sous/http.server";
import { SousError } from "~/services/sous/errors.server";

export async function action({ request }: Route.ActionArgs) {
  return api(async () => {
    if (request.method !== "POST") {
      return methodNotAllowed("POST");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const slug = formData.get("slug");

    if (typeof slug !== "string" || !slug.trim()) {
      throw new SousError(
        400,
        "MISSING_SLUG",
        "Recipe slug is required.",
        { fieldErrors: { slug: ["Slug is required."] } },
      );
    }
    const safeSlug = slug.trim();
    if (safeSlug.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(safeSlug)) {
      throw new SousError(
        400,
        "INVALID_SLUG",
        "Use a recipe slug containing lowercase letters, numbers, and single hyphens.",
        { fieldErrors: { slug: ["Enter a valid recipe slug before uploading."] } },
      );
    }

    if (!file || !(file instanceof File)) {
      throw new SousError(
        400,
        "MISSING_FILE",
        "Image file is required.",
        { fieldErrors: { file: ["Image file is required."] } },
      );
    }

    // Validate file
    await validateImageFile(file);

    // Read file into buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Save and get URL
    const imageUrl = await saveImageFile(buffer, safeSlug, file.type);

    return ok({ imageUrl });
  });
}
