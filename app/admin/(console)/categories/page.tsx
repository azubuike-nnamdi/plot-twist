import { categoryActiveAction } from "@/app/actions/admin"
import { CategoryForm } from "@/components/admin/staff-forms"
import { listCategories } from "@/features/admin/service"

export default async function CategoriesPage() {
  const categories = await listCategories()
  return (
    <main className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Categories</h1>
      <section className="rounded-[20px] border border-border bg-card p-5">
        <CategoryForm />
      </section>
      <ul className="grid gap-2">
        {categories.map((category) => (
          <li key={category.id} className="flex items-center justify-between gap-3 rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <span>
              {category.name}
              {category.isAdult ? " · 18+" : ""}
              <span className="mt-1 block text-xs text-muted-foreground">{category.description}</span>
            </span>
            <form action={categoryActiveAction.bind(null, category.id, !category.isActive)}>
              <button className="rounded-lg border border-border px-3 py-2">
                {category.isActive ? "Deactivate" : "Publish"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  )
}
