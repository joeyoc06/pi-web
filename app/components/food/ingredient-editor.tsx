import { useCallback, useEffect, useMemo, useRef } from "react";
import { useFetcher } from "react-router";
import type { Ingredient } from "~/lib/sous/types";
import type { SousErrorBody } from "~/lib/sous/api";
import { CATEGORIES } from "~/lib/sous/schemas";
import { label } from "~/lib/sous/display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { FieldGroup, Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogFooter,
} from "~/components/ui/alert-dialog";
import { SaveErrors } from "./errors";

export function IngredientEditor({
  ingredient,
  open,
  onClose,
}: {
  ingredient?: Ingredient;
  open: boolean;
  onClose: () => void;
}) {
  const fetcher = useFetcher<{ ok: true } | SousErrorBody>();
  const busy = fetcher.state !== "idle";
  const wasBusy = useRef(false);
  useEffect(() => {
    if (busy) wasBusy.current = true;
    if (!busy && wasBusy.current && fetcher.data?.ok) {
      wasBusy.current = false;
      onClose();
    }
  }, [busy, fetcher.data, onClose]);
  const handleOpen = useCallback(
    (next: boolean) => {
      if (!next && !busy) onClose();
    },
    [onClose, busy],
  );
  const handleDelete = useCallback(() => {
    if (ingredient)
      void fetcher.submit(
        { intent: "delete", id: ingredient.id },
        { method: "post", action: "/food/ingredients" },
      );
  }, [fetcher, ingredient]);
  const options = useMemo(
    () =>
      CATEGORIES.map((category) => (
        <NativeSelectOption key={category} value={category}>
          {label(category)}
        </NativeSelectOption>
      )),
    [],
  );
  const error = fetcher.data && !fetcher.data.ok ? fetcher.data : undefined;
  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {ingredient ? "Edit ingredient" : "New ingredient"}
          </DialogTitle>
          <DialogDescription>
            This catalog entry can be reused across all your recipes.
          </DialogDescription>
        </DialogHeader>
        <SaveErrors error={error} />
        <fetcher.Form
          method="post"
          action="/food/ingredients"
          className="flex flex-col gap-5"
        >
          <input
            type="hidden"
            name="intent"
            value={ingredient ? "update" : "create"}
          />
          <input type="hidden" name="id" value={ingredient?.id || ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="catalog-name">Name</FieldLabel>
              <Input
                id="catalog-name"
                name="name"
                defaultValue={ingredient?.name}
                required
                disabled={busy}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="catalog-category">Category</FieldLabel>
              <NativeSelect
                className="w-full"
                id="catalog-category"
                name="category"
                defaultValue={ingredient?.category || "other"}
                disabled={busy}
              >
                {options}
              </NativeSelect>
            </Field>
          </FieldGroup>
          <div className="flex justify-between gap-2">
            {ingredient && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="destructive"
                      type="button"
                      disabled={busy}
                    />
                  }
                >
                  Delete
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this ingredient?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Recipes that use it will block deletion. This can't be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <SaveErrors error={error} />
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep ingredient</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={busy}
                    >
                      Delete ingredient
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button type="submit" className="ml-auto" disabled={busy}>
              {busy && <Spinner data-icon="inline-start" />}
              {ingredient ? "Save ingredient" : "Add ingredient"}
            </Button>
          </div>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
