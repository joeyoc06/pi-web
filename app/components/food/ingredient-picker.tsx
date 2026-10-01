import { useCallback, useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
  ComboboxGroup,
} from "~/components/ui/combobox";
import type { Ingredient, Recipe } from "~/lib/sous/types";
import type { SearchResult, SousResult } from "~/lib/sous/api";
import { Spinner } from "~/components/ui/spinner";

type Option = { id: string; label: string; category?: string };
const optionLabel = (option: Option) => option.label;
const sameOption = (a: Option, b: Option) => a.id === b.id;
const renderOption = (option: Option) => (
  <ComboboxItem key={option.id} value={option}>
    <span className="truncate">{option.label}</span>
    {option.category && (
      <span className="ml-auto text-muted-foreground">{option.category}</span>
    )}
  </ComboboxItem>
);

export function IngredientPicker({
  id,
  mode,
  value,
  initialLabel,
  onSelect,
  invalid,
  excludeId,
}: {
  id: string;
  mode: "ingredient" | "recipe";
  value: string;
  initialLabel?: string;
  onSelect: (id: string) => void;
  invalid: boolean;
  excludeId?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Option | null>(null);
  const fetcher = useFetcher<SousResult<SearchResult<Ingredient | Recipe>>>();
  const { load } = fetcher;
  const endpoint = useMemo(
    () => (mode === "ingredient" ? "ingredients" : "recipes"),
    [mode],
  );
  const selected = useMemo(
    () =>
      value
        ? picked?.id === value
          ? picked
          : { id: value, label: initialLabel || value }
        : null,
    [value, picked, initialLabel],
  );
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      void load(
        `/api/sous/${endpoint}?q=${encodeURIComponent(query)}&limit=30`,
      );
    }, 180);
    return () => clearTimeout(timer);
  }, [endpoint, query, open, load]);
  const options = useMemo(() => {
    const data = fetcher.data;
    const values: Option[] = data?.ok
      ? data.data.items
          .filter((item) => item.id !== excludeId)
          .map((item) =>
            "name" in item
              ? { id: item.id, label: item.name, category: item.category }
              : { id: item.id, label: item.title },
          )
      : [];
    if (selected && !values.some((o) => o.id === selected.id))
      values.unshift(selected);
    return values;
  }, [fetcher.data, selected, excludeId]);
  const handleSelect = useCallback(
    (option: Option | null) => {
      setPicked(option);
      onSelect(option?.id ?? "");
    },
    [onSelect],
  );
  const handleInput = useCallback(
    (text: string, details: { reason: string }) => {
      if (details.reason === "input-change" || details.reason === "input-clear")
        setQuery(text);
    },
    [],
  );
  const handleOpen = useCallback((next: boolean) => {
    setOpen(next);
    if (next) setQuery("");
  }, []);
  const placeholder = useMemo(
    () => (mode === "ingredient" ? "Find an ingredient…" : "Find a recipe…"),
    [mode],
  );
  const errorMessage = !fetcher.data?.ok && fetcher.data?.error;
  const optionElements = useMemo(() => options.map(renderOption), [options]);
  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={handleSelect}
      onInputValueChange={handleInput}
      onOpenChange={handleOpen}
      itemToStringLabel={optionLabel}
      isItemEqualToValue={sameOption}
      filter={null}
    >
      <ComboboxInput
        id={id}
        className="w-full"
        placeholder={placeholder}
        aria-invalid={invalid}
        showTrigger={false}
      />
      <ComboboxContent>
        <ComboboxEmpty>
          {fetcher.state !== "idle"
            ? "Searching…"
            : errorMessage ||
              "No matches. Use “New ingredient” below to add one."}
        </ComboboxEmpty>
        {fetcher.state !== "idle" && (
          <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
            <Spinner />
            Searching…
          </div>
        )}
        <ComboboxList>
          <ComboboxGroup>{optionElements}</ComboboxGroup>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
