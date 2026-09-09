"use client";

import { onIdTokenChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/client";

/** The Firebase Web SDK's current user — needed before any client-side Firestore listener. */
export function useFirebaseUser(): { user: User | null; loading: boolean } {
  const [user, setUser] = useState<User | null>(() => auth.currentUser);
  const [loading, setLoading] = useState(() => auth.currentUser === null);

  useEffect(() => {
    return onIdTokenChanged(auth, (next) => {
      setUser(next);
      setLoading(false);
    });
  }, []);

  return { user, loading };
}
