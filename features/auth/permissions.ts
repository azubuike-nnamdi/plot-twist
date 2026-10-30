export const ROLES = ["USER", "ADMIN", "SUPER_ADMIN"] as const
export type Role = (typeof ROLES)[number]

export function isStaff(role: string) {
  return role === "ADMIN" || role === "SUPER_ADMIN"
}

export function canAssignRoles(role: string) {
  return role === "SUPER_ADMIN"
}

export function isHost(actorId: string, hostId: string) {
  return actorId === hostId
}

export function canReadStaffData(role: string) {
  return isStaff(role)
}
