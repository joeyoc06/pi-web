import { useCallback } from "react";
import { Link, useMatch } from "react-router";
import { CalendarDaysIcon, BookOpenIcon, ChevronRightIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "~/components/ui/collapsible";
import { useCookie } from "~/hooks/use-cookie";

export function FoodNavigation() {
  const [open, setOpen] = useCookie<boolean>("foodSectionOpen", {
    defaultValue: true,
  });
  const handleToggle = useCallback((next: boolean) => setOpen(next), [setOpen]);
  const recipes = useMatch("/food/recipes/*");
  const ingredients = useMatch("/food/ingredients");
  const plans = useMatch("/food/meal-plans");
  return (
    <Collapsible open={open} onOpenChange={handleToggle} className="group/food">
      <SidebarGroup>
        <SidebarGroupLabel render={<CollapsibleTrigger />}>
          Food{" "}
          <ChevronRightIcon className="ml-auto size-3 transition-transform group-data-open/food:rotate-90" />
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to="/food/meal-plans" />}
                  isActive={!!plans}
                  tooltip="Meal plans"
                >
                  <CalendarDaysIcon />
                  <span>Meal plans</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  render={<Link to="/food/recipes" />}
                  isActive={!!recipes || !!ingredients}
                  tooltip="Recipes"
                >
                  <BookOpenIcon />
                  <span>Recipes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}
