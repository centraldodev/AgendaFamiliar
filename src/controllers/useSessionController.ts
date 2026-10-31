import type { User } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import type { Family } from "../models/Family";
import type { Profile } from "../models/Profile";
import { subscribeToAuth } from "../services/auth/subscribeToAuth";
import { loadSessionContext } from "../services/session/loadSessionContext";
import { message } from "../utils/message";
import { withReadTimeout } from "../utils/withReadTimeout";
export function useSessionController() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const loadSession = async (currentUser: User, token: number) => {
    try {
      const context = await withReadTimeout(loadSessionContext(currentUser));
      if (token === generation.current) {
        setProfile(context.profile);
        setFamily(context.family);
      }
    } catch (error) {
      if (token === generation.current) setError(message(error));
    } finally {
      if (token === generation.current) setLoading(false);
    }
  };
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      const token = ++generation.current;
      setUser(currentUser);
      setLoading(true);
      setProfile(null);
      setFamily(null);
      setError("");
      if (!currentUser) {
        setLoading(false);
        return;
      }
      void loadSession(currentUser, token);
    });
    return () => {
      generation.current++;
      unsubscribe();
    };
  }, []);
  const retry = async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    await loadSession(user, ++generation.current);
  };
  const adoptFamily = (nextProfile: Profile, nextFamily: Family) => {
    setProfile(nextProfile);
    setFamily(nextFamily);
  };
  return {
    user,
    profile,
    family,
    loading,
    error,
    generation,
    retry,
    adoptFamily,
  };
}
