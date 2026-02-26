import { Box, Text } from 'ink'
import type { ParameterInfo, ParameterLocation } from '@/types/index.js'

interface Props {
  readonly parameters: readonly ParameterInfo[]
  readonly maxLines?: number
}

const LOCATION_ORDER: readonly ParameterLocation[] = ['path', 'query', 'header', 'cookie']

const LOCATION_LABELS: Record<ParameterLocation, string> = {
  path: 'Path',
  query: 'Query',
  header: 'Header',
  cookie: 'Cookie',
}

function groupByLocation(
  parameters: readonly ParameterInfo[],
): ReadonlyMap<ParameterLocation, readonly ParameterInfo[]> {
  const groups = new Map<ParameterLocation, ParameterInfo[]>()
  for (const param of parameters) {
    const existing = groups.get(param.location)
    if (existing) {
      existing.push(param)
    } else {
      groups.set(param.location, [param])
    }
  }
  return groups
}

export function ParameterList({ parameters, maxLines }: Props) {
  if (parameters.length === 0) {
    return <Text dimColor>No parameters</Text>
  }

  const grouped = groupByLocation(parameters)

  // Flatten to count total params for truncation message
  const totalParams = parameters.length
  let linesUsed = 0
  let paramsRendered = 0
  let truncated = false

  const elements: React.ReactNode[] = []

  for (const location of LOCATION_ORDER) {
    const params = grouped.get(location)
    if (!params || params.length === 0) continue

    // Location header costs 1 line (+ marginBottom costs 1 line for non-last groups)
    if (maxLines !== undefined && linesUsed + 1 >= maxLines) {
      truncated = true
      break
    }

    const paramElements: React.ReactNode[] = []
    linesUsed += 1 // location header

    for (const param of params) {
      if (maxLines !== undefined && linesUsed + 1 >= maxLines) {
        truncated = true
        break
      }
      linesUsed += 1
      paramsRendered += 1
      paramElements.push(
        <Box key={param.name} paddingLeft={2}>
          <Text strikethrough={param.deprecated}>
            <Text bold={param.required}>{param.name}</Text>
            {'  '}
            <Text dimColor>{param.schema?.displayType ?? 'any'}</Text>
            {param.required && <Text color="red"> *</Text>}
            {param.deprecated && <Text dimColor> deprecated</Text>}
            {param.schema?.enumValues && (
              <Text dimColor> enum: [{param.schema.enumValues.join(', ')}]</Text>
            )}
            {param.schema?.format && (
              <Text dimColor> ({param.schema.format})</Text>
            )}
          </Text>
        </Box>,
      )
    }

    elements.push(
      <Box key={location} flexDirection="column" marginBottom={1}>
        <Text bold dimColor>
          {LOCATION_LABELS[location]} Parameters
        </Text>
        {paramElements}
      </Box>,
    )

    linesUsed += 1 // marginBottom

    if (truncated) break
  }

  const remaining = totalParams - paramsRendered

  return (
    <Box flexDirection="column">
      {elements}
      {truncated && remaining > 0 && (
        <Text dimColor>... {remaining} more parameters</Text>
      )}
    </Box>
  )
}
