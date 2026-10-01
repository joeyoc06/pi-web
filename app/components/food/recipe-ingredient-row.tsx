import { useCallback, useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { CATEGORIES, UNITS } from "~/lib/sous/schemas";
import { Field, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { IngredientPicker } from "./ingredient-picker";
import { InputError } from "./errors";
import { label } from "~/lib/sous/display";
import type { Ingredient, UnitOfMeasure } from "~/lib/sous/types";

export type DraftIngredient = {
  key: string;
  type: "ingredient" | "recipe" | "new-ingredient";
  ingredientId: string;
  recipeId: string;
  name: string;
  category: Ingredient["category"];
  amount: string;
  unit: UnitOfMeasure;
  preparation: string;
  isOptional: boolean;
};
export const emptyIngredient = (key: string): DraftIngredient => ({
  key,
  type: "ingredient",
  ingredientId: "",
  recipeId: "",
  name: "",
  category: "other",
  amount: "",
  unit: "unit",
  preparation: "",
  isOptional: false,
});

export function RecipeIngredientRow({
  row,
  index,
  last,
  errors,
  names,
  recipeId,
  onPatch,
  onRemove,
  onMove,
}: {
  row: DraftIngredient;
  index: number;
  last: boolean;
  errors?: Record<string, string[]>;
  names: Record<string, string>;
  recipeId?: string;
  onPatch: (key: string, patch: Partial<DraftIngredient>) => void;
  onRemove: (key: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
}) {
  const prefix = useMemo(() => `ingredients.${index}`, [index]);
  const position = useMemo(() => index + 1, [index]);
  const ids = useMemo(
    () => ({
      pick: `${row.key}-pick`,
      amount: `${row.key}-amount`,
      unit: `${row.key}-unit`,
      prep: `${row.key}-prep`,
      optional: `${row.key}-optional`,
      category: `${row.key}-category`,
      name: `${row.key}-name`,
    }),
    [row.key],
  );
  const refField = useMemo(
    () => `${prefix}.${row.type === "recipe" ? "recipeId" : "ingredientId"}`,
    [prefix, row.type],
  );
  const amountField = useMemo(() => `${prefix}.amount`, [prefix]);
  const unitField = useMemo(() => `${prefix}.unit`, [prefix]);
  const nameField = useMemo(() => `${prefix}.ingredient.name`, [prefix]);
  const unitOptions = useMemo(
    () =>
      UNITS.map((u) => (
        <NativeSelectOption key={u} value={u}>
          {u}
        </NativeSelectOption>
      )),
    [],
  );
  const categoryOptions = useMemo(
    () =>
      CATEGORIES.map((c) => (
        <NativeSelectOption key={c} value={c}>
          {label(c)}
        </NativeSelectOption>
      )),
    [],
  );
  const selectedId = row.type === "recipe" ? row.recipeId : row.ingredientId;
  const selectedLabel = useMemo(() => names[selectedId], [names, selectedId]);
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onPatch(row.key, { [event.target.name]: event.target.value });
    },
    [onPatch, row.key],
  );
  const handleSelection = useCallback(
    (id: string) =>
      onPatch(
        row.key,
        row.type === "recipe" ? { recipeId: id } : { ingredientId: id },
      ),
    [onPatch, row.key, row.type],
  );
  const handleOptional = useCallback(
    (checked: boolean) => onPatch(row.key, { isOptional: checked }),
    [onPatch, row.key],
  );
  const handleNew = useCallback(
    () => onPatch(row.key, { type: "new-ingredient" }),
    [onPatch, row.key],
  );
  const handleExisting = useCallback(
    () => onPatch(row.key, { type: "ingredient" }),
    [onPatch, row.key],
  );
  const handleRecipe = useCallback(
    () => onPatch(row.key, { type: "recipe" }),
    [onPatch, row.key],
  );
  const handleRemove = useCallback(
    () => onRemove(row.key),
    [onRemove, row.key],
  );
  const handleUp = useCallback(() => onMove(row.key, -1), [onMove, row.key]);
  const handleDown = useCallback(() => onMove(row.key, 1), [onMove, row.key]);
  const moveUpLabel = useMemo(
    () => `Move ingredient ${position} up`,
    [position],
  );
  const moveDownLabel = useMemo(
    () => `Move ingredient ${position} down`,
    [position],
  );
  const removeLabel = useMemo(
    () => `Remove ingredient ${position}`,
    [position],
  );
  return (
    <section
      className="flex flex-col gap-4 border p-4"
      aria-label={`Ingredient ${position}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Ingredient {position}
          {row.type === "new-ingredient" && " · New in your catalog"}
          {row.type === "recipe" && " · Sub-recipe"}
        </p>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleUp}
            disabled={index === 0}
            aria-label={moveUpLabel}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDown}
            disabled={last}
            aria-label={moveDownLabel}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleRemove}
            aria-label={removeLabel}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_100px_100px]">
        {row.type === "new-ingredient" ? (
          <Field data-invalid={!!errors?.[nameField]}>
            <FieldLabel htmlFor={ids.name}>New ingredient name</FieldLabel>
            <Input
              id={ids.name}
              name="name"
              value={row.name}
              onChange={handleChange}
              placeholder="e.g. Guajillo chiles"
              aria-invalid={!!errors?.[nameField]}
            />
            <InputError errors={errors} name={nameField} />
          </Field>
        ) : (
          <Field data-invalid={!!errors?.[refField]}>
            <FieldLabel htmlFor={ids.pick}>
              {row.type === "recipe" ? "Recipe" : "Ingredient"}
            </FieldLabel>
            <IngredientPicker
              key={row.type}
              id={ids.pick}
              mode={row.type}
              value={selectedId}
              initialLabel={selectedLabel}
              onSelect={handleSelection}
              invalid={!!errors?.[refField]}
              excludeId={recipeId}
            />
            <InputError errors={errors} name={refField} />
          </Field>
        )}
        <Field data-invalid={!!errors?.[amountField]}>
          <FieldLabel htmlFor={ids.amount}>Amount</FieldLabel>
          <Input
            id={ids.amount}
            name="amount"
            type="number"
            step="any"
            min="0"
            placeholder="2"
            value={row.amount}
            onChange={handleChange}
            aria-invalid={!!errors?.[amountField]}
          />
          <InputError errors={errors} name={amountField} />
        </Field>
        <Field data-invalid={!!errors?.[unitField]}>
          <FieldLabel htmlFor={ids.unit}>Unit</FieldLabel>
          <NativeSelect
            className="w-full"
            id={ids.unit}
            name="unit"
            value={row.unit}
            onChange={handleChange}
            aria-invalid={!!errors?.[unitField]}
          >
            {unitOptions}
          </NativeSelect>
          <InputError errors={errors} name={unitField} />
        </Field>
      </FieldGroup>
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {row.type === "new-ingredient" && (
          <Field>
            <FieldLabel htmlFor={ids.category}>Category</FieldLabel>
            <NativeSelect
              className="w-full"
              id={ids.category}
              name="category"
              value={row.category}
              onChange={handleChange}
            >
              {categoryOptions}
            </NativeSelect>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor={ids.prep}>
            Preparation{" "}
            <span className="text-muted-foreground">(optional)</span>
          </FieldLabel>
          <Input
            id={ids.prep}
            name="preparation"
            value={row.preparation}
            onChange={handleChange}
            placeholder="Minced, divided, room temperature…"
          />
        </Field>
        <Field orientation="horizontal" className="self-end pb-2">
          <Checkbox
            id={ids.optional}
            checked={row.isOptional}
            onCheckedChange={handleOptional}
          />
          <FieldLabel htmlFor={ids.optional}>Optional ingredient</FieldLabel>
        </Field>
      </FieldGroup>
      <div className="flex flex-wrap gap-1">
        {row.type !== "new-ingredient" && (
          <Button type="button" variant="link" size="sm" onClick={handleNew}>
            <PlusIcon data-icon="inline-start" />
            New ingredient
          </Button>
        )}
        {row.type !== "ingredient" && (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleExisting}
          >
            Use catalog ingredient
          </Button>
        )}
        {row.type !== "recipe" && (
          <Button type="button" variant="link" size="sm" onClick={handleRecipe}>
            Use another recipe
          </Button>
        )}
      </div>
    </section>
  );
}
