import { ReportSkeleton } from '@/components/ai-reports/report-skeleton'

export default function HomeLoading() {
  return (
    <div className="p-4 lg:p-6">
      <ReportSkeleton />
    </div>
  )
}
