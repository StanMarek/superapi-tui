import { Box } from 'ink'
import { useNavigation, useConfig } from '@/hooks/index.js'
import { EndpointList } from '@/components/EndpointList.js'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import { RequestPanel } from '@/components/RequestPanel.js'
import { HelpOverlay } from '@/components/HelpOverlay.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly spec: ParsedSpec
}

export default function App({ spec }: Props) {
  const { focusedPanel, selectedEndpoint, selectEndpoint, setTextCapture, fullscreenPanel, showHelp } = useNavigation()
  const { saveServerAuth, findAuthForServer, preferences } = useConfig()

  return (
    <Box flexDirection="column" width="100%" height="100%">
      {showHelp && <HelpOverlay />}
      <Box
        flexDirection="row"
        width="100%"
        height="100%"
        display={showHelp ? 'none' : 'flex'}
      >
        {(!fullscreenPanel || fullscreenPanel === 'endpoints') && (
          <Box
            width={fullscreenPanel === 'endpoints' ? '100%' : '25%'}
            borderStyle="single"
            borderColor={focusedPanel === 'endpoints' ? 'cyan' : 'gray'}
            flexDirection="column"
          >
            <EndpointList
              tagGroups={spec.tagGroups}
              isFocused={focusedPanel === 'endpoints' && !showHelp}
              onSelectEndpoint={selectEndpoint}
              onTextCaptureChange={setTextCapture}
            />
          </Box>
        )}
        {(!fullscreenPanel || fullscreenPanel === 'detail') && (
          <Box
            width={fullscreenPanel === 'detail' ? '100%' : '38%'}
            borderStyle="single"
            borderColor={focusedPanel === 'detail' ? 'cyan' : 'gray'}
            flexDirection="column"
          >
            <EndpointDetail
              endpoint={selectedEndpoint}
              isFocused={focusedPanel === 'detail' && !showHelp}
              componentSchemas={spec.componentSchemas}
              onTextCaptureChange={setTextCapture}
            />
          </Box>
        )}
        {(!fullscreenPanel || fullscreenPanel === 'request') && (
          <Box
            width={fullscreenPanel === 'request' ? '100%' : '37%'}
            borderStyle="single"
            borderColor={focusedPanel === 'request' ? 'cyan' : 'gray'}
            flexDirection="column"
          >
            <RequestPanel
              endpoint={selectedEndpoint}
              isFocused={focusedPanel === 'request' && !showHelp}
              servers={spec.servers}
              securitySchemes={spec.securitySchemes}
              onTextCaptureChange={setTextCapture}
              onSaveServerAuth={saveServerAuth}
              findAuthForServer={findAuthForServer}
              defaultResponseTab={preferences.defaultResponseTab}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
