export type Role = "admin" | "client";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  clientId: string | null; // Null for administrators
  avatarUrl: string | null;
  phone: string | null;
  jobTitle: string | null;
  createdAt: string; // ISO 8601
}
