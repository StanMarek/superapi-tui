import { Box } from 'ink'
import { useNavigation } from '@/hooks/index.js'
import { EndpointList } from '@/components/EndpointList.js'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import { RequestPanel } from '@/components/RequestPanel.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly spec: ParsedSpec
}

export default function App({ spec }: Props) {
  const { focusedPanel, selectedEndpoint, selectEndpoint, setTextCapture } = useNavigation()

  return (
    <Box flexDirection="row" width="100%" height="100%">
      <Box
        width="25%"
        borderStyle="single"
        borderColor={focusedPanel === 'endpoints' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <EndpointList
          tagGroups={spec.tagGroups}
          isFocused={focusedPanel === 'endpoints'}
          onSelectEndpoint={selectEndpoint}
          onTextCaptureChange={setTextCapture}
        />
      </Box>
      <Box
        width="38%"
        borderStyle="single"
        borderColor={focusedPanel === 'detail' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <EndpointDetail
          endpoint={selectedEndpoint}
          isFocused={focusedPanel === 'detail'}
          componentSchemas={spec.componentSchemas}
        />
      </Box>
      <Box
        width="37%"
        borderStyle="single"
        borderColor={focusedPanel === 'request' ? 'cyan' : 'gray'}
        flexDirection="column"
      >
        <RequestPanel
          endpoint={selectedEndpoint}
          isFocused={focusedPanel === 'request'}
        />
      </Box>
    </Box>
  )
}
