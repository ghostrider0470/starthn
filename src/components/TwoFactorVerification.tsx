import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertCircle, Key } from 'lucide-react';
import authService, { type TwoFactorLoginDto } from '@/services/auth.service';

interface TwoFactorVerificationProps {
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerification({ email, onSuccess, onCancel }: TwoFactorVerificationProps) {
  const { t } = useTranslation('auth');
  const [code, setCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Recovery codes are in format XXXXX-XXXXX (11 chars with dash)
    // or user might enter without dash (10 chars)
    if (useRecoveryCode) {
      const cleanCode = code.replace(/-/g, '');
      if (cleanCode.length !== 10) {
        setError(t('twoFactor.invalidRecoveryCode'));
        return;
      }
    } else {
      if (code.length !== 6) {
        setError(t('twoFactor.invalidCode'));
        return;
      }
    }

    setError(null);
    setLoading(true);

    try {
      const data: TwoFactorLoginDto = {
        email,
        code,
        rememberDevice: false // Could add a checkbox for this
      };

      console.log('Verifying 2FA code...', data);
      const result = await authService.verifyTwoFactorCode(data);
      console.log('2FA verification result:', result);
      console.log('Access token after 2FA:', localStorage.getItem('accessToken'));
      onSuccess();
    } catch (err: any) {
      console.error('2FA verification error:', err);
      setError(err.response?.data?.message || t('twoFactor.invalidCodeError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('twoFactor.title')}
        </CardTitle>
        <CardDescription>
          {useRecoveryCode
            ? t('twoFactor.descriptionRecovery')
            : t('twoFactor.descriptionCode')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">
              {useRecoveryCode ? t('twoFactor.labelRecovery') : t('twoFactor.labelCode')}
            </Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              placeholder={useRecoveryCode ? 'XXXXX-XXXXX' : '000000'}
              maxLength={useRecoveryCode ? 11 : 6}
              className="text-center text-2xl font-mono"
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || code.length === 0}
            >
              {loading ? t('twoFactor.verifying') : t('twoFactor.submit')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setUseRecoveryCode(!useRecoveryCode);
                setCode('');
                setError(null);
              }}
            >
              <Key className="h-4 w-4 mr-2" />
              {useRecoveryCode ? t('twoFactor.useAuthenticator') : t('twoFactor.useRecoveryCode')}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={onCancel}
            >
              {t('twoFactor.cancel')}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {t('twoFactor.helpText')}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}