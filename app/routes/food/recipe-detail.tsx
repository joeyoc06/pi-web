import { useCallback, useMemo, useState } from "react";
import { Link, redirect } from "react-router";
import {
  ArrowLeftIcon,
  PencilIcon,
  ClockIcon,
  UsersIcon,
  ChefHatIcon,
  CheckIcon,
} from "lucide-react";
import type { Route } from "./+types/recipe-detail";
import {
  getRecipe,
  getCatalog,
  deleteRecipe,
} from "~/services/sous/recipes.server";
import {
  pageLoad,
  formError,
  methodNotAllowed,
} from "~/services/sous/http.server";
import { formatMinutes, label } from "~/lib/sous/display";
import { RecipeImage } from "~/components/food/recipe-image";
import { DeleteRecipe } from "~/components/food/delete-recipe";
import { useRefreshOnFocus } from "~/components/food/food-shell";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Field, FieldLabel } from "~/components/ui/field";
import { cn } from "~/lib/utils";

export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: `${loaderData?.recipe.title ?? "Recipe"} · Sous` }];
}
export function loader({ params }: Route.LoaderArgs) {
  return pageLoad(async () => ({
    recipe: await getRecipe(params.recipeId),
    catalog: await getCatalog(),
  }));
}
export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") return methodNotAllowed("POST");
  try {
    const form = await request.formData();
    await deleteRecipe(params.recipeId, {
      expectedUpdatedAt: form.get("expectedUpdatedAt"),
    });
    return redirect("/food/recipes");
  } catch (error) {
    return formError(error);
  }
}
export default function RecipeDetail({ loaderData }: Route.ComponentProps) {
  return <RecipeView key={loaderData.recipe.id} data={loaderData} />;
}
function RecipeView({ data }: { data: Route.ComponentProps["loaderData"] }) {
  const { recipe, catalog } = data;
  useRefreshOnFocus();
  const editLink = useMemo(
    () => `/food/recipes/${recipe.id}/edit`,
    [recipe.id],
  );
  const prep = useMemo(
    () => formatMinutes(recipe.prepTimeMinutes),
    [recipe.prepTimeMinutes],
  );
  const cook = useMemo(
    () => formatMinutes(recipe.cookTimeMinutes),
    [recipe.cookTimeMinutes],
  );
  const total = useMemo(
    () => formatMinutes(recipe.totalTimeMinutes),
    [recipe.totalTimeMinutes],
  );
  const course = useMemo(() => label(recipe.course), [recipe.course]);
  const difficulty = useMemo(
    () => label(recipe.difficulty),
    [recipe.difficulty],
  );
  const updated = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(new Date(recipe.updatedAt)),
    [recipe.updatedAt],
  );
  const names = useMemo(
    () =>
      Object.fromEntries([
        ...catalog.ingredients.map((i) => [i.id, i.name]),
        ...catalog.recipes.map((r) => [r.id, r.title]),
      ]),
    [catalog],
  );
  const ingredients = useMemo(
    () =>
      recipe.ingredients.map((item, index) => {
        const id =
          item.type === "ingredient" ? item.ingredientId : item.recipeId;
        return (
          <li key={`${id}-${index}`} className="flex items-start gap-4 py-3">
            <span className="min-w-16 shrink-0 text-sm font-medium tabular-nums">
              {item.amount}{" "}
              <span className="text-muted-foreground">{item.unit}</span>
            </span>
            <div className="min-w-0 text-sm">
              {item.type === "recipe" ? (
                <Link
                  to={`/food/recipes/${item.recipeId}`}
                  className="underline decoration-muted-foreground underline-offset-4"
                >
                  {names[id] || "Missing recipe"}
                </Link>
              ) : (
                names[id] || "Missing ingredient"
              )}
              {item.isOptional && (
                <span className="ml-2 text-xs text-muted-foreground">
                  optional
                </span>
              )}
              {item.preparation && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.preparation}
                </p>
              )}
            </div>
          </li>
        );
      }),
    [recipe.ingredients, names],
  );
  const tags = useMemo(
    () =>
      recipe.tags.map((tag, index) => (
        <Badge key={`${tag}-${index}`} variant="secondary">
          {tag}
        </Badge>
      )),
    [recipe.tags],
  );
  const instructions = useMemo(
    () =>
      recipe.instructions.map((text, index) => (
        <CookingStep
          key={`${recipe.id}-${index}-${text}`}
          text={text}
          index={index}
        />
      )),
    [recipe.instructions, recipe.id],
  );
  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/food/recipes"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-3" />
            All recipes
          </Link>
          <div className="flex gap-2">
            <DeleteRecipe title={recipe.title} updatedAt={recipe.updatedAt} />
            <Button render={<Link to={editLink} />} nativeButton={false}>
              <PencilIcon data-icon="inline-start" />
              Edit recipe
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="outline">{course}</Badge>
              {recipe.cuisine && (
                <Badge variant="outline">{recipe.cuisine}</Badge>
              )}
              <Badge variant="outline">{difficulty}</Badge>
            </div>
            <h1 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
              {recipe.title}
            </h1>
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-muted-foreground">
              {recipe.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">{tags}</div>
          </div>
          <div className="overflow-hidden border">
            <RecipeImage src={recipe.imageUrl} title={recipe.title} />
          </div>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-6 border-y py-6 md:grid-cols-4">
        <div>
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ChefHatIcon className="size-3.5" />
            Prep
          </dt>
          <dd className="text-sm font-medium">{prep}</dd>
        </div>
        <div>
          <dt className="mb-1 text-xs text-muted-foreground">Cook</dt>
          <dd className="text-sm font-medium">{cook}</dd>
        </div>
        <div>
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <ClockIcon className="size-3.5" />
            Total
          </dt>
          <dd className="text-sm font-medium">{total}</dd>
        </div>
        <div>
          <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <UsersIcon className="size-3.5" />
            Yield
          </dt>
          <dd className="text-sm font-medium">{recipe.servings} servings</dd>
        </div>
      </dl>
      <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ingredients</CardTitle>
            <CardDescription>
              Everything you need, in recipe order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">{ingredients}</ul>
          </CardContent>
        </Card>
        <section>
          <h2 className="mb-2 text-xl font-semibold">Let's make it</h2>
          <p className="mb-6 text-xs text-muted-foreground">
            Check off steps as you cook. Your recipe stays unchanged.
          </p>
          <ol className="flex flex-col gap-6">{instructions}</ol>
        </section>
      </div>
      <footer className="text-xs text-muted-foreground">
        Last saved {updated}
        {recipe.sourceUrl ? (
          <>
            {" · "}Source: {" "}
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Original recipe
            </a>
          </>
        ) : (
          " · From your recipe box"
        )}
      </footer>
    </article>
  );
}
function CookingStep({ text, index }: { text: string; index: number }) {
  const [checked, setChecked] = useState(false);
  const onChange = useCallback((value: boolean) => setChecked(value), []);
  const id = useMemo(() => `cooking-step-${index}`, [index]);
  const number = useMemo(() => String(index + 1).padStart(2, "0"), [index]);
  const checkLabel = useMemo(() => `Mark step ${index + 1} complete`, [index]);
  const className = useMemo(
    () =>
      cn(
        "text-sm leading-relaxed",
        checked && "text-muted-foreground line-through",
      ),
    [checked],
  );
  return (
    <li className="flex gap-4">
      <span
        className="pt-0.5 font-mono text-sm text-muted-foreground"
        aria-hidden="true"
      >
        {checked ? <CheckIcon className="size-4" /> : number}
      </span>
      <div className="flex flex-1 flex-col gap-3">
        <p className={className}>{text}</p>
        <Field orientation="horizontal">
          <Checkbox
            id={id}
            checked={checked}
            onCheckedChange={onChange}
            aria-label={checkLabel}
          />
          <FieldLabel htmlFor={id}>Done</FieldLabel>
        </Field>
      </div>
    </li>
  );
}
