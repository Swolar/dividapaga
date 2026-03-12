import type { ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render: (item: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  emptyMessage?: string
}

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage = 'Nenhum dado' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-center text-sm text-slate-500 py-8">{emptyMessage}</p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-glass">
            {columns.map(col => (
              <th
                key={col.key}
                className={`text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3 px-4 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr
              key={keyExtractor(item)}
              className="border-b border-border-glass/50 hover:bg-white/[0.02] transition-colors"
            >
              {columns.map(col => (
                <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                  {col.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
