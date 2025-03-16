import { VStack, Input, Button, Text } from '@chakra-ui/react'

interface LoginFormProps {
  apiToken: string;
  onApiTokenChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  entriesCount?: number;
}

export function LoginForm({ 
  apiToken, 
  onApiTokenChange, 
  onSubmit, 
  isLoading,
  entriesCount 
}: LoginFormProps) {
  return (
    <VStack gap={4} width="100%">
      <Input 
        placeholder="API Token" 
        type="password" 
        size="lg"
        width="100%"
        value={apiToken}
        onChange={(e) => onApiTokenChange(e.target.value)}
      />
      <Button 
        colorScheme="blue" 
        width="100%" 
        size="lg"
        onClick={onSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Connecting...' : 'Convert'}
      </Button>
      {typeof entriesCount === 'number' && (
        <Text>Found {entriesCount} time entries</Text>
      )}
    </VStack>
  )
} 