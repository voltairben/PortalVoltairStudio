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

export const clientStatusSchema = z.enum(["active", "onboarding", "archived"]);

export const clientCompanySchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  logoUrl: z.url().nullable(),
  status: clientStatusSchema,
  primaryContactUid: z.string().min(1).nullable(),
  primaryContactName: z.string().min(1).nullable(),
  primaryContactEmail: z.email().nullable(),
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

export const projectStatusSchema = z.enum(["active", "completed", "paused"]);
export const projectStageSchema = z.enum([
  "onboarding",
  "design",
  "development",
  "qa",
  "launched",
]);

export const projectDeploymentSchema = z.object({
  state: z.enum(["queued", "building", "ready", "error", "canceled"]),
  url: z.url().nullable(),
  deploymentId: z.string().nullable(),
  branch: z.string().nullable(),
  durationMs: z.number().nonnegative().nullable(),
  updatedAt: isoDateTime,
});

export const projectSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  status: projectStatusSchema,
  stage: projectStageSchema,
  vercelPreviewUrl: z.url().nullable(),
  githubRepo: z.string().nullable(),
  deployment: projectDeploymentSchema.nullable(),
  milestones: z.array(milestoneSchema),
  timeline: z.object({
    startDate: isoDateTime,
    endDate: isoDateTime.nullable(),
  }),
  createdAt: isoDateTime,
});

export const deliverableAssetTypeSchema = z.enum(["image", "video", "pdf"]);
export const deliverableKindSchema = z.enum(["designs", "website", "video", "document"]);

export const deliverableAssetSchema = z.object({
  storagePath: z.string().min(1),
  url: z.string().url(),
  type: deliverableAssetTypeSchema,
  label: z.string().min(1).nullable().optional(),
});

export const deliverableSchema = z.object({
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().min(1),
  fileUrl: z.string().min(1),
  fileType: z.enum(["video", "image", "document", "other"]),
  version: z.number().int().positive(),
  versionLabel: z.string().min(1).nullable(),
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
  /** Optional: also spin up a first project for the client. */
  initialProjectName: z.string().trim().min(1).max(120).optional(),
  /** Optional explicit tenant id; generated from companyName when omitted. */
  clientId: z
    .string()
    .trim()
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/, "lowercase letters, digits and hyphens only")
    .optional(),
});

export type CreateClientInput = z.infer<typeof createClientInputSchema>;

const optionalUrl = z
  .string()
  .trim()
  .url()
  .or(z.literal(""))
  .transform((v) => (v ? v : null))
  .nullable();

/** Admin creates a project. */
export const createProjectInputSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  stage: projectStageSchema.default("onboarding"),
  status: projectStatusSchema.default("active"),
  vercelPreviewUrl: optionalUrl.optional(),
  githubRepo: z.string().trim().max(200).optional().default(""),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

/** Admin edits a project's top-level fields. */
export const updateProjectInputSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000),
  stage: projectStageSchema,
  status: projectStatusSchema,
  vercelPreviewUrl: optionalUrl,
  githubRepo: z.string().trim().max(200),
});
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

/** Admin milestone editor saves the whole ordered list. */
export const milestoneDraftSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  status: z.enum(["pending", "active", "complete"]),
  targetDate: isoDateTime.nullable(),
});
export const updateMilestonesInputSchema = z.object({
  projectId: z.string().min(1),
  milestones: z.array(milestoneDraftSchema).max(40),
});
export type UpdateMilestonesInput = z.infer<typeof updateMilestonesInputSchema>;

/** Admin creates a deliverable record after a direct browser→Storage upload. */
export const createDeliverableInputSchema = z.object({
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  kind: deliverableKindSchema,
  assets: z.array(deliverableAssetSchema).min(1).max(20),
  coverUrl: z.string().url().nullable(),
  siteUrl: z.string().trim().url().nullable().optional(),
  version: z.number().int().positive().max(999),
  versionLabel: z.string().trim().min(1).max(20),
  milestoneId: z.string().min(1).nullable().optional(),
});
export type CreateDeliverableInput = z.infer<typeof createDeliverableInputSchema>;

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

/** Admin posts a reply into a deliverable's comment thread from the Studio Inbox. */
export const studioReplyInputSchema = z.object({
  deliverableId: z.string().min(1),
  projectId: z.string().min(1),
  clientId: z.string().min(1),
  text: z.string().trim().min(1).max(5000),
});
export type StudioReplyInput = z.infer<typeof studioReplyInputSchema>;

export const activitySchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "client-onboarded",
    "project-created",
    "deliverable-published",
    "deliverable-approved",
    "deliverable-changes-requested",
  ]),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  projectId: z.string().min(1).nullable(),
  projectName: z.string().min(1).nullable(),
  deliverableId: z.string().min(1).nullable(),
  deliverableName: z.string().min(1).nullable(),
  actorName: z.string().min(1),
  actorRole: roleSchema,
  summary: z.string().min(1),
  createdAt: isoDateTime,
});
