import { useCallback, useMemo, useRef, useState } from "react";
import { XIcon, UploadIcon, CookingPotIcon } from "lucide-react";
import { Field, FieldLabel, FieldDescription } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import { Button } from "~/components/ui/button";
import { InputError } from "./errors";
import { label as optionLabel } from "~/lib/sous/display";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  errors?: Record<string, string[]>;
  hint?: string;
  placeholder?: string;
};
export function TextField({
  name,
  label,
  value,
  onChange,
  errors,
  hint,
  multiline,
  type = "text",
  placeholder,
}: Props & { multiline?: boolean; type?: "text" | "number" | "url" }) {
  const id = useMemo(() => `recipe-${name}`, [name]);
  const errorId = useMemo(() => `${id}-error`, [id]);
  return (
    <Field data-invalid={!!errors?.[name]}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          aria-invalid={!!errors?.[name]}
          aria-describedby={errorId}
          placeholder={placeholder}
        />
      ) : (
        <Input
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          step="any"
          min={type === "number" ? 0 : undefined}
          aria-invalid={!!errors?.[name]}
          aria-describedby={errorId}
          placeholder={placeholder}
        />
      )}
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <div id={errorId}>
        <InputError errors={errors} name={name} />
      </div>
    </Field>
  );
}
export function SelectField({
  name,
  label,
  value,
  onChange,
  errors,
  options,
  hint,
}: Props & { options: readonly string[] }) {
  const id = useMemo(() => `recipe-${name}`, [name]);
  const items = useMemo(
    () =>
      options.map((value) => (
        <NativeSelectOption key={value} value={value}>
          {optionLabel(value)}
        </NativeSelectOption>
      )),
    [options],
  );
  return (
    <Field data-invalid={!!errors?.[name]}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={!!errors?.[name]}
      >
        {items}
      </NativeSelect>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <InputError errors={errors} name={name} />
    </Field>
  );
}

type ImageUploadFieldProps = {
  imageUrl: string;
  slug: string;
  onImageUrlChange: (url: string) => void;
  errors?: Record<string, string[]>;
};

export function ImageUploadField({
  imageUrl,
  slug,
  onImageUrlChange,
  errors,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [useUrl, setUseUrl] = useState(!imageUrl.startsWith("/food/images/"));

  const displayUrl = useMemo(() => preview || imageUrl, [preview, imageUrl]);
  const showPreview =
    !!displayUrl &&
    (displayUrl.startsWith("/") ||
      displayUrl.startsWith("http") ||
      displayUrl.startsWith("data:"));

  const handleChooseFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      input.value = "";
      if (!file) return;
      if (!slug.trim()) {
        setUploadError("Add a valid recipe slug before uploading an image.");
        return;
      }

      setUploading(true);
      setUploadError(null);

      // Show the local preview immediately, then upload the selected file.
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result;
        if (typeof dataUrl !== "string") {
          setUploadError("Could not read the selected image.");
          setUploading(false);
          return;
        }
        setPreview(dataUrl);

        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("slug", slug.trim());

          const response = await fetch("/api/sous/upload-image", {
            method: "POST",
            body: formData,
          });
          const result = await response.json();
          if (!response.ok || !result.ok) {
            setUploadError(result.error || `Image upload failed (${response.status}).`);
            return;
          }
          onImageUrlChange(result.data.imageUrl);
          setUseUrl(false);
        } catch {
          setUploadError("Image upload failed. Check the connection and try again.");
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Could not read the selected image.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    },
    [slug, onImageUrlChange],
  );

  const handleClearImage = useCallback(() => {
    onImageUrlChange("");
    setPreview(null);
    setUploadError(null);
    setUseUrl(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onImageUrlChange]);

  const handleUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setUploadError(null);
      onImageUrlChange(event.target.value);
    },
    [onImageUrlChange],
  );

  return (
    <Field data-invalid={!!errors?.imageUrl}>
      <FieldLabel>Image (optional)</FieldLabel>
      <div className="flex flex-col gap-4">
        {showPreview && (
          <div className="relative flex items-center justify-center overflow-hidden rounded-lg bg-muted">
            <img
              src={displayUrl}
              alt="Preview"
              className="aspect-[16/10] w-full object-cover"
            />
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="absolute top-2 right-2 bg-background/90 hover:bg-background"
              onClick={handleClearImage}
              disabled={uploading}
            >
              <XIcon className="size-4" />
              Clear
            </Button>
          </div>
        )}

        {!showPreview && (
          <div className="flex flex-col gap-3 rounded-lg border-2 border-dashed border-border p-6">
            <div className="flex items-center justify-center">
              <CookingPotIcon className="size-8 text-muted-foreground/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Upload a photo</p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, GIF, or WebP (max 5MB)
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleChooseFile}
            disabled={uploading}
          >
            <UploadIcon className="size-4" />
            {uploading ? "Uploading..." : "Choose file"}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload recipe image"
          />
        </div>

        <div className="border-t pt-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={useUrl}
              onChange={() => setUseUrl(true)}
              className="size-3"
            />
            <span>Or paste image URL</span>
          </label>
          {useUrl && (
            <Input
              type="url"
              value={imageUrl}
              onChange={handleUrlChange}
              placeholder="https://…"
              className="mt-2"
              aria-invalid={!!errors?.imageUrl}
            />
          )}
        </div>
      </div>

      <InputError errors={errors} name="imageUrl" />
      {uploadError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}
    </Field>
  );
}
