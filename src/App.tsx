import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import HomePage from './HomePage'
import { Toaster } from './components/ui/toaster'

const system = createSystem(defaultConfig)

function App() {
  return (
    <ChakraProvider value={system}>
      <HomePage />
      <Toaster />
    </ChakraProvider>
  )
}

export default App
