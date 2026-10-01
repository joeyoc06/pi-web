export type UnitOfMeasure =
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "l"
  | "tsp"
  | "tbsp"
  | "cup"
  | "fl-oz"
  | "clove"
  | "pinch"
  | "dash"
  | "slice"
  | "piece"
  | "unit";

export type CourseType =
  | "appetizer"
  | "main"
  | "side"
  | "dessert"
  | "beverage"
  | "snack";

export type DietaryTag =
  | "vegan"
  | "vegetarian"
  | "gluten-free"
  | "dairy-free"
  | "nut-free"
  | "keto";

export type DifficultyLevel = "easy" | "medium" | "hard";

export interface Ingredient {
  id: string;
  name: string;
  category:
    | "grains"
    | "protein"
    | "vegetable"
    | "fruit"
    | "dairy"
    | "fat"
    | "seasoning"
    | "condiment"
    | "other";
}

export type RecipeIngredient = (
  | { type: "ingredient"; ingredientId: string }
  | { type: "recipe"; recipeId: string }
) & {
  amount: number;
  unit: UnitOfMeasure;
  preparation?: string;
  isOptional?: boolean;
};

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  course: CourseType;
  cuisine?: string;
  difficulty: DifficultyLevel;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  servings: number;
  tags: (DietaryTag | string)[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  imageUrl?: string;
  sourceUrl?: string;
  ingredients: RecipeIngredient[];
  instructions: string[];
}
