import slugify from "slugify";

export function recipeSlug(title: string) {
  return slugify(title, { lower: true, strict: true, trim: true })
    .slice(0, 200)
    .replace(/-+$/, "");
}
export function formatMinutes(minutes: number) {
  if (!minutes) return "0m";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours}h` : "", rest ? `${rest}m` : ""]
    .filter(Boolean)
    .join(" ");
}
export function label(value: string) {
  return value.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
}
export function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[next]] = [copy[next]!, copy[index]!];
  return copy;
}
