import "server-only"

import { canAssignRoles, isStaff } from "@/features/auth/permissions"
import { closeRoom } from "@/features/rooms/engine"
import { touchRooms } from "@/features/rooms/touch"
import { writeAudit } from "@/lib/audit"
import { prisma } from "@/lib/db/prisma"
import { AppError } from "@/lib/errors"

const userFields = {
  id: true,
  name: true,
  email: true,
  username: true,
  role: true,
  avatar: true,
  status: true,
  createdAt: true,
} as const

function assertStaff(role: string) {
  if (!isStaff(role)) {
    throw new AppError("You do not have access to that.", "FORBIDDEN")
  }
}

export async function dashboardStats() {
  const [users, rooms, activeRooms, completed, reports, activity] =
    await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.room.count({ where: { status: { in: ["WAITING", "IN_PROGRESS"] } } }),
      prisma.room.count({ where: { status: "COMPLETED" } }),
      prisma.report.count({ where: { status: "OPEN" } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { actor: { select: { username: true, email: true } } },
      }),
    ])
  return { users, rooms, activeRooms, completed, reports, activity }
}

export async function listQuestions(query: string, categoryId: string, active: string) {
  return prisma.question.findMany({
    where: {
      ...(query ? { text: { contains: query, mode: "insensitive" } } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(active === "active" ? { isActive: true } : {}),
      ...(active === "inactive" ? { isActive: false } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })
}

export async function saveQuestion(input: {
  actorRole: string
  actorId: string
  id?: string
  text: string
  categoryId: string
  isAdult: boolean
}) {
  assertStaff(input.actorRole)
  const text = input.text.trim()
  if (text.length < 8 || text.length > 280) {
    throw new AppError("Questions are 8 to 280 characters.", "VALIDATION")
  }
  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  })
  if (!category) throw new AppError("Choose a category.", "VALIDATION")
  const question = input.id
    ? await prisma.question.update({
      where: { id: input.id },
      data: { text, categoryId: input.categoryId, isAdult: input.isAdult },
    })
    : await prisma.question.create({
      data: {
        text,
        categoryId: input.categoryId,
        isAdult: input.isAdult,
        isActive: true,
      },
    })
  await writeAudit({
    actorId: input.actorId,
    action: input.id ? "question.update" : "question.create",
    targetType: "QUESTION",
    targetId: question.id,
  })
  return question
}

export async function setQuestionActive(input: {
  actorRole: string
  actorId: string
  id: string
  isActive: boolean
}) {
  assertStaff(input.actorRole)
  await prisma.question.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  })
  await writeAudit({
    actorId: input.actorId,
    action: input.isActive ? "question.publish" : "question.deactivate",
    targetType: "QUESTION",
    targetId: input.id,
  })
}

export async function listCategories() {
  return prisma.category.findMany({ orderBy: { name: "asc" } })
}

export async function saveCategory(input: {
  actorRole: string
  actorId: string
  id?: string
  name: string
  description: string
  isAdult: boolean
}) {
  assertStaff(input.actorRole)
  const name = input.name.trim()
  const description = input.description.trim()
  if (name.length < 2 || name.length > 40) {
    throw new AppError("Category names are 2 to 40 characters.", "VALIDATION")
  }
  if (description.length < 4 || description.length > 180) {
    throw new AppError("Add a short description.", "VALIDATION")
  }
  const category = input.id
    ? await prisma.category.update({
      where: { id: input.id },
      data: { name, description, isAdult: input.isAdult },
    })
    : await prisma.category.create({
      data: { name, description, isAdult: input.isAdult, isActive: true },
    })
  await writeAudit({
    actorId: input.actorId,
    action: input.id ? "category.update" : "category.create",
    targetType: "CATEGORY",
    targetId: category.id,
  })
}

export async function setCategoryActive(input: {
  actorRole: string
  actorId: string
  id: string
  isActive: boolean
}) {
  assertStaff(input.actorRole)
  await prisma.category.update({
    where: { id: input.id },
    data: { isActive: input.isActive },
  })
  await writeAudit({
    actorId: input.actorId,
    action: input.isActive ? "category.activate" : "category.deactivate",
    targetType: "CATEGORY",
    targetId: input.id,
  })
}

export async function searchUsers(query: string) {
  return prisma.user.findMany({
    where: query
      ? {
        OR: [
          { email: { contains: query, mode: "insensitive" } },
          { username: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      }
      : {},
    select: userFields,
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function setUserStatus(input: {
  actorRole: string
  actorId: string
  userId: string
  status: "ACTIVE" | "SUSPENDED"
}) {
  assertStaff(input.actorRole)
  if (input.actorId === input.userId) {
    throw new AppError("You cannot change your own status.", "FORBIDDEN")
  }
  await prisma.user.update({
    where: { id: input.userId },
    data: { status: input.status },
  })
  if (input.status === "SUSPENDED") {
    await prisma.session.deleteMany({ where: { userId: input.userId } })
  }
  await writeAudit({
    actorId: input.actorId,
    action: input.status === "ACTIVE" ? "user.reactivate" : "user.suspend",
    targetType: "USER",
    targetId: input.userId,
  })
}

export async function setUserRole(input: {
  actorRole: string
  actorId: string
  userId: string
  role: "USER" | "ADMIN" | "SUPER_ADMIN"
}) {
  if (!canAssignRoles(input.actorRole)) {
    throw new AppError("Only a super admin can change roles.", "FORBIDDEN")
  }
  if (input.actorId === input.userId) {
    throw new AppError("You cannot change your own role.", "FORBIDDEN")
  }
  await prisma.user.update({
    where: { id: input.userId },
    data: { role: input.role },
  })
  await writeAudit({
    actorId: input.actorId,
    action: "user.role",
    targetType: "USER",
    targetId: input.userId,
    metadata: { role: input.role },
  })
}

export async function listRooms(status: string) {
  return prisma.room.findMany({
    where:
      status === "WAITING" ||
        status === "IN_PROGRESS" ||
        status === "COMPLETED" ||
        status === "CLOSED"
        ? { status }
        : {},
    include: {
      host: { select: { username: true, email: true } },
      _count: { select: { players: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function staffCloseRoom(input: {
  actorRole: string
  actorId: string
  code: string
  reason: string
}) {
  assertStaff(input.actorRole)
  if (input.reason.trim().length < 4) {
    throw new AppError("Add a reason before closing the room.", "VALIDATION")
  }
  await closeRoom({
    actorId: input.actorId,
    code: input.code,
    asStaff: true,
    reason: input.reason.trim(),
  })
}

export async function listReports() {
  return prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reporter: { select: { username: true, email: true } },
    },
  })
}

export async function dismissReport(input: {
  actorRole: string
  actorId: string
  reportId: string
}) {
  assertStaff(input.actorRole)
  await prisma.report.update({
    where: { id: input.reportId },
    data: {
      status: "DISMISSED",
      reviewedBy: input.actorId,
      reviewedAt: new Date(),
    },
  })
  await writeAudit({
    actorId: input.actorId,
    action: "report.dismiss",
    targetType: "REPORT",
    targetId: input.reportId,
  })
}

export async function removeReportedAnswer(input: {
  actorRole: string
  actorId: string
  reportId: string
}) {
  assertStaff(input.actorRole)
  const report = await prisma.report.findUnique({ where: { id: input.reportId } })
  if (!report || report.targetType !== "ANSWER") {
    throw new AppError("That report is not an answer.", "VALIDATION")
  }
  await prisma.answer.update({
    where: { id: report.targetId },
    data: { removed: true, answerText: "Removed by a moderator." },
  })
  await touchRooms(prisma, { rounds: { some: { answers: { some: { id: report.targetId } } } } })
  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: "ACTIONED",
      reviewedBy: input.actorId,
      reviewedAt: new Date(),
    },
  })
  await writeAudit({
    actorId: input.actorId,
    action: "answer.remove",
    targetType: "ANSWER",
    targetId: report.targetId,
  })
}

export async function suspendReportedUser(input: {
  actorRole: string
  actorId: string
  reportId: string
}) {
  assertStaff(input.actorRole)
  const report = await prisma.report.findUnique({ where: { id: input.reportId } })
  if (!report) throw new AppError("Report not found.", "NOT_FOUND")
  let userId = report.targetType === "USER" ? report.targetId : null
  if (report.targetType === "ANSWER") {
    const answer = await prisma.answer.findUnique({
      where: { id: report.targetId },
      include: { player: true },
    })
    userId = answer?.player.userId ?? null
  }
  if (!userId) throw new AppError("No user is attached to that report.", "VALIDATION")
  await setUserStatus({
    actorRole: input.actorRole,
    actorId: input.actorId,
    userId,
    status: "SUSPENDED",
  })
  await prisma.report.update({
    where: { id: report.id },
    data: {
      status: "ACTIONED",
      reviewedBy: input.actorId,
      reviewedAt: new Date(),
    },
  })
}

export async function updateSettings(input: {
  actorRole: string
  actorId: string
  defaultRounds: number
  defaultAnswerTimer: number
  defaultGuessingTimer: number
  defaultMaxPlayers: number
  roomLifetimeMinutes: number
  minPlayers: number
}) {
  assertStaff(input.actorRole)
  if (input.minPlayers < 2 || input.minPlayers > 16) {
    throw new AppError("Minimum players must be between 2 and 16.", "VALIDATION")
  }
  await prisma.platformSetting.upsert({
    where: { id: "default" },
    update: {
      defaultRounds: input.defaultRounds,
      defaultAnswerTimer: input.defaultAnswerTimer,
      defaultGuessingTimer: input.defaultGuessingTimer,
      defaultMaxPlayers: input.defaultMaxPlayers,
      roomLifetimeMinutes: input.roomLifetimeMinutes,
      minPlayers: input.minPlayers,
    },
    create: {
      id: "default",
      defaultRounds: input.defaultRounds,
      defaultAnswerTimer: input.defaultAnswerTimer,
      defaultGuessingTimer: input.defaultGuessingTimer,
      defaultMaxPlayers: input.defaultMaxPlayers,
      roomLifetimeMinutes: input.roomLifetimeMinutes,
      minPlayers: input.minPlayers,
    },
  })
  await writeAudit({
    actorId: input.actorId,
    action: "settings.update",
    targetType: "SETTINGS",
    targetId: "default",
  })
}

export async function getSettings() {
  return prisma.platformSetting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  })
}
