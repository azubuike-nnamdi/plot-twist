import { questionActiveAction } from "@/app/actions/admin"
import { GenerateQuestionsForm, QuestionForm, RefreshQuestionsForm } from "@/components/admin/staff-forms"
import { listCategories, listQuestions } from "@/features/admin/service"

// The refresh button runs every pack through Ollama inside this request.
export const maxDuration = 300

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; active?: string }>
}) {
  const params = await searchParams
  const [questions, categories] = await Promise.all([
    listQuestions(params.q ?? "", params.category ?? "", params.active ?? ""),
    listCategories(),
  ])
  return (
    <main className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Questions</h1>
      <form className="flex flex-wrap gap-2">
        <input name="q" defaultValue={params.q ?? ""} placeholder="Search" className="h-11 rounded-lg border border-border bg-card px-3 text-sm" />
        <select name="active" defaultValue={params.active ?? ""} className="h-11 rounded-lg border border-border bg-card px-3 text-sm">
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="h-11 rounded-lg border border-border bg-card px-4 text-sm">Filter</button>
      </form>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[20px] border border-border bg-card p-5">
          <QuestionForm categories={categories} />
        </section>
        <section className="grid gap-6 rounded-[20px] border border-border bg-card p-5">
          <GenerateQuestionsForm categories={categories} />
          <RefreshQuestionsForm />
        </section>
      </div>
      <ul className="grid gap-2">
        {questions.map((question) => (
          <li key={question.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <span>
              {question.text}
              <span className="mt-1 block text-xs text-muted-foreground">
                {question.category.name}
                {question.isAdult ? " · 18+" : ""}
                {question.isActive ? "" : " · inactive"}
                {question.expiresAt ? " · Ollama, replaced at midnight UTC" : " · staff-written, permanent"}
              </span>
            </span>
            <form action={questionActiveAction.bind(null, question.id, !question.isActive)}>
              <button className="rounded-lg border border-border px-3 py-2">
                {question.isActive ? "Deactivate" : "Publish"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
