import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBeforeUnload, useBlocker, useFetcher } from "react-router";
import {
  ArrowLeftIcon,
  PlusIcon,
  SaveIcon,
  BookOpenIcon,
  CarrotIcon,
  ListOrderedIcon,
} from "lucide-react";
import { z } from "zod";
import type { Recipe, Ingredient } from "~/lib/sous/types";
import type { SousErrorBody } from "~/lib/sous/api";
import {
  COURSES,
  DIFFICULTIES,
  DIETARY_TAGS,
  createRecipeSchema,
  updateRecipeSchema,
  type RecipeIngredientInput,
} from "~/lib/sous/schemas";
import { recipeSlug, moveItem, formatMinutes } from "~/lib/sous/display";
import { Button } from "~/components/ui/button";
import {
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldDescription,
} from "~/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Spinner } from "~/components/ui/spinner";
import { Badge } from "~/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "~/components/ui/alert-dialog";
import { TextField, SelectField, ImageUploadField } from "./recipe-form-fields";
import { InputError, SaveErrors } from "./errors";
import {
  RecipeIngredientRow,
  emptyIngredient,
  type DraftIngredient,
} from "./recipe-ingredient-row";
import { InstructionRow, type DraftInstruction } from "./instruction-row";

function initialDraft(recipe?: Recipe) {
  const fields = {
    title: recipe?.title ?? "",
    slug: recipe?.slug ?? "",
    description: recipe?.description ?? "",
    course: recipe?.course ?? "main",
    cuisine: recipe?.cuisine ?? "",
    difficulty: recipe?.difficulty ?? "easy",
    prepTimeMinutes: String(recipe?.prepTimeMinutes ?? 0),
    cookTimeMinutes: String(recipe?.cookTimeMinutes ?? 0),
    totalTimeMinutes: recipe ? String(recipe.totalTimeMinutes) : "",
    servings: String(recipe?.servings ?? 2),
    imageUrl: recipe?.imageUrl ?? "",
    tags: recipe?.tags.join(", ") ?? "",
  };
  const ingredients: DraftIngredient[] = recipe
    ? recipe.ingredients.map((item, index) => ({
        ...emptyIngredient(`ingredient-${index}`),
        ...item,
        ingredientId: item.type === "ingredient" ? item.ingredientId : "",
        recipeId: item.type === "recipe" ? item.recipeId : "",
        amount: String(item.amount),
        preparation: item.preparation ?? "",
        isOptional: item.isOptional ?? false,
      }))
    : [emptyIngredient("ingredient-0")];
  const instructions: DraftInstruction[] = recipe
    ? recipe.instructions.map((text, index) => ({
        key: `instruction-${index}`,
        text,
      }))
    : [{ key: "instruction-0", text: "" }];
  return { fields, ingredients, instructions };
}
function numberInput(value: string) {
  return value.trim() === "" ? NaN : Number(value);
}
function lineInput(row: DraftIngredient): RecipeIngredientInput {
  const amount = {
    amount: numberInput(row.amount),
    unit: row.unit,
    ...(row.preparation.trim() ? { preparation: row.preparation.trim() } : {}),
    ...(row.isOptional ? { isOptional: true } : {}),
  };
  if (row.type === "new-ingredient")
    return {
      type: row.type,
      ingredient: { name: row.name, category: row.category },
      ...amount,
    };
  if (row.type === "recipe")
    return { type: row.type, recipeId: row.recipeId, ...amount };
  return { type: row.type, ingredientId: row.ingredientId, ...amount };
}
function validationError(error: z.ZodError): SousErrorBody {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues)
    (fieldErrors[issue.path.join(".") || "form"] ??= []).push(issue.message);
  return {
    ok: false,
    code: "VALIDATION_ERROR",
    error: "A few details need your attention.",
    details: { fieldErrors },
  };
}

type Props = {
  recipe?: Recipe;
  catalog: {
    ingredients: Ingredient[];
    recipes: { id: string; title: string }[];
  };
};
export function RecipeForm({ recipe, catalog }: Props) {
  const [draft, setDraft] = useState(() => initialDraft(recipe));
  // Background loader revalidation must not silently advance the version our
  // draft was based on. A stale edit stays stale until the user reloads it.
  const [baseVersion] = useState(recipe?.updatedAt);
  const [baseline] = useState(() => JSON.stringify(initialDraft(recipe)));
  const [slugEdited, setSlugEdited] = useState(!!recipe);
  const [localError, setLocalError] = useState<SousErrorBody | null>(null);
  const fetcher = useFetcher<SousErrorBody>();
  const saving = fetcher.state !== "idle";
  const errorBox = useRef<HTMLDivElement>(null);
  const saveRequested = useRef(false);
  const serialized = useMemo(() => JSON.stringify(draft), [draft]);
  const dirty = serialized !== baseline;
  const error = localError || fetcher.data;
  const errors = error?.details?.fieldErrors;
  const back = useMemo(
    () => (recipe ? `/food/recipes/${recipe.id}` : "/food/recipes"),
    [recipe],
  );
  const names = useMemo(
    () =>
      Object.fromEntries([
        ...catalog.ingredients.map((i) => [i.id, i.name]),
        ...catalog.recipes.map((r) => [r.id, r.title]),
      ]),
    [catalog],
  );
  const title = recipe ? "Edit recipe" : "Add a recipe";
  const payload = useMemo(
    () => ({
      ...draft.fields,
      cuisine: draft.fields.cuisine.trim() || undefined,
      imageUrl: draft.fields.imageUrl.trim() || undefined,
      ...(recipe?.sourceUrl ? { sourceUrl: recipe.sourceUrl } : {}),
      prepTimeMinutes: numberInput(draft.fields.prepTimeMinutes),
      cookTimeMinutes: numberInput(draft.fields.cookTimeMinutes),
      totalTimeMinutes: draft.fields.totalTimeMinutes.trim()
        ? numberInput(draft.fields.totalTimeMinutes)
        : numberInput(draft.fields.prepTimeMinutes) +
          numberInput(draft.fields.cookTimeMinutes),
      servings: numberInput(draft.fields.servings),
      tags: [
        ...new Set(
          draft.fields.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ],
      ingredients: draft.ingredients.map(lineInput),
      instructions: draft.instructions.map((i) => i.text),
      ...(recipe ? { expectedUpdatedAt: baseVersion } : {}),
    }),
    [draft, recipe, baseVersion],
  );
  const total = useMemo(
    () =>
      Number.isFinite(payload.totalTimeMinutes) && payload.totalTimeMinutes >= 0
        ? formatMinutes(payload.totalTimeMinutes)
        : "—",
    [payload.totalTimeMinutes],
  );
  const handleField = useCallback(
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const { name, value } = event.target;
      if (name === "slug") setSlugEdited(true);
      setDraft((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [name]: value,
          ...(name === "title" && !slugEdited
            ? { slug: recipeSlug(value) }
            : {}),
        },
      }));
    },
    [slugEdited],
  );
  const handleImageUrlChange = useCallback(
    (value: string) => {
      setDraft((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          imageUrl: value,
        },
      }));
    },
    [],
  );
  const addIngredient = useCallback(
    () =>
      setDraft((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          emptyIngredient(crypto.randomUUID()),
        ],
      })),
    [],
  );
  const patchIngredient = useCallback(
    (key: string, patch: Partial<DraftIngredient>) =>
      setDraft((prev) => ({
        ...prev,
        ingredients: prev.ingredients.map((i) =>
          i.key === key ? { ...i, ...patch } : i,
        ),
      })),
    [],
  );
  const removeIngredient = useCallback(
    (key: string) =>
      setDraft((prev) => ({
        ...prev,
        ingredients: prev.ingredients.filter((i) => i.key !== key),
      })),
    [],
  );
  const moveIngredient = useCallback(
    (key: string, direction: -1 | 1) =>
      setDraft((prev) => ({
        ...prev,
        ingredients: moveItem(
          prev.ingredients,
          prev.ingredients.findIndex((i) => i.key === key),
          direction,
        ),
      })),
    [],
  );
  const addStep = useCallback(
    () =>
      setDraft((prev) => ({
        ...prev,
        instructions: [
          ...prev.instructions,
          { key: crypto.randomUUID(), text: "" },
        ],
      })),
    [],
  );
  const changeStep = useCallback(
    (key: string, text: string) =>
      setDraft((prev) => ({
        ...prev,
        instructions: prev.instructions.map((i) =>
          i.key === key ? { ...i, text } : i,
        ),
      })),
    [],
  );
  const removeStep = useCallback(
    (key: string) =>
      setDraft((prev) => ({
        ...prev,
        instructions: prev.instructions.filter((i) => i.key !== key),
      })),
    [],
  );
  const moveStep = useCallback(
    (key: string, direction: -1 | 1) =>
      setDraft((prev) => ({
        ...prev,
        instructions: moveItem(
          prev.instructions,
          prev.instructions.findIndex((i) => i.key === key),
          direction,
        ),
      })),
    [],
  );
  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (saveRequested.current) return;
      const parsed = (
        recipe ? updateRecipeSchema : createRecipeSchema
      ).safeParse(payload);
      if (!parsed.success) {
        setLocalError(validationError(parsed.error));
        return;
      }
      setLocalError(null);
      saveRequested.current = true;
      void fetcher.submit(
        { payload: JSON.stringify(parsed.data) },
        { method: "post" },
      );
    },
    [fetcher, payload, recipe],
  );
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data) saveRequested.current = false;
  }, [fetcher.state, fetcher.data]);
  useEffect(() => {
    if (error) {
      errorBox.current?.focus({ preventScroll: true });
      errorBox.current?.scrollIntoView({ block: "center" });
    }
  }, [error]);
  const shouldBlock = useCallback(
    () => dirty && !saveRequested.current,
    [dirty],
  );
  const blocker = useBlocker(shouldBlock);
  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);
  const leave = useCallback(() => {
    if (blocker.state === "blocked") blocker.proceed();
  }, [blocker]);
  const handleBeforeUnload = useCallback(
    (event: BeforeUnloadEvent) => {
      if (dirty && !saveRequested.current) event.preventDefault();
    },
    [dirty],
  );
  useBeforeUnload(handleBeforeUnload);
  const ingredientRows = useMemo(
    () =>
      draft.ingredients.map((row, index) => (
        <RecipeIngredientRow
          key={row.key}
          row={row}
          index={index}
          last={index === draft.ingredients.length - 1}
          errors={errors}
          names={names}
          recipeId={recipe?.id}
          onPatch={patchIngredient}
          onMove={moveIngredient}
          onRemove={removeIngredient}
        />
      )),
    [
      draft.ingredients,
      errors,
      names,
      recipe?.id,
      patchIngredient,
      moveIngredient,
      removeIngredient,
    ],
  );
  const instructionRows = useMemo(
    () =>
      draft.instructions.map((step, index) => (
        <InstructionRow
          key={step.key}
          step={step}
          index={index}
          last={index === draft.instructions.length - 1}
          errors={errors}
          onChange={changeStep}
          onMove={moveStep}
          onRemove={removeStep}
        />
      )),
    [draft.instructions, errors, changeStep, moveStep, removeStep],
  );
  const tagSuggestions = useMemo(() => DIETARY_TAGS.join(", "), []);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4">
        <Link
          to={back}
          className="flex w-fit items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          Back to {recipe ? "recipe" : "recipes"}
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A keeper for your kitchen. Make it easy for future-you to cook.
          </p>
        </div>
      </header>
      <fetcher.Form
        method="post"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-8"
      >
        <div ref={errorBox} tabIndex={-1} hidden={!error}>
          <SaveErrors error={error} />
        </div>
        <fieldset
          disabled={saving}
          className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_260px]"
        >
          <div className="flex min-w-0 flex-col gap-8">
            <Card>
              <CardHeader>
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <BookOpenIcon className="size-4" />
                    The basics
                  </span>
                </CardTitle>
                <CardDescription>
                  The name, story, and a few helpful details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <TextField
                    name="title"
                    label="Recipe title"
                    value={draft.fields.title}
                    onChange={handleField}
                    errors={errors}
                    placeholder="e.g. Garlic butter shrimp"
                  />
                  <TextField
                    name="slug"
                    label="Slug"
                    value={draft.fields.slug}
                    onChange={handleField}
                    errors={errors}
                    hint="A unique, URL-friendly name. Your references always use stable IDs."
                  />
                  <TextField
                    name="description"
                    label="Description"
                    value={draft.fields.description}
                    onChange={handleField}
                    errors={errors}
                    multiline
                    placeholder="What makes this one worth making?"
                  />
                  <FieldGroup className="grid grid-cols-1 sm:grid-cols-2">
                    <SelectField
                      name="course"
                      label="Course"
                      value={draft.fields.course}
                      onChange={handleField}
                      options={COURSES}
                      errors={errors}
                    />
                    <SelectField
                      name="difficulty"
                      label="Difficulty"
                      value={draft.fields.difficulty}
                      onChange={handleField}
                      options={DIFFICULTIES}
                      errors={errors}
                    />
                    <TextField
                      name="cuisine"
                      label="Cuisine (optional)"
                      value={draft.fields.cuisine}
                      onChange={handleField}
                      errors={errors}
                      placeholder="Italian, Mexican…"
                    />
                    <TextField
                      name="servings"
                      label="Servings"
                      type="number"
                      value={draft.fields.servings}
                      onChange={handleField}
                      errors={errors}
                    />
                  </FieldGroup>
                  <ImageUploadField
                    imageUrl={draft.fields.imageUrl}
                    slug={draft.fields.slug}
                    onImageUrlChange={handleImageUrlChange}
                    errors={errors}
                  />
                  <TextField
                    name="tags"
                    label="Tags (optional)"
                    value={draft.fields.tags}
                    onChange={handleField}
                    errors={errors}
                    hint="Comma-separated. Dietary tags or your own: weeknight, family favorite…"
                    placeholder={tagSuggestions}
                  />
                </FieldGroup>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Time in the kitchen</CardTitle>
                <CardDescription>
                  Minutes, including any extra resting time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FieldGroup className="grid grid-cols-1 sm:grid-cols-3">
                  <TextField
                    name="prepTimeMinutes"
                    label="Prep (min)"
                    type="number"
                    value={draft.fields.prepTimeMinutes}
                    onChange={handleField}
                    errors={errors}
                  />
                  <TextField
                    name="cookTimeMinutes"
                    label="Cook (min)"
                    type="number"
                    value={draft.fields.cookTimeMinutes}
                    onChange={handleField}
                    errors={errors}
                  />
                  <TextField
                    name="totalTimeMinutes"
                    label="Total (min)"
                    type="number"
                    value={draft.fields.totalTimeMinutes}
                    onChange={handleField}
                    errors={errors}
                    hint="Leave blank to add prep + cook."
                  />
                </FieldGroup>
              </CardContent>
            </Card>
            <FieldSet>
              <FieldLegend>
                <span className="flex items-center gap-2">
                  <CarrotIcon className="size-4" />
                  Ingredients
                </span>
              </FieldLegend>
              <FieldDescription>
                Choose from your catalog, create something new, or use another
                recipe. Nothing is added until you save.
              </FieldDescription>
              <FieldGroup>{ingredientRows}</FieldGroup>
              <InputError errors={errors} name="ingredients" />
              <Button
                variant="outline"
                className="w-fit"
                type="button"
                onClick={addIngredient}
              >
                <PlusIcon data-icon="inline-start" />
                Add ingredient
              </Button>
            </FieldSet>
            <FieldSet>
              <FieldLegend>
                <span className="flex items-center gap-2">
                  <ListOrderedIcon className="size-4" />
                  Instructions
                </span>
              </FieldLegend>
              <FieldDescription>
                One clear action at a time. Use the arrows to reorder steps.
              </FieldDescription>
              <FieldGroup>{instructionRows}</FieldGroup>
              <InputError errors={errors} name="instructions" />
              <Button
                variant="outline"
                className="w-fit"
                type="button"
                onClick={addStep}
              >
                <PlusIcon data-icon="inline-start" />
                Add step
              </Button>
            </FieldSet>
          </div>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle>Ready when you are</CardTitle>
                <CardDescription>
                  Your recipe and any new ingredients save together.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{total} total</Badge>
                  <Badge variant="outline">
                    {draft.ingredients.length} ingredients
                  </Badge>
                </div>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <SaveIcon data-icon="inline-start" />
                  )}
                  {saving ? "Saving…" : recipe ? "Save changes" : "Save recipe"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  render={<Link to={back} />}
                  nativeButton={false}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Use a measured amount for each ingredient. “To taste” isn’t a
              number; a pinch or dash works when you know the amount.
            </p>
          </aside>
        </fieldset>
      </fetcher.Form>
      <AlertDialog open={blocker.state === "blocked"}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this recipe unfinished?</AlertDialogTitle>
            <AlertDialogDescription>
              Your unsaved changes will be lost. No ingredients have been added
              to the catalog yet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={stay}>Keep editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={leave}>
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
