import { Box, Container, Center, Text, VStack, Input, Button, Card } from '@chakra-ui/react'
import { useState } from 'react'
import { toaster } from './components/ui/toaster'
import { TogglTimeEntry, TogglUser } from './types/toggl'

export default function HomePage() {
  const [apiToken, setApiToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TogglTimeEntry[]>([])
  const [userData, setUserData] = useState<TogglUser | null>(null)

  const handleConvert = async () => {
    if (!apiToken) {
      toaster.create({
        title: 'Error',
        description: 'Please enter your Toggl API token',
        type: 'error'
      })
      return
    }

    setIsLoading(true)
    try {
      // First authenticate and get user data
      const userResponse = await fetch('/toggl/api/v9/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(apiToken + ':api_token'),
          'Content-Type': 'application/json'
        }
      })

      if (!userResponse.ok) {
        throw new Error('Authentication failed')
      }

      const userData = await userResponse.json() as TogglUser
      setUserData(userData)

      // Then fetch time entries
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30) // Last 30 days
      
      const timeEntriesResponse = await fetch(
        `/toggl/api/v9/me/time_entries?start_date=${startDate.toISOString()}&end_date=${new Date().toISOString()}`, {
          method: 'GET',
          headers: {
            'Authorization': 'Basic ' + btoa(apiToken + ':api_token'),
            'Content-Type': 'application/json'
          }
        }
      )

      if (!timeEntriesResponse.ok) {
        throw new Error('Failed to fetch time entries')
      }

      const timeEntries = await timeEntriesResponse.json() as TogglTimeEntry[]
      setTimeEntries(timeEntries)

      console.log('Time entries:', timeEntries.map(entry => ({
        description: entry.description,
        start: new Date(entry.start).toLocaleString(),
        stop: new Date(entry.stop).toLocaleString(),
        duration: entry.duration,
        project: entry.project?.name
      })))

      toaster.create({
        title: 'Success',
        description: `Connected as ${userData.fullname}. Found ${timeEntries.length} time entries.`,
        type: 'success'
      })

      return { userData, timeEntries }
    } catch (error) {
      console.error('Authentication error:', error)
      toaster.create({
        title: 'Error',
        description: 'Failed to authenticate with Toggl. Please check your API token.',
        type: 'error'
      })
    } finally {
      setIsLoading(false)
    }
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
              <VStack gap={4}>
                <Input 
                  placeholder="API Token" 
                  type="password" 
                  size="lg"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <Button 
                  colorScheme="blue" 
                  width="100%" 
                  size="lg"
                  onClick={handleConvert}
                  disabled={isLoading}
                >
                  {isLoading ? 'Connecting...' : 'Convert'}
                </Button>
                {timeEntries.length > 0 && (
                  <Text>Found {timeEntries.length} time entries</Text>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Center>
      </Box>
    </Container>
  )
} 