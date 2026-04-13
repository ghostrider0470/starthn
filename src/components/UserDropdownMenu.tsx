import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  FileText,
  LayoutDashboard,
  LogOut,
  NotebookPen,
  Settings,
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { withLocalePath } from '@/lib/i18n-utils'
import { hasPermission as checkPermission } from '@/lib/rbac'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { img } from '@/lib/image'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface UserDropdownMenuProps {
  locale: string
  /** Show "Admin Panel" link (for main site navbar) */
  showAdminLink?: boolean
  /** Show "Back to Site" link (for admin navbar) */
  showBackToSite?: boolean
  align?: 'start' | 'end'
}

export function UserDropdownMenu({
  locale,
  showAdminLink = false,
  showBackToSite = false,
  align = 'end',
}: UserDropdownMenuProps) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.email ?? '')

  const roles = [...new Set(user?.roles ?? [])]
  const canAccessAdmin =
    showAdminLink && checkPermission(user?.roles ?? [], 'view:admin')

  return (
    <DropdownMenuContent align={align} className="w-72" sideOffset={8}>
      {/* User header */}
      <DropdownMenuLabel className="font-normal">
        <div className="flex items-center gap-3 py-2">
          <Avatar className="h-12 w-12 border-2 border-primary shrink-0">
            <AvatarImage src={img(user?.avatarUrl, { width: 96, format: 'auto' })} />
            <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 min-w-0">
            <p className="text-base font-semibold leading-none truncate">
              {fullName}
            </p>
            <p className="text-sm text-muted-foreground leading-none truncate">
              {user?.email}
            </p>
            {roles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator />

      {/* Navigation links */}
      <DropdownMenuItem asChild>
        <Link
          to={withLocalePath('/dashboard', locale)}
          className="cursor-pointer py-2.5"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          {t('nav.dashboard', 'Dashboard')}
        </Link>
      </DropdownMenuItem>
<DropdownMenuItem asChild>
        <Link
          to={withLocalePath('/profile', locale)}
          className="cursor-pointer py-2.5"
        >
          <User className="mr-2 h-4 w-4" />
          {t('nav.profile', 'Profile')}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link
          to={withLocalePath('/my-page', locale)}
          className="cursor-pointer py-2.5"
        >
          <NotebookPen className="mr-2 h-4 w-4" />
          {t('nav.myPage', 'My Page')}
        </Link>
      </DropdownMenuItem>

      {canAccessAdmin && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to={withLocalePath('/admin', locale)}
              className="cursor-pointer py-2.5"
            >
              <Settings className="mr-2 h-4 w-4" />
              {t('nav.adminPanel', 'Admin Panel')}
            </Link>
          </DropdownMenuItem>
        </>
      )}

      {showBackToSite && (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              to={withLocalePath('/', locale)}
              className="cursor-pointer py-2.5"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('nav.backToSite', 'Back to Site')}
            </Link>
          </DropdownMenuItem>
        </>
      )}

      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={logout}
        className="cursor-pointer text-destructive focus:text-destructive py-2.5"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t('nav.logOut', 'Log out')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
