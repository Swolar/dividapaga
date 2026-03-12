interface BalanceBarProps {
  owed: number
  receivable: number
}

export function BalanceBar({ owed, receivable }: BalanceBarProps) {
  const total = owed + receivable
  if (total === 0) return null

  const receivablePercent = (receivable / total) * 100
  const owedPercent = (owed / total) * 100

  return (
    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex">
      {receivable > 0 && (
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-l-full"
          style={{ width: `${receivablePercent}%` }}
        />
      )}
      {owed > 0 && (
        <div
          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-r-full"
          style={{ width: `${owedPercent}%` }}
        />
      )}
    </div>
  )
}
