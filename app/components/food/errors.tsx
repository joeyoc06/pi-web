import { useMemo } from "react";
import { Link } from "react-router";
import { Alert, AlertTitle, AlertDescription } from "~/components/ui/alert";
import { FieldError } from "~/components/ui/field";
import type { SousErrorBody } from "~/lib/sous/api";

export function SaveErrors({ error }: { error?: SousErrorBody | null }) {
  const fields = useMemo(
    () =>
      Object.entries(error?.details?.fieldErrors ?? {}).map(
        ([field, messages]) => (
          <li key={field}>
            <span className="font-medium">{field}</span>: {messages.join(" ")}
          </li>
        ),
      ),
    [error],
  );
  const blockers = useMemo(
    () =>
      error?.details?.blockers?.map((r) => (
        <li key={r.id}>
          <Link
            to={`/food/recipes/${r.id}`}
            className="underline underline-offset-4"
          >
            {r.title}
          </Link>
        </li>
      )),
    [error],
  );
  if (!error) return null;
  return (
    <Alert variant="destructive">
      <AlertTitle>{error.error}</AlertTitle>
      <AlertDescription>
        {fields.length > 0 && (
          <ul className="flex list-inside list-disc flex-col gap-1">
            {fields}
          </ul>
        )}
        {blockers && (
          <ul className="flex list-inside list-disc flex-col gap-1">
            {blockers}
          </ul>
        )}
        {error.code === "SLUG_CONFLICT" && error.details?.existingId && (
          <Link
            className="underline"
            to={`/food/recipes/${error.details.existingId}`}
          >
            Open existing recipe
          </Link>
        )}
      </AlertDescription>
    </Alert>
  );
}
export function InputError({
  errors,
  name,
}: {
  errors?: Record<string, string[]>;
  name: string;
}) {
  const message = useMemo(() => errors?.[name]?.join(" "), [errors, name]);
  return message ? <FieldError>{message}</FieldError> : null;
}
