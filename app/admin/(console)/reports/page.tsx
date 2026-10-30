import {
  dismissReportAction,
  removeAnswerAction,
  suspendFromReportAction,
} from "@/app/actions/admin"
import { listReports } from "@/features/admin/service"

export default async function ReportsPage() {
  const reports = await listReports()
  return (
    <main className="grid gap-4">
      <h1 className="font-display text-3xl font-bold">Reports</h1>
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports.</p> : null}
      <ul className="grid gap-2">
        {reports.map((report) => (
          <li key={report.id} className="rounded-[16px] border border-border bg-card px-4 py-3 text-sm">
            <p className="font-semibold">
              {report.targetType} · {report.status}
            </p>
            <p className="mt-1">{report.reason}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              From {report.reporter.username ?? report.reporter.email}
            </p>
            {report.status === "OPEN" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={dismissReportAction.bind(null, report.id)}>
                  <button className="rounded-lg border border-border px-3 py-2">Dismiss</button>
                </form>
                {report.targetType === "ANSWER" ? (
                  <form action={removeAnswerAction.bind(null, report.id)}>
                    <button className="rounded-lg border border-border px-3 py-2">Remove answer</button>
                  </form>
                ) : null}
                <form action={suspendFromReportAction.bind(null, report.id)}>
                  <button className="rounded-lg border border-border px-3 py-2">Suspend user</button>
                </form>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </main>
  )
}
