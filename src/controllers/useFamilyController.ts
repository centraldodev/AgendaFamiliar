import { useState } from "react";
import { requireAuthenticatedUser } from "../middlewares/requireAuthenticatedUser";
import type { Family } from "../models/Family";
import type { Profile } from "../models/Profile";
import { familyAction } from "../services/families/familyAction";
import { loadSessionContext } from "../services/session/loadSessionContext";
import { withReadTimeout } from "../utils/withReadTimeout";
export function useFamilyController(
  adoptFamily: (profile: Profile, family: Family) => void,
) {
  const [familyName, setFamilyName] = useState("");
  const [code, setCode] = useState("");
  const join = async (action: "create" | "join") => {
    const user = requireAuthenticatedUser();
    await familyAction(action, action === "create" ? familyName : code);
    const context = await withReadTimeout(loadSessionContext(user));
    if (!context.family) throw new Error("Família não encontrada.");
    adoptFamily(context.profile, context.family);
  };
  return { familyName, setFamilyName, code, setCode, join };
}
