import { useCallback } from "react";
import { useFetcher } from "react-router";
import { Trash2Icon } from "lucide-react";
import type { SousErrorBody } from "~/lib/sous/api";
import { Button } from "~/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";
import { Spinner } from "~/components/ui/spinner";
import { SaveErrors } from "./errors";

export function DeleteRecipe({
  title,
  updatedAt,
}: {
  title: string;
  updatedAt: string;
}) {
  const fetcher = useFetcher<SousErrorBody>();
  const busy = fetcher.state !== "idle";
  const handleDelete = useCallback(() => {
    void fetcher.submit({ expectedUpdatedAt: updatedAt }, { method: "post" });
  }, [fetcher, updatedAt]);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" />}>
        <Trash2Icon data-icon="inline-start" />
        <span className="sr-only sm:not-sr-only">Delete recipe</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This can't be undone. Your ingredient catalog stays intact. A recipe
            used by another recipe cannot be deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <SaveErrors error={fetcher.data} />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep recipe</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={handleDelete}>
            {busy && <Spinner data-icon="inline-start" />}Delete recipe
            permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
