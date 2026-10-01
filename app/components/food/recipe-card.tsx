import { useMemo } from "react";
import { Link } from "react-router";
import { ClockIcon, UsersIcon, ArrowUpRightIcon } from "lucide-react";
import type { Recipe } from "~/lib/sous/types";
import { formatMinutes, label } from "~/lib/sous/display";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { RecipeImage } from "./recipe-image";

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  const href = useMemo(() => `/food/recipes/${recipe.id}`, [recipe.id]);
  const time = useMemo(
    () => formatMinutes(recipe.totalTimeMinutes),
    [recipe.totalTimeMinutes],
  );
  const course = useMemo(() => label(recipe.course), [recipe.course]);
  const difficulty = useMemo(
    () => label(recipe.difficulty),
    [recipe.difficulty],
  );
  return (
    <Link
      to={href}
      className="group block min-w-0 outline-none transition-transform motion-safe:hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`View ${recipe.title}`}
    >
      <Card className="h-full gap-4 pt-0">
        <RecipeImage src={recipe.imageUrl} title={recipe.title} />
        <CardHeader>
          <CardTitle>{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2">
            {recipe.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="secondary">{recipe.cuisine || course}</Badge>
          <Badge variant="outline">{difficulty}</Badge>
        </CardContent>
        <CardFooter className="mt-auto justify-between gap-3">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3" />
              {time}
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3" />
              {recipe.servings} servings
            </span>
          </div>
          <ArrowUpRightIcon className="size-4 text-muted-foreground" />
        </CardFooter>
      </Card>
    </Link>
  );
}
