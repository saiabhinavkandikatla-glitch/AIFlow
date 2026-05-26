import { ArrowRight, CheckCircle2, Goal, MapPinned, Tags } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Thread } from '@/lib/types'

export const ThreadCard = ({ thread }: { thread: Thread }) => (
  <Card className="overflow-hidden">
    <CardHeader className="border-b bg-muted/25">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">Thread brief</div>
          <CardTitle className="mt-2 text-2xl leading-tight md:text-3xl">{thread.title}</CardTitle>
        </div>
        <div className="flex max-w-xl flex-wrap gap-2">
          {thread.tags.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      </div>
    </CardHeader>
    <CardContent className="grid gap-4 p-5 lg:grid-cols-2">
      <section className="rounded-lg border bg-background/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Goal className="h-4 w-4 text-primary" />
          Goal detected
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{thread.goal}</p>
      </section>
      <section className="rounded-lg border bg-background/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <MapPinned className="h-4 w-4 text-accent" />
          Where it left off
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{thread.last_point}</p>
      </section>
      <section className="rounded-lg border bg-background/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          Key decisions
        </div>
        <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
          {thread.key_decisions.map((decision) => (
            <li key={decision} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
              <span>{decision}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border bg-background/80 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ArrowRight className="h-4 w-4 text-accent" />
          Suggested next step
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{thread.next_step}</p>
      </section>
      <section className="rounded-lg border bg-background/80 p-4 lg:col-span-2">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Tags className="h-4 w-4 text-primary" />
          Context summary
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{thread.context}</p>
      </section>
    </CardContent>
  </Card>
)
