import { Text } from 'ink'

interface Props {
  readonly direction: 'up' | 'down'
  readonly visible: boolean
}

export function ScrollIndicator({ direction, visible }: Props) {
  if (!visible) return null
  const label = direction === 'up' ? '-- more above --' : '-- more below --'
  return <Text dimColor>{label}</Text>
}
