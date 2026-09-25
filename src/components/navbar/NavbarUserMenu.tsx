import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserDropdownMenu } from '@/components/UserDropdownMenu'
import { useAuth } from '@/contexts/AuthContext'
import { img } from '@/lib/image'

/**
 * The signed-in visitor's avatar menu (desktop header). A separate chunk: it
 * only renders for a signed-in session, so Radix DropdownMenu stays out of
 * the entry chunk that every anonymous visitor downloads.
 */
export function NavbarUserMenu({ locale }: { locale: string }) {
  const { user } = useAuth()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative hidden lg:inline-flex h-9 w-9 rounded-full p-0 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background transition-all duration-300"
          aria-label="Open user menu"
        >
          <Avatar className="h-9 w-9 border-2 border-transparent hover:border-primary transition-colors">
            <AvatarImage
              src={img(user?.avatarUrl, {
                width: 96,
                format: 'auto',
              })}
            />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {user?.firstName[0]}
              {user?.lastName[0]}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <UserDropdownMenu locale={locale} showAdminLink />
    </DropdownMenu>
  )
}
