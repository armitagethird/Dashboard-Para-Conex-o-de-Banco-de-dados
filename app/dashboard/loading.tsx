export default function DashboardLoading() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--bg-base)' }}
    >
      <div
        className="h-2 w-32 animate-pulse rounded-full"
        style={{ backgroundColor: 'var(--bg-elevated)' }}
      />
    </div>
  )
}
