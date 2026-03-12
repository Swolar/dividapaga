import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function timeAgo(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

export function formatDate(date: string): string {
  return format(new Date(date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })
}

export function formatDateTime(date: string): string {
  return format(new Date(date), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}
