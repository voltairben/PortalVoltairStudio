export type ClientStatus = "active" | "onboarding" | "archived";

export interface ClientCompany {
  clientId: string;
  name: string;
  logoUrl: string | null;
  status: ClientStatus;
  /** Denormalized from the first user account created at onboarding. */
  primaryContactUid: string | null;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  createdAt: string; // ISO 8601
}
