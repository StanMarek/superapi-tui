import { Box, Text } from 'ink'
import type { ParameterInfo, ParameterLocation } from '@/types/index.js'

interface Props {
  readonly parameters: readonly ParameterInfo[]
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

export function ParameterList({ parameters }: Props) {
  if (parameters.length === 0) {
    return <Text dimColor>No parameters</Text>
  }

  const grouped = groupByLocation(parameters)

  return (
    <Box flexDirection="column">
      {LOCATION_ORDER.map(location => {
        const params = grouped.get(location)
        if (!params || params.length === 0) return null

        return (
          <Box key={location} flexDirection="column" marginBottom={1}>
            <Text bold dimColor>
              {LOCATION_LABELS[location]} Parameters
            </Text>
            {params.map(param => (
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
              </Box>
            ))}
          </Box>
        )
      })}
    </Box>
  )
}
