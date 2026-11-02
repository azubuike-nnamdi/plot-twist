"use server"

import { revalidatePath } from "next/cache"

import {
  dismissReport,
  removeReportedAnswer,
  saveCategory,
  saveQuestion,
  setCategoryActive,
  setQuestionActive,
  setUserRole,
  setUserStatus,
  staffCloseRoom,
  suspendReportedUser,
  updateSettings,
} from "@/features/admin/service"
import { generateQuestions } from "@/features/questions/generate"
import { requireStaff } from "@/lib/auth/session"
import { errorMessage } from "@/lib/errors"

export type ActionState = { error?: string; success?: string } | null

function fail(error: unknown): ActionState {
  return { error: errorMessage(error, "That change could not be saved.") }
}

export async function saveQuestionAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await requireStaff()
    await saveQuestion({
      actorRole: actor.role,
      actorId: actor.id,
      id: String(formData.get("id") ?? "") || undefined,
      text: String(formData.get("text") ?? ""),
      categoryId: String(formData.get("categoryId") ?? ""),
      isAdult: formData.get("isAdult") === "on",
    })
    revalidatePath("/admin/questions")
    return { success: "Question saved." }
  } catch (error) {
    return fail(error)
  }
}

export async function generateQuestionsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await requireStaff()
    const saved = await generateQuestions({
      actorRole: actor.role,
      actorId: actor.id,
      categoryId: String(formData.get("categoryId") ?? ""),
      count: Number(formData.get("count") ?? ""),
      isAdult: formData.get("isAdult") === "on",
    })
    revalidatePath("/admin/questions")
    return { success: `Saved ${saved} inactive ${saved === 1 ? "question" : "questions"}.` }
  } catch (error) {
    return fail(error)
  }
}

export async function questionActiveAction(id: string, isActive: boolean) {
  const actor = await requireStaff()
  await setQuestionActive({
    actorRole: actor.role,
    actorId: actor.id,
    id,
    isActive,
  })
  revalidatePath("/admin/questions")
}

export async function saveCategoryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await requireStaff()
    await saveCategory({
      actorRole: actor.role,
      actorId: actor.id,
      id: String(formData.get("id") ?? "") || undefined,
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      isAdult: formData.get("isAdult") === "on",
    })
    revalidatePath("/admin/categories")
    return { success: "Category saved." }
  } catch (error) {
    return fail(error)
  }
}

export async function categoryActiveAction(id: string, isActive: boolean) {
  const actor = await requireStaff()
  await setCategoryActive({
    actorRole: actor.role,
    actorId: actor.id,
    id,
    isActive,
  })
  revalidatePath("/admin/categories")
}

export async function userStatusAction(userId: string, status: "ACTIVE" | "SUSPENDED") {
  const actor = await requireStaff()
  await setUserStatus({
    actorRole: actor.role,
    actorId: actor.id,
    userId,
    status,
  })
  revalidatePath("/admin/users")
}

export async function userRoleAction(
  userId: string,
  role: "USER" | "ADMIN" | "SUPER_ADMIN"
) {
  const actor = await requireStaff()
  await setUserRole({
    actorRole: actor.role,
    actorId: actor.id,
    userId,
    role,
  })
  revalidatePath("/admin/users")
}

export async function closeRoomAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await requireStaff()
    await staffCloseRoom({
      actorRole: actor.role,
      actorId: actor.id,
      code: String(formData.get("code") ?? ""),
      reason: String(formData.get("reason") ?? ""),
    })
    revalidatePath("/admin/rooms")
    return { success: "Room closed." }
  } catch (error) {
    return fail(error)
  }
}

export async function dismissReportAction(reportId: string) {
  const actor = await requireStaff()
  await dismissReport({
    actorRole: actor.role,
    actorId: actor.id,
    reportId,
  })
  revalidatePath("/admin/reports")
}

export async function removeAnswerAction(reportId: string) {
  const actor = await requireStaff()
  await removeReportedAnswer({
    actorRole: actor.role,
    actorId: actor.id,
    reportId,
  })
  revalidatePath("/admin/reports")
}

export async function suspendFromReportAction(reportId: string) {
  const actor = await requireStaff()
  await suspendReportedUser({
    actorRole: actor.role,
    actorId: actor.id,
    reportId,
  })
  revalidatePath("/admin/reports")
}

export async function settingsAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const actor = await requireStaff()
    await updateSettings({
      actorRole: actor.role,
      actorId: actor.id,
      defaultRounds: Number(formData.get("defaultRounds")),
      defaultAnswerTimer: Number(formData.get("defaultAnswerTimer")),
      defaultGuessingTimer: Number(formData.get("defaultGuessingTimer")),
      defaultMaxPlayers: Number(formData.get("defaultMaxPlayers")),
      roomLifetimeMinutes: Number(formData.get("roomLifetimeMinutes")),
      minPlayers: Number(formData.get("minPlayers")),
    })
    revalidatePath("/admin/settings")
    return { success: "Settings saved." }
  } catch (error) {
    return fail(error)
  }
}
