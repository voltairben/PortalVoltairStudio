export interface ClientCompany {
  clientId: string;
  name: string;
  logoUrl: string | null;
  status: "active" | "inactive";
  createdAt: string; // ISO 8601
}
