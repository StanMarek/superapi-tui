import { useState, useEffect, useMemo } from 'react'
import { Box, Text, useInput } from 'ink'
import type { Endpoint, SchemaInfo } from '@/types/index.js'
import { METHOD_COLORS } from '@/utils/http-method.js'
import { useSchemaNavigation } from '@/hooks/useSchemaNavigation.js'
import { useScrollableList } from '@/hooks/useScrollableList.js'
import { ParameterList } from './ParameterList.js'
import { SchemaView } from './SchemaView.js'
import { ResponseList } from './ResponseList.js'

interface Props {
  readonly endpoint: Endpoint | null
  readonly isFocused: boolean
  readonly componentSchemas: ReadonlyMap<string, SchemaInfo>
  readonly onTextCaptureChange?: (active: boolean) => void
}

type SectionId = 'parameters' | 'requestBody' | 'responses'

interface Section {
  readonly id: SectionId
  readonly label: string
}

function buildSections(endpoint: Endpoint): readonly Section[] {
  const sections: Section[] = []
  if (endpoint.parameters.length > 0) {
    sections.push({ id: 'parameters', label: 'Parameters' })
  }
  if (endpoint.requestBody) {
    sections.push({ id: 'requestBody', label: 'Request Body' })
  }
  if (endpoint.responses.length > 0) {
    sections.push({ id: 'responses', label: 'Responses' })
  }
  return sections
}

export function EndpointDetail({ endpoint, isFocused, componentSchemas, onTextCaptureChange }: Props) {
  const schemaNav = useSchemaNavigation()
  const sections = useMemo(() => (endpoint ? buildSections(endpoint) : []), [endpoint])

  const [collapsedSections, setCollapsedSections] = useState<ReadonlySet<SectionId>>(
    () => new Set(sections.map(s => s.id)),
  )

  // Build flat row model for cursor navigation
  // Each row is either a section header or a content indicator
  const rows = useMemo(() => {
    const result: Array<{ readonly type: 'sectionHeader'; readonly sectionId: SectionId; readonly label: string } | { readonly type: 'content'; readonly sectionId: SectionId }> = []
    for (const section of sections) {
      result.push({ type: 'sectionHeader', sectionId: section.id, label: section.label })
      if (!collapsedSections.has(section.id)) {
        result.push({ type: 'content', sectionId: section.id })
      }
    }
    return result
  }, [sections, collapsedSections])

  const { cursorIndex, moveUp, moveDown, moveToTop, moveToBottom } = useScrollableList(rows.length)

  // Reset schema navigation and collapse all sections when endpoint changes
  useEffect(() => {
    schemaNav.reset()
    setCollapsedSections(new Set(sections.map(s => s.id)))
  }, [endpoint, sections])

  // Suppress global keybindings (q quit) when in schema drill-down view
  useEffect(() => {
    onTextCaptureChange?.(schemaNav.currentView === 'schema')
  }, [schemaNav.currentView, onTextCaptureChange])

  const toggleSection = (sectionId: SectionId) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleNavigateRef = (schema: SchemaInfo, label: string) => {
    // Look up in component schemas for full definition; fall back to inline schema if not found
    const fullSchema = label ? componentSchemas.get(label) : undefined
    schemaNav.push(fullSchema ?? schema, label || '(anonymous)')
  }

  // All hooks must precede conditional returns
  useInput(
    (input, key) => {
      // Schema view navigation
      if (schemaNav.currentView === 'schema') {
        if (key.escape || key.backspace || key.delete || input === 'h') {
          schemaNav.pop()
          return
        }
        // Let SchemaView handle its own navigation (j/k/Enter/g/G)
        return
      }

      // Endpoint view navigation
      if (input === 'j' || key.downArrow) {
        moveDown()
        return
      }
      if (input === 'k' || key.upArrow) {
        moveUp()
        return
      }
      if (input === 'g') {
        moveToTop()
        return
      }
      if (input === 'G') {
        moveToBottom()
        return
      }

      // Enter: toggle section collapse on header rows
      if (key.return) {
        const row = rows[cursorIndex]
        if (row?.type === 'sectionHeader') {
          toggleSection(row.sectionId)
        }
        return
      }

      // h: collapse current section, l: expand current section
      if (input === 'h') {
        const row = rows[cursorIndex]
        if (row) {
          const sectionId = row.sectionId
          if (!collapsedSections.has(sectionId)) {
            toggleSection(sectionId)
          }
        }
        return
      }
      if (input === 'l') {
        const row = rows[cursorIndex]
        if (row) {
          const sectionId = row.sectionId
          if (collapsedSections.has(sectionId)) {
            toggleSection(sectionId)
          }
        }
        return
      }
    },
    { isActive: isFocused && endpoint !== null },
  )

  if (!endpoint) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>Endpoint Detail</Text>
        <Text dimColor>No endpoint selected</Text>
      </Box>
    )
  }

  // Schema drill-down view
  if (schemaNav.currentView === 'schema' && schemaNav.currentSchema) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold dimColor={!isFocused}>Endpoint Detail</Text>
        <Box marginTop={1}>
          <Text dimColor>Schema: </Text>
          <Text bold color="cyan">{schemaNav.breadcrumbs.join(' > ')}</Text>
        </Box>
        <Text dimColor>Press Escape or h to go back</Text>
        <Box marginTop={1} flexDirection="column">
          <SchemaView
            schema={schemaNav.currentSchema}
            cursorIndex={-1}
            onNavigateRef={handleNavigateRef}
            isFocused={isFocused}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold dimColor={!isFocused}>Endpoint Detail</Text>
      <Box marginTop={1}>
        <Text color={METHOD_COLORS[endpoint.method]}>{endpoint.method.toUpperCase()}</Text>
        <Text> {endpoint.path}</Text>
        {endpoint.summary && <Text dimColor> -- {endpoint.summary}</Text>}
      </Box>

      {rows.map((row, index) => {
        const isSelected = index === cursorIndex && isFocused

        if (row.type === 'sectionHeader') {
          const isCollapsed = collapsedSections.has(row.sectionId)
          const arrow = isCollapsed ? '\u25b6' : '\u25bc'
          return (
            <Box key={`header-${row.sectionId}`} marginTop={1}>
              <Text inverse={isSelected} bold>
                {arrow} {row.label}
              </Text>
            </Box>
          )
        }

        // Content row
        return (
          <Box key={`content-${row.sectionId}`} flexDirection="column" paddingLeft={2}>
            {row.sectionId === 'parameters' && (
              <ParameterList parameters={endpoint.parameters} />
            )}
            {row.sectionId === 'requestBody' && endpoint.requestBody && (
              <Box flexDirection="column">
                {endpoint.requestBody.description && (
                  <Text dimColor>{endpoint.requestBody.description}</Text>
                )}
                {endpoint.requestBody.required && (
                  <Text color="red">required</Text>
                )}
                {endpoint.requestBody.content.map(media => (
                  <Box key={media.mediaType} flexDirection="column" marginTop={1}>
                    <Text dimColor>{media.mediaType}</Text>
                    {media.schema && (
                      <Box paddingLeft={2}>
                        <SchemaView
                          schema={media.schema}
                          cursorIndex={-1}
                          onNavigateRef={handleNavigateRef}
                        />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            )}
            {row.sectionId === 'responses' && (
              <ResponseList
                responses={endpoint.responses}
                onNavigateRef={handleNavigateRef}
              />
            )}
          </Box>
        )
      })}
    </Box>
  )
}
