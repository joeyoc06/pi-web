import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Link,
  Outlet,
  useLocation,
  useRevalidator,
  useRouteError,
  isRouteErrorResponse,
} from "react-router";
import { ChefHatIcon, ArrowLeftIcon } from "lucide-react";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "~/components/ui/empty";
import type { SousErrorBody } from "~/lib/sous/api";

export function FoodShell() {
  const scroller = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return (
    <div
      ref={scroller}
      className="h-full min-w-0 overflow-y-auto overscroll-contain"
      data-sous-workspace
    >
      <header className="flex h-16 items-center gap-3 border-b px-4 md:px-8">
        <SidebarTrigger className="md:hidden" />
        <Link
          to="/food/recipes"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <ChefHatIcon className="size-4" aria-hidden="true" /> Sous
        </Link>
        <span className="text-muted-foreground" aria-hidden="true">
          /
        </span>
        <span className="text-xs text-muted-foreground">
          Your kitchen notebook
        </span>
      </header>
      <main
        id="food-main"
        className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12"
      >
        <Outlet />
      </main>
    </div>
  );
}
export function FoodErrorBoundary() {
  const error = useRouteError();
  const message = useMemo(() => {
    if (isRouteErrorResponse(error)) {
      const body = error.data as Partial<SousErrorBody> | undefined;
      return (
        body?.error ||
        (error.status === 404
          ? "That recipe isn't in your collection."
          : "Couldn't load your kitchen notebook.")
      );
    }
    return "Something went wrong loading this page. Try again in a moment.";
  }, [error]);
  return (
    <div className="p-8">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Couldn't open this page</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button render={<Link to="/food/recipes" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" /> Back to recipes
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
// Only use on read-only pages: don't revalidate and replace a user's editor
// while they're typing. Returning from a Sous chat picks up her latest saves.
export function useRefreshOnFocus() {
  const { state, revalidate } = useRevalidator();
  const refresh = useCallback(() => {
    if (document.visibilityState === "visible" && state === "idle")
      void revalidate();
  }, [state, revalidate]);
  useEffect(() => {
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refresh]);
}
