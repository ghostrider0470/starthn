import { useState } from 'react'
import {
  Download,
  HelpCircle,
  FileText,
  BookOpen,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HelpResources() {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const resources = [
    {
      title: 'Sample Template',
      description: 'Excel template format',
      icon: FileText,
      url: '/sample-template.xls',
    },
    {
      title: 'Variables (EN)',
      description: 'Column definitions',
      icon: BookOpen,
      url: '/variable-definitions-en.xlsx',
    },
    {
      title: 'Variables (NL)',
      description: 'Kolom definities',
      icon: BookOpen,
      url: '/variable-definitions-nl.xlsx',
    },
  ]

  return (
    <div
      className={cn(
        'sticky top-24 transition-all duration-300 bg-background border rounded-lg shadow-sm',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div
            className={cn(
              'flex items-center gap-2',
              isCollapsed && 'justify-center',
            )}
          >
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            {!isCollapsed && (
              <h3 className="font-semibold text-sm">Resources</h3>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>

        {!isCollapsed && (
          <>
            <div className="space-y-2 mb-4">
              {resources.map((resource) => {
                const Icon = resource.icon
                return (
                  <Button
                    key={resource.title}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left"
                    onClick={() => window.open(resource.url, '_blank')}
                  >
                    <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <div className="flex-1 overflow-hidden">
                      <div className="text-xs font-medium truncate">
                        {resource.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {resource.description}
                      </div>
                    </div>
                    <Download className="h-3 w-3 ml-2 flex-shrink-0" />
                  </Button>
                )
              })}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Requirements:</p>
                  <ul className="space-y-0.5">
                    <li>• PID & Date required</li>
                    <li>• Excel/CSV format</li>
                    <li>• Max 10MB</li>
                    <li>• EN/NL columns OK</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {isCollapsed && (
          <div className="space-y-2">
            {resources.map((resource) => {
              const Icon = resource.icon
              return (
                <Button
                  key={resource.title}
                  variant="ghost"
                  size="sm"
                  className="w-full p-2"
                  onClick={() => window.open(resource.url, '_blank')}
                  title={resource.title}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
