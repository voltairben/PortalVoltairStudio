"use client";

import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { useFirebaseUser } from "@/hooks/use-firebase-user";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS, type Project, type ProjectDeployment, type PulseEvent } from "@/types";

export type PulseStatus = "connecting" | "live" | "offline";

interface Args {
  projectId: string;
  clientId: string;
  initialEvents: PulseEvent[];
  initialDeployment: ProjectDeployment | null;
}

/**
 * Two Firestore listeners, zero external API calls:
 *  - the project doc for the live deployment badge
 *  - `pulseEvents` (tenant + project scoped) for the velocity stream
 * The `clientId ==` filter is what satisfies the security rule.
 */
export function useProjectPulse({ projectId, clientId, initialEvents, initialDeployment }: Args) {
  const { user } = useFirebaseUser();
  const [events, setEvents] = useState<PulseEvent[]>(initialEvents);
  const [deployment, setDeployment] = useState<ProjectDeployment | null>(initialDeployment);
  const [status, setStatus] = useState<PulseStatus>("connecting");

  useEffect(() => {
    if (!user) return;

    const unsubProject = onSnapshot(
      doc(db, COLLECTIONS.projects, projectId),
      (snap) => {
        const data = snap.data() as Project | undefined;
        setDeployment(data?.deployment ?? null);
      },
      () => {},
    );

    const unsubEvents = onSnapshot(
      query(
        collection(db, COLLECTIONS.pulseEvents),
        where("clientId", "==", clientId),
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc"),
        limit(25),
      ),
      { includeMetadataChanges: true },
      (snap) => {
        setEvents(snap.docs.map((d) => ({ ...(d.data() as PulseEvent), id: d.id })));
        setStatus(snap.metadata.fromCache ? "offline" : "live");
      },
      () => setStatus("offline"),
    );

    return () => {
      unsubProject();
      unsubEvents();
    };
  }, [user, clientId, projectId]);

  return { events, deployment, status };
}
