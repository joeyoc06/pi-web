import { PrismaClient } from "@prisma/client";
import { PrismaNodeSQLite } from "prisma-adapter-node-sqlite";
import type { Recipe, RecipeIngredient } from "~/lib/sous/types";

function createDbClient() {
  const baseClient = new PrismaClient({
    adapter: new PrismaNodeSQLite({ url: process.env_parsed.DB_URL }),
  });
  let pragmasReady: Promise<void> | undefined;

  async function ensurePragmas(): Promise<void> {
    if (pragmasReady) return pragmasReady;

    pragmasReady = (async () => {
      // Use the unextended client to avoid re-entering this query hook.
      await baseClient.$queryRawUnsafe("PRAGMA journal_mode = WAL");
      await baseClient.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
    })().catch((error: unknown) => {
      pragmasReady = undefined;
      throw error;
    });

    return pragmasReady;
  }

  return baseClient.$extends({
    result: {
      recipe: {
        typedTags: {
          needs: { tags: true },
          compute(row): Recipe["tags"] {
            return row.tags as Recipe["tags"];
          },
        },
        typedIngredients: {
          needs: { ingredients: true },
          compute(row): RecipeIngredient[] {
            return row.ingredients as RecipeIngredient[];
          },
        },
        typedInstructions: {
          needs: { instructions: true },
          compute(row): Recipe["instructions"] {
            return row.instructions as Recipe["instructions"];
          },
        },
      },
    },
    query: {
      $allOperations: async ({ args, query }) => {
        await ensurePragmas();
        return query(args);
      },
    },
  });
}

export type AppDbClient = ReturnType<typeof createDbClient>;
export type AppDbTransaction = Parameters<
  Parameters<AppDbClient["$transaction"]>[0]
>[0];

const globalWithAppDb = globalThis as typeof globalThis & {
  appDb?: AppDbClient;
};

export const db =
  globalWithAppDb.appDb ?? (globalWithAppDb.appDb = createDbClient());
