export type SousErrorBody = {
  ok: false;
  error: string;
  code: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
    existingId?: string;
    blockers?: { id: string; title: string }[];
    ids?: string[];
  };
};
export type SousResult<T> =
  | { ok: true; data: T; meta?: { created: boolean } }
  | SousErrorBody;
export type SearchResult<T> = { items: T[]; total: number };
