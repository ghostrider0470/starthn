import { SectionContainer } from '@/components/layout/SectionContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface ServiceBreakdownItem {
  title: string
  summary: string
  deliverables: string[]
}

interface ServiceBreakdownSectionProps {
  title: string
  description: string
  items: ServiceBreakdownItem[]
}

export function ServiceBreakdownSection({
  title,
  description,
  items,
}: ServiceBreakdownSectionProps) {
  return (
    <SectionContainer title={title} description={description}>
      <div className="grid gap-4 lg:grid-cols-3">
        {items.map((item, index) => (
          <Card key={item.title} className="border-muted/50">
            <CardHeader className="pb-3">
              <div className="mb-3 w-fit rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {String(index + 1).padStart(2, '0')}
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{item.summary}</p>
              <ul className="space-y-2">
                {item.deliverables.map((deliverable) => (
                  <li key={deliverable} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary/70" />
                    <span className="text-sm">{deliverable}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </SectionContainer>
  )
}
