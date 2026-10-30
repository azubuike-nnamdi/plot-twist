import { questionActiveAction } from "@/app/actions/admin"
import { QuestionForm } from "@/components/admin/staff-forms"
import { listCategories, listQuestions } from "@/features/admin/service"

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
      <section className="rounded-[20px] border border-border bg-card p-5">
        <QuestionForm categories={categories} />
      </section>
      <ul className="grid gap-2">
        {questions.map((question) => (
          <li key={question.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <span>
              {question.text}
              <span className="mt-1 block text-xs text-muted-foreground">
                {question.category.name}
                {question.isAdult ? " · 18+" : ""}
                {question.isActive ? "" : " · inactive"}
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
