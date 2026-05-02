import { Loader2 } from 'lucide-react'

interface LoadingStateProps {
  text?: string
}

export default function LoadingState({ text = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  )
}
