import { Box, Container, Center, Text, VStack, Input, Button, Card } from '@chakra-ui/react'

export default function HomePage() {
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
                <Input placeholder="API Token" type="password" size="lg" />
                <Button colorScheme="blue" width="100%" size="lg">Convert</Button>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Center>
      </Box>
    </Container>
  )
} 