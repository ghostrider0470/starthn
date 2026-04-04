import { createFileRoute, Navigate, Link, useLocation } from '@tanstack/react-router'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Lock,
  Save,
  Camera,
  AlertCircle,
  CheckCircle2,
  Briefcase,
  Globe,
  Link as LinkIcon,
  FileText,
} from 'lucide-react'
import profileService from '@/services/profile.service'
import { ImageCropUpload } from '@/components/blog/ImageCropUpload'
import { TwoFactorSetup } from '@/components/TwoFactorSetup'
import { ApiKeysSection } from '@/components/ApiKeysSection'
import { getLocaleFromPath, withLocalePath } from '@/lib/i18n-utils'

export const Route = createFileRoute('/{-$locale}/profile')({
  component: ProfilePage,
})

function ProfilePage() {
  const { t } = useTranslation('pages')
  const location = useLocation()
  const currentLocale = getLocaleFromPath(location.pathname)
  const {
    user,
    refreshProfile,
    isLoading: authLoading,
    isAuthenticated,
  } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    role: user?.roles?.[0] || '',
    isOptedOut: user?.isOptedOut || false,
    emailNotifications: user?.emailNotifications ?? true,
    smsNotifications: user?.smsNotifications ?? false,
    bio: user?.bio || '',
    profession: user?.profession || '',
    expertise: user?.expertise?.join(', ') || '',
    slug: user?.slug || '',
    socialLinkedIn: user?.socialLinks?.linkedIn || '',
    socialTwitter: user?.socialLinks?.twitter || '',
    socialGitHub: user?.socialLinks?.gitHub || '',
    socialWebsite: user?.socialLinks?.website || '',
  })

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.roles?.[0] || '',
        isOptedOut: user.isOptedOut || false,
        emailNotifications: user.emailNotifications ?? true,
        smsNotifications: user.smsNotifications ?? false,
        bio: user.bio || '',
        profession: user.profession || '',
        expertise: user.expertise?.join(', ') || '',
        slug: user.slug || '',
        socialLinkedIn: user.socialLinks?.linkedIn || '',
        socialTwitter: user.socialLinks?.twitter || '',
        socialGitHub: user.socialLinks?.gitHub || '',
        socialWebsite: user.socialLinks?.website || '',
      })
    }
  }, [user])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    try {
      setLoading(true)
      const expertiseArray = profileData.expertise
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await profileService.updateProfile({
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phoneNumber: profileData.phoneNumber,
        emailNotifications: profileData.emailNotifications,
        smsNotifications: profileData.smsNotifications,
        bio: profileData.bio || undefined,
        profession: profileData.profession || undefined,
        expertise: expertiseArray.length > 0 ? expertiseArray : undefined,
        slug: profileData.slug || undefined,
        socialLinks: {
          linkedIn: profileData.socialLinkedIn || undefined,
          twitter: profileData.socialTwitter || undefined,
          gitHub: profileData.socialGitHub || undefined,
          website: profileData.socialWebsite || undefined,
        },
      })
      await refreshProfile()
      setSuccess(t('profile.messages.profileUpdated'))
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t('profile.messages.profileUpdateFailed'),
      )
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('profile.messages.passwordsNoMatch'))
      return
    }

    if (passwordData.newPassword.length < 8) {
      setError(t('profile.messages.passwordTooShort'))
      return
    }

    try {
      setLoading(true)
      await profileService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })
      setSuccess(t('profile.messages.passwordChanged'))
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          t('profile.messages.passwordChangeFailed'),
      )
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    return (
      `${profileData.firstName?.[0] || ''}${profileData.lastName?.[0] || ''}`.toUpperCase() ||
      'U'
    )
  }

  const handleAvatarCropUpload = async (file: File): Promise<{ url: string }> => {
    const result = await profileService.uploadAvatar(file)
    await refreshProfile()
    setSuccess(t('profile.messages.avatarUpdated', 'Profile photo updated successfully.'))
    setTimeout(() => setSuccess(null), 3000)
    return { url: result.avatarUrl }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-destructive/10 text-destructive'
      case 'owner':
        return 'bg-primary/15 text-foreground'
      case 'employee':
        return 'bg-accent/15 text-accent-foreground'
      case 'individual':
        return 'bg-primary/10 text-foreground'
      default:
        return 'bg-muted text-foreground'
    }
  }

  if (!isAuthenticated && !authLoading) {
    return <Navigate to={withLocalePath('/login', currentLocale)} />
  }

  if (authLoading || (!user && isAuthenticated)) {
    return (
      <div className="container mx-auto min-h-[400px] max-w-4xl px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-muted-foreground">
              {t('profile.loading')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to={withLocalePath('/login', currentLocale)} />
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t('profile.title')}</h1>
        <p className="text-muted-foreground">{t('profile.subtitle')}</p>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:space-x-4">
            <div className="shrink-0">
              <ImageCropUpload
                aspectRatio={1}
                cropShape="round"
                label="Profile Photo"
                value={user?.avatarUrl || null}
                onChange={() => {}}
                onUpload={handleAvatarCropUpload}
                previewHeight="h-20"
              />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <p className="text-muted-foreground">{profileData.email}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className={getRoleBadgeColor(profileData.role)}>
                  <Shield className="mr-1 h-3 w-3" />
                  {profileData.role}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto hidden"
              disabled={loading}
            >
              <Camera className="mr-2 h-4 w-4" />
              {t('profile.photoButton')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {success && (
        <Alert className="mb-6 border-primary/20 bg-primary/10">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <AlertDescription className="text-foreground">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-6" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-4">
          <TabsTrigger value="general" className="min-h-11">
            {t('profile.tabs.general')}
          </TabsTrigger>
          <TabsTrigger value="security" className="min-h-11">
            {t('profile.tabs.security')}
          </TabsTrigger>
          <TabsTrigger value="api-keys" className="min-h-11">
            API Keys
          </TabsTrigger>
          <TabsTrigger value="preferences" className="min-h-11">
            {t('profile.tabs.preferences')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.general.title')}</CardTitle>
              <CardDescription>
                {t('profile.general.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">
                      {t('profile.general.firstName')}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        value={profileData.firstName}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            firstName: e.target.value,
                          }))
                        }
                        className="pl-10"
                        placeholder={t(
                          'profile.general.firstNamePlaceholder',
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">
                      {t('profile.general.lastName')}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        value={profileData.lastName}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            lastName: e.target.value,
                          }))
                        }
                        className="pl-10"
                        placeholder={t(
                          'profile.general.lastNamePlaceholder',
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    {t('profile.general.email')}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profileData.email}
                      className="pl-10"
                      disabled
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.general.emailNotice')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    {t('profile.general.phone')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profileData.phoneNumber}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          phoneNumber: e.target.value,
                        }))
                      }
                      className="pl-10"
                      placeholder={t('profile.general.phonePlaceholder')}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    placeholder="Tell us about yourself..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profession">Profession</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="profession"
                        type="text"
                        value={profileData.profession}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            profession: e.target.value,
                          }))
                        }
                        className="pl-10"
                        placeholder="e.g. Software Engineer"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Author Slug</Label>
                    <div className="relative">
                      <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="slug"
                        type="text"
                        value={profileData.slug}
                        onChange={(e) =>
                          setProfileData((prev) => ({
                            ...prev,
                            slug: e.target.value,
                          }))
                        }
                        className="pl-10"
                        placeholder="john-doe"
                      />
                    </div>
                    {profileData.slug && (
                      <p className="text-sm text-muted-foreground">
                        /team/{profileData.slug}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expertise">Expertise</Label>
                  <Input
                    id="expertise"
                    type="text"
                    value={profileData.expertise}
                    onChange={(e) =>
                      setProfileData((prev) => ({
                        ...prev,
                        expertise: e.target.value,
                      }))
                    }
                    placeholder="React, TypeScript, Cloud Architecture (comma-separated)"
                  />
                  <p className="text-sm text-muted-foreground">
                    Separate multiple skills with commas
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Social Links</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="socialLinkedIn">LinkedIn</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="socialLinkedIn"
                          type="url"
                          value={profileData.socialLinkedIn}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              socialLinkedIn: e.target.value,
                            }))
                          }
                          className="pl-10"
                          placeholder="https://linkedin.com/in/..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialTwitter">Twitter</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="socialTwitter"
                          type="url"
                          value={profileData.socialTwitter}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              socialTwitter: e.target.value,
                            }))
                          }
                          className="pl-10"
                          placeholder="https://twitter.com/..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialGitHub">GitHub</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="socialGitHub"
                          type="url"
                          value={profileData.socialGitHub}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              socialGitHub: e.target.value,
                            }))
                          }
                          className="pl-10"
                          placeholder="https://github.com/..."
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialWebsite">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="socialWebsite"
                          type="url"
                          value={profileData.socialWebsite}
                          onChange={(e) =>
                            setProfileData((prev) => ({
                              ...prev,
                              socialWebsite: e.target.value,
                            }))
                          }
                          className="pl-10"
                          placeholder="https://yoursite.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  {t('profile.general.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Page — dedicated editor */}
        <div className="mb-6">
          <Button variant="outline" asChild>
            <Link to={withLocalePath('/my-page', currentLocale)}>
              <FileText className="mr-2 h-4 w-4" />
              Edit My Page
            </Link>
          </Button>
        </div>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.security.title')}</CardTitle>
              <CardDescription>
                {t('profile.security.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">
                    {t('profile.security.currentPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      className="pl-10"
                      placeholder={t(
                        'profile.security.currentPasswordPlaceholder',
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">
                    {t('profile.security.newPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="pl-10"
                      placeholder={t(
                        'profile.security.newPasswordPlaceholder',
                      )}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.security.passwordHint')}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">
                    {t('profile.security.confirmPassword')}
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="pl-10"
                      placeholder={t(
                        'profile.security.confirmPasswordPlaceholder',
                      )}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  <Lock className="mr-2 h-4 w-4" />
                  {t('profile.security.changePassword')}
                </Button>
              </form>

              <Separator className="my-6" />

              <TwoFactorSetup />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys">
          <ApiKeysSection />
        </TabsContent>

        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>{t('profile.preferences.title')}</CardTitle>
              <CardDescription>
                {t('profile.preferences.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications">
                    {t('profile.preferences.email.title')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.preferences.email.description')}
                  </p>
                </div>
                <Switch
                  id="emailNotifications"
                  checked={profileData.emailNotifications}
                  onCheckedChange={(checked) =>
                    setProfileData((prev) => ({
                      ...prev,
                      emailNotifications: checked,
                    }))
                  }
                />
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="smsNotifications">
                    {t('profile.preferences.sms.title')}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.preferences.sms.description')}
                  </p>
                </div>
                <Switch
                  id="smsNotifications"
                  checked={profileData.smsNotifications}
                  onCheckedChange={(checked) =>
                    setProfileData((prev) => ({
                      ...prev,
                      smsNotifications: checked,
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">
                  {t('profile.preferences.actions.title')}
                </h3>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-2 h-4 w-4" />
                    {t('profile.preferences.actions.downloadData')}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    {t('profile.preferences.actions.deleteAccount')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
