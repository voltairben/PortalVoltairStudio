"use client";

import { addDoc, collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { useFirebaseUser } from "@/hooks/use-firebase-user";
import { postStudioReply } from "@/lib/actions/admin";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS, type CommentAttachment, type FeedbackItem } from "@/types";

/**
 * "client" — the reviewer writes their own comment via the web SDK (offline
 * queue, optimistic). "studio" — an admin replies through the postStudioReply
 * server action (Admin SDK, userRole: "admin"); the onSnapshot listener below
 * brings the reply back. Firestore rules reject an admin creating a comment
 * with a client identity, so the studio path must go through the action.
 */
export type ThreadMode = "client" | "studio";

export interface ThreadComment extends FeedbackItem {
  /** hasPendingWrites — the write is in the local cache but not yet on the server. */
  pending: boolean;
}

export type ThreadStatus = "connecting" | "live" | "offline" | "error";

interface Args {
  deliverableId: string;
  projectId: string;
  clientId: string;
  authorName: string;
  initialComments: FeedbackItem[];
  mode?: ThreadMode;
}

export function useFeedbackThread({
  deliverableId,
  projectId,
  clientId,
  authorName,
  initialComments,
  mode = "client",
}: Args) {
  const { user } = useFirebaseUser();
  const [comments, setComments] = useState<ThreadComment[]>(() =>
    initialComments.map((c) => ({ ...c, pending: false })),
  );
  const [status, setStatus] = useState<ThreadStatus>("connecting");
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // Tenant filter (clientId ==) is mandatory: it is what satisfies the
    // Firestore security rule and guarantees the query can never leak another
    // client's comments.
    const q = query(
      collection(db, COLLECTIONS.comments),
      where("clientId", "==", clientId),
      where("deliverableId", "==", deliverableId),
      orderBy("timestamp", "asc"),
    );

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setComments(
          snapshot.docs.map((doc) => ({
            ...(doc.data() as FeedbackItem),
            commentId: doc.id,
            pending: doc.metadata.hasPendingWrites,
          })),
        );
        setStatus(snapshot.metadata.fromCache ? "offline" : "live");
      },
      () => setStatus("error"),
    );

    return unsubscribe;
  }, [user, clientId, deliverableId]);

  const post = useCallback(
    (text: string, attachments: CommentAttachment[] = []) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return;
      setPostError(null);

      if (mode === "studio") {
        // Admin SDK write via the server action; the onSnapshot listener brings
        // the reply back once it lands. No offline queue — the studio is online.
        void postStudioReply({ deliverableId, projectId, clientId, text: trimmed }).then((res) => {
          if (!res.ok) setPostError(res.error ?? "Your reply couldn't be sent. Try again.");
        });
        return;
      }

      // The doc lands in the local cache synchronously; the listener above
      // re-fires with pending=true so it renders instantly ("Sending…"), and
      // stays queued if offline. We do NOT await — offline that promise never
      // resolves; the snapshot is the source of truth.
      void addDoc(collection(db, COLLECTIONS.comments), {
        deliverableId,
        projectId,
        clientId,
        userId: user.uid,
        userName: authorName || user.displayName || user.email || "Client",
        userRole: "client",
        text: trimmed,
        attachments,
        timestamp: new Date().toISOString(),
      }).catch(() => {
        setPostError("Your comment couldn't be posted. Try again.");
      });
    },
    [user, deliverableId, projectId, clientId, authorName, mode],
  );

  return { comments, status, post, postError, ready: user !== null };
}
