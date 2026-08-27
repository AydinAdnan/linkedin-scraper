import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function StarButton({ starred, onToggle }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      onClick={onToggle}
      aria-pressed={starred}
      aria-label={starred ? 'Unstar' : 'Star'}
      className="absolute right-2.5 top-2.5 z-10 rounded-full bg-card active:scale-97"
    >
      <Star className={cn('size-3.5', starred && 'fill-foreground')} />
    </Button>
  )
}
