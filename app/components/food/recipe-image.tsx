import { useCallback, useState } from "react";
import { CookingPotIcon } from "lucide-react";

export function RecipeImage({ src, title }: { src?: string; title: string }) {
  const [failed, setFailed] = useState<string>();
  const handleError = useCallback(() => setFailed(src), [src]);
  if (!src || failed === src)
    return (
      <div
        role="img"
        className="flex aspect-[16/10] items-center justify-center bg-muted"
        aria-label={`No photo for ${title}`}
      >
        <CookingPotIcon
          className="size-12 text-muted-foreground/50"
          strokeWidth={1}
          aria-hidden="true"
        />
      </div>
    );
  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={handleError}
      className="aspect-[16/10] w-full object-cover"
    />
  );
}
