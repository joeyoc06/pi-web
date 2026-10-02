import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  // the sidebar lives here rather than in each route element: as sibling
  // routes they unmounted/remounted the whole sidebar on every navigation,
  // which re-triggered its <Suspense> fallback
  layout("layouts/default-layout.tsx", [
    index("routes/home/home.tsx"),
    route("session/:sessionId", "routes/session/session.tsx"),
    layout("routes/food/layout.tsx", [
      route("food/recipes", "routes/food/recipes.tsx"),
      route("food/recipes/new", "routes/food/recipe-new.tsx"),
      route("food/recipes/:recipeId", "routes/food/recipe-detail.tsx"),
      route("food/recipes/:recipeId/edit", "routes/food/recipe-edit.tsx"),
      route("food/ingredients", "routes/food/ingredients.tsx"),
      route("food/meal-plans", "routes/food/meal-plans.tsx"),
    ]),
  ]),
  route("food/import", "routes/food/import.ts"),
  route("api/sous/recipes", "routes/api/sous/recipes.ts"),
  route("api/sous/upload-image", "routes/api/sous/upload-image.ts"),
  route("api/sous/recipes/:id", "routes/api/sous/recipe.ts"),
  route("api/sous/ingredients", "routes/api/sous/ingredients.ts"),
  route("api/sous/ingredients/:id", "routes/api/sous/ingredient.ts"),
  route("fs/directory", "routes/fs/directory.ts"),
  route("fs/file", "routes/fs/file.ts"),
  route("fs/find", "routes/fs/find.ts"),
  route("git/branch", "routes/git/branch.ts"),
  route("git/commit", "routes/git/commit.ts"),
  route("git/diff", "routes/git/diff.ts"),
  route("git/discard", "routes/git/discard.ts"),
  route("git/stage", "routes/git/stage.ts"),
  route("git/unstage", "routes/git/unstage.ts"),
  route("git/status", "routes/git/status.ts"),
  route("skills", "routes/skills.ts"),
  route("models", "routes/models.ts"),
  route("projects", "routes/projects.ts"),
  route("updates", "routes/updates.ts"),
  route("sessions/events", "routes/session/session-events.ts"),
  route("prompt", "routes/prompt.tsx"),
] satisfies RouteConfig;
