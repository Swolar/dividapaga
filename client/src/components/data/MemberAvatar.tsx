interface MemberAvatarProps {
  name: string
  url?: string | null
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
}

export function MemberAvatar({ name, url, size = 'md' }: MemberAvatarProps) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-border-glass`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-primary flex items-center justify-center font-semibold text-white ring-2 ring-border-glass`}
    >
      {initials}
    </div>
  )
}
