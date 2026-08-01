/** Client-safe permission catalogue. The database is still the enforcement
 * boundary (RLS + role checks); this map only drives what the UI offers. */

export const PERMISSIONS = [
  "system.full_access",
  "orgs.manage",
  "users.manage",
  "agents.manage",
  "prompts.manage",
  "connectors.manage",
  "workflows.manage",
  "security.manage",
  "secrets.manage",
  "billing.manage",
  "storage.manage",
  "models.manage",
  "knowledge.manage",
  "rag.manage",
  "api_keys.manage",
  "audit.view",
  "runs.execute",
  "approvals.decide",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type Role = "owner" | "admin" | "manager" | "employee" | "client";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  admin: PERMISSIONS.filter((p) => p !== "system.full_access" && p !== "orgs.manage"),
  manager: [
    "agents.manage",
    "prompts.manage",
    "connectors.manage",
    "workflows.manage",
    "audit.view",
    "runs.execute",
    "approvals.decide",
  ],
  employee: ["runs.execute"],
  client: [],
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  "system.full_access": "Full system access",
  "orgs.manage": "Manage organizations",
  "users.manage": "Manage users",
  "agents.manage": "Manage AI agents",
  "prompts.manage": "Manage prompts",
  "connectors.manage": "Manage connectors",
  "workflows.manage": "Manage workflows",
  "security.manage": "Manage security",
  "secrets.manage": "Manage secrets",
  "billing.manage": "Manage billing",
  "storage.manage": "Manage storage",
  "models.manage": "Manage models",
  "knowledge.manage": "Manage knowledge base",
  "rag.manage": "Manage RAG",
  "api_keys.manage": "Manage API keys",
  "audit.view": "View audit logs",
  "runs.execute": "Run agents",
  "approvals.decide": "Decide approvals",
};

export function permissionsForRoles(roles: readonly string[]): Permission[] {
  const set = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role as Role] ?? []) set.add(permission);
  }
  return PERMISSIONS.filter((p) => set.has(p));
}

export function highestRole(roles: readonly string[]): Role | null {
  const order: Role[] = ["owner", "admin", "manager", "employee", "client"];
  return order.find((r) => roles.includes(r)) ?? null;
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner / Super Admin",
  admin: "Administrator",
  manager: "Manager",
  employee: "Employee",
  client: "Client",
};
