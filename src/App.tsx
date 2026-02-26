import { Box } from 'ink'
import { useNavigation, useConfig, useTerminalHeight } from '@/hooks/index.js'
import { EndpointList } from '@/components/EndpointList.js'
import { EndpointDetail } from '@/components/EndpointDetail.js'
import { RequestPanel } from '@/components/RequestPanel.js'
import { HelpOverlay } from '@/components/HelpOverlay.js'
import type { ParsedSpec } from '@/types/index.js'

interface Props {
  readonly spec: ParsedSpec
  readonly specLoadUrl?: string
  readonly savedRequestBaseUrl?: string
}

export default function App({ spec, specLoadUrl, savedRequestBaseUrl }: Props) {
  const { focusedPanel, selectedEndpoint, selectEndpoint, setTextCapture, fullscreenPanel, showHelp } = useNavigation()
  const { saveServerAuth, findAuthForServer, preferences, isLoading: configLoading } = useConfig()
  const terminalHeight = useTerminalHeight()

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
              terminalHeight={terminalHeight}
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
              terminalHeight={terminalHeight}
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
              configLoaded={!configLoading}
              defaultResponseTab={preferences.defaultResponseTab}
              specLoadUrl={specLoadUrl}
              savedRequestBaseUrl={savedRequestBaseUrl}
              terminalHeight={terminalHeight}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
