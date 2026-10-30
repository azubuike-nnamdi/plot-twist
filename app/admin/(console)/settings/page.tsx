import { SettingsForm } from "@/components/admin/staff-forms"
import { getSettings } from "@/features/admin/service"

export default async function SettingsPage() {
  const settings = await getSettings()
  return (
    <main className="grid gap-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <section className="rounded-[20px] border border-border bg-card p-5">
        <SettingsForm settings={settings} />
      </section>
    </main>
  )
}
