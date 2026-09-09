import { z } from "zod";

/**
 * Zod schemas mirroring src/types/*. Entity schemas validate documents read from
 * or written to Firestore; input schemas validate untrusted action payloads.
 */

export const roleSchema = z.enum(["admin", "client"]);

const isoDateTime = z.iso.datetime();

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export const userProfileSchema = z.object({
  uid: z.string().min(1),
  email: z.email(),
  displayName: z.string().min(1),
  role: roleSchema,
  clientId: z.string().min(1).nullable(),
  avatarUrl: z.url().nullable(),
  createdAt: isoDateTime,
});

export const clientCompanySchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.url().nullable(),
  status: z.enum(["active", "inactive"]),
  createdAt: isoDateTime,
});

export const milestoneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["pending", "active", "complete"]),
  order: z.number().int().nonnegative(),
  targetDate: isoDateTime.nullable(),
  completedAt: isoDateTime.nullable(),
});

export const projectSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(["active", "completed", "paused"]),
  stage: z.enum(["onboarding", "design", "development", "qa", "launched"]),
  stagingUrl: z.url().nullable(),
  milestones: z.array(milestoneSchema),
  timeline: z.object({
    startDate: isoDateTime,
    endDate: isoDateTime.nullable(),
  }),
  createdAt: isoDateTime,
});

export const deliverableSchema = z.object({
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.enum(["video", "image", "document", "other"]),
  version: z.number().int().positive(),
  status: z.enum(["pending", "approved", "changes-requested"]),
  feedbackCount: z.number().int().nonnegative(),
  decidedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
});

export const commentAttachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().min(1),
  size: z.number().int().nonnegative(),
  contentType: z.string().min(1),
});

export const feedbackItemSchema = z.object({
  commentId: z.string().min(1),
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userRole: roleSchema,
  text: z.string().trim().min(1).max(5000),
  attachments: z.array(commentAttachmentSchema),
  timestamp: isoDateTime,
});

// ---------------------------------------------------------------------------
// Action inputs
// ---------------------------------------------------------------------------

/** Payload for the admin "create client + account" action. */
export const createClientInputSchema = z.object({
  companyName: z.string().trim().min(1).max(120),
  email: z.email().trim().toLowerCase(),
  displayName: z.string().trim().min(1).max(120),
  /** Optional explicit tenant id; generated from companyName when omitted. */
  clientId: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/, "lowercase letters, digits and hyphens only")
    .optional(),
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

/** Comment a client posts from the browser (client SDK write). */
export const newCommentInputSchema = z.object({
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  text: z.string().trim().min(1).max(5000),
  attachments: z.array(commentAttachmentSchema).max(10).default([]),
});

export type NewCommentInput = z.infer<typeof newCommentInputSchema>;

/** Payload for the deliverable approve / request-changes server actions. */
export const deliverableDecisionSchema = z.object({
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
});

export type DeliverableDecisionInput = z.infer<typeof deliverableDecisionSchema>;
