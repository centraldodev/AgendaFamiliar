import { useEffect, useState } from "react";
import { categoryOptions, setCustomCategories } from "../constants/categories";
import type { Category } from "../models/Category";
import type { Profile } from "../models/Profile";
import { createCategory } from "../services/categories/createCategory";
import { loadCategories } from "../services/categories/loadCategories";
import { withReadTimeout } from "../utils/withReadTimeout";
export function useCategoryController(profile: Profile | null) {
  const [custom, setCustom] = useState<Category[]>([]);
  const familyId = profile?.familyId;
  const apply = (list: Category[]) => {
    setCustomCategories(list);
    setCustom(list);
  };
  useEffect(() => {
    apply([]);
    if (!familyId) return;
    let cancelled = false;
    withReadTimeout(loadCategories(familyId))
      .then((list) => !cancelled && apply(list))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [familyId]);
  // Devolve o id da nova categoria (ou da já existente com o mesmo nome).
  const create = async (label: string) => {
    if (!profile) throw new Error("Entre na sua conta.");
    const name = label.trim();
    if (!name) throw new Error("Informe o nome da categoria.");
    if (name.length > 40) throw new Error("Use até 40 caracteres.");
    const same = categoryOptions().find(
      ([, text]) => text.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (same) return same[0];
    const id = await createCategory(profile, name);
    apply([...custom, { id, label: name }]);
    return id;
  };
  return { custom, create };
}
