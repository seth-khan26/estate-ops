import { MemberRole } from "@prisma/client";

type Permission =
  | "properties.read"
  | "properties.manage"
  | "units.read"
  | "units.manage"
  | "owners.read"
  | "owners.manage"
  | "tenants.read"
  | "tenants.manage"
  | "leases.read"
  | "leases.manage"
  | "payments.read"
  | "payments.manage"
  | "maintenance.read"
  | "maintenance.manage"
  | "documents.read"
  | "documents.manage"
  | "audit.read"
  | "users.manage";

const rolePermissions: Record<MemberRole, Permission[]> = {
  OWNER: [
    "properties.read",
    "properties.manage",
    "units.read",
    "units.manage",
    "owners.read",
    "owners.manage",
    "tenants.read",
    "tenants.manage",
    "leases.read",
    "leases.manage",
    "payments.read",
    "payments.manage",
    "maintenance.read",
    "maintenance.manage",
    "documents.read",
    "documents.manage",
    "audit.read",
    "users.manage",
  ],
  PROPERTY_MANAGER: [
    "properties.read",
    "properties.manage",
    "units.read",
    "units.manage",
    "tenants.read",
    "tenants.manage",
    "leases.read",
    "leases.manage",
    "payments.read",
    "payments.manage",
    "maintenance.read",
    "maintenance.manage",
    "documents.read",
    "documents.manage",
  ],
  MAINTENANCE: [
    "maintenance.read",
    "maintenance.manage",
    "documents.read",
    "documents.manage",
  ],
  PROPERTY_OWNER: [
    "properties.read",
    "units.read",
    "leases.read",
    "payments.read",
    "maintenance.read",
  ],
  TENANT: [
    "leases.read",
    "payments.read",
    "maintenance.read",
    "maintenance.manage",
    "documents.read",
  ],
};

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function canManage(role: MemberRole): boolean {
  return role === "OWNER" || role === "PROPERTY_MANAGER";
}
