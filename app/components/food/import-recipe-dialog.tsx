import { useFetcher } from "react-router";
import { LinkIcon } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "~/components/ui/field";
import { Spinner } from "~/components/ui/spinner";
import { SaveErrors } from "./errors";
import type { SousErrorBody } from "~/lib/sous/api";
export function ImportRecipeDialog() {
  const fetcher = useFetcher<SousErrorBody>();
  const busy = fetcher.state !== "idle";
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <LinkIcon data-icon="inline-start" />
        Import with Sous
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send it to Sous</DialogTitle>
          <DialogDescription>
            Paste a recipe link. Sous will open a chat, match your ingredients,
            and save the recipe here. She'll ask if anything is unclear.
          </DialogDescription>
        </DialogHeader>
        <fetcher.Form
          method="post"
          action="/food/import"
          className="flex flex-col gap-4"
        >
          <SaveErrors error={fetcher.data} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="import-recipe-url">Recipe URL</FieldLabel>
              <Input
                id="import-recipe-url"
                type="url"
                name="url"
                required
                placeholder="https://…"
                disabled={busy}
              />
              <FieldDescription>
                Uses your configured default AI model. You can follow the import
                in chat.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner data-icon="inline-start" />}
            {busy ? "Opening Sous…" : "Import in chat"}
          </Button>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
