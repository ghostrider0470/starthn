import nlp from 'compromise'

export interface Entity {
  text: string
  type: 'person' | 'place' | 'organization' | 'date' | 'money' | 'other'
  start: number
  end: number
}

export interface EntityResult {
  entities: Entity[]
  counts: Record<Entity['type'], number>
}

// Entity type colors for UI
export const ENTITY_COLORS: Record<Entity['type'], string> = {
  person: '#8b5cf6', // violet
  place: '#3b82f6', // blue
  organization: '#f59e0b', // amber
  date: '#10b981', // emerald
  money: '#ec4899', // pink
  other: '#6b7280', // gray
}

export function extractEntities(text: string): EntityResult {
  if (!text.trim()) {
    return {
      entities: [],
      counts: { person: 0, place: 0, organization: 0, date: 0, money: 0, other: 0 },
    }
  }

  const doc = nlp(text)
  const entities: Entity[] = []

  // Extract people
  doc.people().forEach((match) => {
    const found = match.text()
    const index = text.indexOf(found)
    if (index !== -1 && !entities.some(e => e.text === found && e.type === 'person')) {
      entities.push({
        text: found,
        type: 'person',
        start: index,
        end: index + found.length,
      })
    }
  })

  // Extract places
  doc.places().forEach((match) => {
    const found = match.text()
    const index = text.indexOf(found)
    if (index !== -1 && !entities.some(e => e.text === found && e.type === 'place')) {
      entities.push({
        text: found,
        type: 'place',
        start: index,
        end: index + found.length,
      })
    }
  })

  // Extract organizations
  doc.organizations().forEach((match) => {
    const found = match.text()
    const index = text.indexOf(found)
    if (index !== -1 && !entities.some(e => e.text === found && e.type === 'organization')) {
      entities.push({
        text: found,
        type: 'organization',
        start: index,
        end: index + found.length,
      })
    }
  })

  // Extract dates
  ;(doc as any).dates().forEach((match: any) => {
    const found = match.text()
    const index = text.indexOf(found)
    if (index !== -1 && !entities.some(e => e.text === found && e.type === 'date')) {
      entities.push({
        text: found,
        type: 'date',
        start: index,
        end: index + found.length,
      })
    }
  })

  // Extract money values
  doc.money().forEach((match) => {
    const found = match.text()
    const index = text.indexOf(found)
    if (index !== -1 && !entities.some(e => e.text === found && e.type === 'money')) {
      entities.push({
        text: found,
        type: 'money',
        start: index,
        end: index + found.length,
      })
    }
  })

  // Count entities by type
  const counts: Record<Entity['type'], number> = {
    person: 0,
    place: 0,
    organization: 0,
    date: 0,
    money: 0,
    other: 0,
  }

  entities.forEach((entity) => {
    counts[entity.type]++
  })

  // Sort entities by position in text
  entities.sort((a, b) => a.start - b.start)

  return { entities, counts }
}

// Get icon name for entity type (lucide icon names)
export function getEntityIcon(type: Entity['type']): string {
  switch (type) {
    case 'person':
      return 'User'
    case 'place':
      return 'MapPin'
    case 'organization':
      return 'Building2'
    case 'date':
      return 'Calendar'
    case 'money':
      return 'DollarSign'
    default:
      return 'Tag'
  }
}
