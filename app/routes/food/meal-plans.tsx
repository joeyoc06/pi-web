import { Link } from "react-router";
import { CalendarDaysIcon, ArrowRightIcon } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "~/components/ui/empty";
import { Button } from "~/components/ui/button";
export const meta = () => [{ title: "Meal plans · Sous" }];
export default function MealPlans() {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
          A little less “what’s for dinner?”
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Meal plans</h1>
      </header>
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDaysIcon />
          </EmptyMedia>
          <EmptyTitle>The week ahead, coming next</EmptyTitle>
          <EmptyDescription>
            Weekly menus, reusable plans, and shopping lists are the next
            chapter. For now, build the recipe collection Sous will plan from.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/food/recipes" />} nativeButton={false}>
            Explore recipes
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
