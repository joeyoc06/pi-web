import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Form, Link, useNavigation, useSubmit } from "react-router";
import {
  BookOpenIcon,
  SearchIcon,
  PlusIcon,
  CarrotIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XIcon,
} from "lucide-react";
import type { Route } from "./+types/recipes";
import { searchRecipes } from "~/services/sous/recipes.server";
import { pageLoad, query } from "~/services/sous/http.server";
import { COURSES, recipeSearchSchema } from "~/lib/sous/schemas";
import { label } from "~/lib/sous/display";
import { RecipeCard } from "~/components/food/recipe-card";
import { useRefreshOnFocus } from "~/components/food/food-shell";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "~/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "~/components/ui/empty";
import { Spinner } from "~/components/ui/spinner";
import { ImportRecipeDialog } from "~/components/food/import-recipe-dialog";

export const meta = () => [{ title: "Recipes · Sous" }];
export function loader({ request }: Route.LoaderArgs) {
  return pageLoad(async () => {
    const filters = recipeSearchSchema.parse(query(request));
    return { ...(await searchRecipes(filters)), filters };
  });
}
export default function Recipes({ loaderData }: Route.ComponentProps) {
  const { items, total, filters } = loaderData;
  const [search, setSearch] = useState(filters.q);
  const submit = useSubmit();
  const navigation = useNavigation();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const busy = navigation.state !== "idle";
  useRefreshOnFocus();
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(event.target.value);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (form.current) void submit(form.current, { replace: true });
      }, 250);
    },
    [submit],
  );
  const handleFilter = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (form.current) void submit(form.current, { replace: true });
  }, [submit]);
  const handleSubmit = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const handleClear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setSearch("");
    const values = new FormData(form.current!);
    values.set("q", "");
    void submit(values, { method: "get", replace: true });
  }, [submit]);
  const courseOptions = useMemo(
    () =>
      COURSES.map((course) => (
        <NativeSelectOption key={course} value={course}>
          {label(course)}
        </NativeSelectOption>
      )),
    [],
  );
  const cards = useMemo(
    () => items.map((r) => <RecipeCard key={r.id} recipe={r} />),
    [items],
  );
  const summary = useMemo(
    () => `${total} recipe${total === 1 ? "" : "s"} in your collection`,
    [total],
  );
  const pagination = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters))
      if (value !== undefined && value !== "" && key !== "offset")
        params.set(key, String(value));
    params.set("offset", String(Math.max(0, filters.offset - filters.limit)));
    const previous = `/food/recipes?${params}`;
    params.set("offset", String(filters.offset + filters.limit));
    return {
      previous,
      next: `/food/recipes?${params}`,
      page: Math.floor(filters.offset / filters.limit) + 1,
      pages: Math.ceil(total / filters.limit),
    };
  }, [filters, total]);
  const hasFilters =
    !!filters.q ||
    !!filters.course ||
    !!filters.tag ||
    !!filters.cuisine ||
    !!filters.difficulty ||
    !!filters.ingredientId ||
    !!filters.slug;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
            The recipe box
          </p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Recipes
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Good things to make, saved in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            render={<Link to="/food/ingredients" />}
            nativeButton={false}
          >
            <CarrotIcon data-icon="inline-start" />
            Ingredients
          </Button>
          <Button render={<Link to="/food/recipes/new" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            Add recipe
          </Button>
        </div>
      </header>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Form
          method="get"
          ref={form}
          onSubmit={handleSubmit}
          className="flex min-w-0 flex-1 flex-wrap gap-3"
          role="search"
        >
          <InputGroup className="min-w-48 flex-1">
            <InputGroupInput
              name="q"
              value={search}
              onChange={handleSearch}
              placeholder="Search your recipes…"
              aria-label="Search recipes"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              {busy ? (
                <Spinner />
              ) : (
                search && (
                  <InputGroupButton
                    onClick={handleClear}
                    aria-label="Clear search"
                    size="icon-xs"
                  >
                    <XIcon />
                  </InputGroupButton>
                )
              )}
            </InputGroupAddon>
          </InputGroup>
          <NativeSelect
            name="course"
            aria-label="Filter by course"
            key={filters.course || "all"}
            defaultValue={filters.course || ""}
            onChange={handleFilter}
          >
            <NativeSelectOption value="">All courses</NativeSelectOption>
            {courseOptions}
          </NativeSelect>
          <button type="submit" className="sr-only">
            Search
          </button>
        </Form>
        <ImportRecipeDialog />
      </div>
      <p
        className="text-xs text-muted-foreground"
        role="status"
        aria-live="polite"
      >
        {busy ? "Searching…" : summary}
      </p>
      {items.length ? (
        <div
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          aria-busy={busy}
        >
          {cards}
        </div>
      ) : (
        <Empty className="min-h-72 border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpenIcon />
            </EmptyMedia>
            <EmptyTitle>
              {hasFilters
                ? "No recipes match just yet"
                : "Your next favorite starts here"}
            </EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Try a different search or clear your filters."
                : "Add a family favorite by hand, or give Sous a recipe link and let her do the filing."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={
                <Link to={hasFilters ? "/food/recipes" : "/food/recipes/new"} />
              }
              nativeButton={false}
            >
              {hasFilters ? "Clear filters" : "Add your first recipe"}
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {total > filters.limit && (
        <nav
          aria-label="Recipe pages"
          className="flex items-center justify-between gap-3"
        >
          <Button
            variant="outline"
            disabled={filters.offset === 0}
            render={<Link to={pagination.previous} />}
            nativeButton={false}
          >
            <ChevronLeftIcon data-icon="inline-start" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {pagination.page} of {pagination.pages}
          </span>
          <Button
            variant="outline"
            disabled={filters.offset + filters.limit >= total}
            render={<Link to={pagination.next} />}
            nativeButton={false}
          >
            Next
            <ChevronRightIcon data-icon="inline-end" />
          </Button>
        </nav>
      )}
    </div>
  );
}
