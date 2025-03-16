import { Box, Container, Center, Text, VStack, Input, Button, Card } from '@chakra-ui/react'
import { useState, useCallback } from 'react'
import { toaster } from './components/ui/toaster'
import { TogglTimeEntry, TogglUser, TogglProject } from './types/toggl'

const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

interface CachedProject extends TogglProject {
  cachedAt: number;
}

export default function HomePage() {
  const [apiToken, setApiToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [timeEntries, setTimeEntries] = useState<TogglTimeEntry[]>([])
  const [userData, setUserData] = useState<TogglUser | null>(null)

  const getCachedProject = useCallback((projectId: number): TogglProject | null => {
    const cached = localStorage.getItem(`project_${projectId}`)
    if (!cached) return null

    const project = JSON.parse(cached) as CachedProject
    if (Date.now() - project.cachedAt > CACHE_EXPIRY) {
      localStorage.removeItem(`project_${projectId}`)
      return null
    }

    return project
  }, [])

  const cacheProject = useCallback((project: TogglProject) => {
    const cachedProject: CachedProject = {
      ...project,
      cachedAt: Date.now()
    }
    localStorage.setItem(`project_${project.id}`, JSON.stringify(cachedProject))
  }, [])

  const fetchProject = async (projectId: number, headers: HeadersInit) => {
    // Try to get from cache first
    const cachedProject = getCachedProject(projectId)
    if (cachedProject) {
      return cachedProject
    }

    // If not in cache, fetch from API
    const projectResponse = await fetch(`/toggl/api/v9/workspaces/${userData?.default_workspace_id}/projects/${projectId}`, {
      method: 'GET',
      headers
    })
    if (projectResponse.ok) {
      const project = await projectResponse.json() as TogglProject
      cacheProject(project)
      return project
    }
    return null
  }

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
      const headers = {
        'Authorization': 'Basic ' + btoa(apiToken + ':api_token'),
        'Content-Type': 'application/json'
      }

      const userResponse = await fetch('/toggl/api/v9/me', {
        method: 'GET',
        headers
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
          headers
        }
      )

      if (!timeEntriesResponse.ok) {
        throw new Error('Failed to fetch time entries')
      }

      let timeEntries = await timeEntriesResponse.json() as TogglTimeEntry[]

      // Fetch project details for each entry that has a project_id
      const uniqueProjectIds = [...new Set(timeEntries.filter(entry => entry.project_id).map(entry => entry.project_id!))]
      const projectsMap = new Map<number, TogglProject>()

      // Process projects in smaller batches to avoid rate limiting
      const batchSize = 5
      for (let i = 0; i < uniqueProjectIds.length; i += batchSize) {
        const batch = uniqueProjectIds.slice(i, i + batchSize)
        await Promise.all(
          batch.map(async (projectId) => {
            const project = await fetchProject(projectId, headers)
            if (project) {
              projectsMap.set(projectId, project)
            }
          })
        )
        // Add a small delay between batches if there are more to process
        if (i + batchSize < uniqueProjectIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }

      // Attach project details to time entries
      timeEntries = timeEntries.map(entry => ({
        ...entry,
        project: entry.project_id ? projectsMap.get(entry.project_id) : undefined
      }))

      setTimeEntries(timeEntries)

      console.log('Time entries:', timeEntries.map(entry => ({
        description: entry.description,
        start: new Date(entry.start).toLocaleString(),
        stop: new Date(entry.stop).toLocaleString(),
        duration: entry.duration,
        project: entry.project?.name || 'No project'
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