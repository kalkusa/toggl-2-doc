import { Box, Container, Center, Text, VStack, Input, Button, Card } from '@chakra-ui/react'
import { useState } from 'react'
import { toaster } from './components/ui/toaster'

export default function HomePage() {
  const [apiToken, setApiToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)

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
      const response = await fetch('/toggl/api/v9/me', {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(apiToken + ':api_token'),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Authentication failed')
      }

      const data = await response.json()
      toaster.create({
        title: 'Success',
        description: `Connected as ${data.fullname}`,
        type: 'success'
      })
      return data
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
              </VStack>
            </Card.Body>
          </Card.Root>
        </Center>
      </Box>
    </Container>
  )
} 