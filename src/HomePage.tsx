import { Box, Container, Center, Text, Card } from '@chakra-ui/react'
import { useState } from 'react'
import { LoginForm } from './components/LoginForm'
import { useTogglApi } from './hooks/useTogglApi'

export default function HomePage() {
  const [apiToken, setApiToken] = useState('')
  const { isLoading, timeEntries, fetchData } = useTogglApi()

  const handleConvert = () => {
    fetchData(apiToken)
  }

  return (
    <Container maxW="100%" p={0} h="100vh">
      <Box p={4} bg="blue.400" h="100%">
        <Center h="100%">
          <Card.Root maxW="md" p={6} boxShadow="lg">
            <Card.Header>
              <Text fontSize="xl" fontWeight="bold">Toggl to Doc Converter</Text>
              <Text fontSize="sm" color="gray.600" mt={2}>
                Enter your Toggl API token to get started. You can find it in your Toggl Profile settings.
              </Text>
            </Card.Header>
            <Card.Body>
              <LoginForm 
                apiToken={apiToken}
                onApiTokenChange={setApiToken}
                onSubmit={handleConvert}
                isLoading={isLoading}
                entriesCount={timeEntries.length}
              />
            </Card.Body>
          </Card.Root>
        </Center>
      </Box>
    </Container>
  )
} 