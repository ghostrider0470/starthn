import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  Smartphone, 
  Key, 
  Copy, 
  Check, 
  AlertCircle, 
  Download,
  RefreshCw
} from 'lucide-react';
import authService, { type TwoFactorSetupDto, type RecoveryCodesDto } from '@/services/auth.service';

export function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetupDto | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copiedKey, setCopiedKey] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'recovery'>('setup');

  // Check 2FA status on mount
  useEffect(() => {
    checkTwoFactorStatus();
  }, []);

  const checkTwoFactorStatus = async () => {
    try {
      const { twoFactorEnabled } = await authService.getTwoFactorStatus();
      setIsEnabled(twoFactorEnabled);
    } catch (err) {
      console.error('Failed to check 2FA status:', err);
    }
  };

  const handleSetupStart = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const response = await authService.getTwoFactorSetup();
      setSetupData(response.setup);
      setShowSetupDialog(true);
      setStep('setup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await authService.enableTwoFactor({ code: verificationCode });
      setRecoveryCodes(response.recoveryCodes.recoveryCodes);
      setStep('recovery');
      setIsEnabled(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await authService.disableTwoFactor({ password });
      setIsEnabled(false);
      setShowDisableDialog(false);
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const downloadRecoveryCodes = () => {
    const text = recoveryCodes.join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'horizon-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCloseSetup = () => {
    setShowSetupDialog(false);
    setSetupData(null);
    setVerificationCode('');
    setRecoveryCodes([]);
    setStep('setup');
    setError(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account using an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {isEnabled ? (
                <Badge variant="success">Enabled</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
            </div>
            
            {isEnabled ? (
              <Button 
                variant="destructive" 
                onClick={() => setShowDisableDialog(true)}
                disabled={loading}
              >
                Disable 2FA
              </Button>
            ) : (
              <Button 
                onClick={handleSetupStart}
                disabled={loading}
              >
                Enable 2FA
              </Button>
            )}
          </div>

          {isEnabled && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your account is protected with two-factor authentication. You'll need your authenticator app to sign in.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={handleCloseSetup}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Follow the steps below to enable 2FA on your account
            </DialogDescription>
          </DialogHeader>

          {step === 'setup' && setupData && (
            <div className="space-y-6">
              <Tabs defaultValue="qr" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">QR Code</TabsTrigger>
                  <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                </TabsList>
                
                <TabsContent value="qr" className="space-y-4">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Scan this QR code with your authenticator app
                    </p>
                    <div className="inline-block rounded-lg border border-border bg-card p-4">
                      <img 
                        src={setupData.qrCodeBase64} 
                        alt="2FA QR Code" 
                        className="w-48 h-48"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Use apps like Google Authenticator, Microsoft Authenticator, or Authy
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="manual" className="space-y-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Enter this key manually in your authenticator app:
                    </p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={setupData.sharedKey} 
                        readOnly 
                        className="font-mono"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(setupData.sharedKey)}
                      >
                        {copiedKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Account: Start HN<br />
                        Type: Time-based (TOTP)<br />
                        Digits: 6
                      </AlertDescription>
                    </Alert>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              <div className="space-y-4">
                <Label htmlFor="verification-code">
                  Enter the 6-digit code from your authenticator app
                </Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl font-mono"
                />
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleCloseSetup}>
                  Cancel
                </Button>
                <Button onClick={handleVerify} disabled={loading || verificationCode.length !== 6}>
                  Verify and Enable
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 'recovery' && (
            <div className="space-y-6">
              <Alert>
                <Key className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Save these recovery codes in a safe place. Each code can only be used once.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded">
                    {index + 1}. {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={downloadRecoveryCodes}
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Codes
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => copyToClipboard(recoveryCodes.join('\n'))}
                  className="flex-1"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseSetup}>
                  I've Saved My Recovery Codes
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              This will make your account less secure. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDisableDialog(false);
                setPassword('');
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisable}
              disabled={loading || !password}
            >
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
