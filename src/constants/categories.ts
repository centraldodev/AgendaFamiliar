import type { IconName } from "../components/ui/Icon";
import type { Category } from "../models/Category";
// Mesmos ids e nomes do app anterior, na mesma ordem ("Outro" sempre por último).
export const categories: Record<string, string> = {
  home: "Casa",
  work: "Trabalho",
  school: "Escola",
  finance: "Finanças",
  health: "Saúde",
  shopping: "Compras",
  leisure: "Lazer",
  exercise: "Exercícios",
  family: "Família",
  projects: "Projetos",
  meetings: "Reuniões",
  travel: "Viagem",
  other: "Outro",
};
// Ícones do app anterior, para as mesmas categorias.
const icons: Record<string, IconName> = {
  home: "home-outline",
  work: "briefcase-outline",
  school: "school-outline",
  finance: "cash-outline",
  health: "fitness-outline",
  shopping: "cart-outline",
  leisure: "game-controller-outline",
  exercise: "barbell-outline",
  family: "people-outline",
  projects: "bulb-outline",
  meetings: "calendar-outline",
  travel: "airplane-outline",
  other: "grid-outline",
  education: "book-outline",
};
// Ids que não são mais oferecidos, mas ainda existem em tarefas salvas.
const retired: Record<string, string> = { education: "Estudos" };
// Categorias da família, atualizadas pelo useCategoryController a cada carga.
let custom: Record<string, string> = {};
let customIcons: Record<string, string> = {};
export function setCustomCategories(list: Category[]) {
  custom = Object.fromEntries(list.map((item) => [item.id, item.label]));
  customIcons = Object.fromEntries(
    list.filter((item) => item.icon).map((item) => [item.id, item.icon!]),
  );
}
// Nome gravado pelas categorias da família pode não existir no Ionicons atual;
// o componente Icon troca esses casos pelo ícone genérico.
export function categoryIcon(key: string | null | undefined): IconName {
  if (!key) return "pricetag-outline";
  return icons[key] ?? (customIcons[key] as IconName | undefined) ?? "grid-outline";
}
export function categoryLabel(key: string) {
  return categories[key] ?? custom[key] ?? retired[key] ?? key;
}
// Padrão (sem "Outro"), depois as da família em ordem alfabética, e "Outro" por último.
export function categoryOptions(current?: string | null): [string, string][] {
  const { other, ...defaults } = categories;
  const options: [string, string][] = [
    ...Object.entries(defaults),
    ...Object.entries(custom).sort(([, a], [, b]) => a.localeCompare(b)),
    ["other", other],
  ];
  if (current && !options.some(([key]) => key === current))
    options.push([current, categoryLabel(current)]);
  return options;
}
