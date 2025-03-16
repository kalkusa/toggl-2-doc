import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react'
import HomePage from './HomePage'

const system = createSystem(defaultConfig)

function App() {
  return (
    <ChakraProvider value={system}>
      <HomePage />
    </ChakraProvider>
  )
}

export default App
