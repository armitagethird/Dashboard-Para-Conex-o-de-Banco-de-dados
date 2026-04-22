export default function LoadingAuditoria() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex gap-3 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-36 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="skeleton h-14 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
