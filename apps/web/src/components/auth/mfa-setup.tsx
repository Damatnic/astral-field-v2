'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Shield, Key, Copy, Check, Download, Eye, EyeOff, Smartphone, AlertTriangle } from 'lucide-react'
import Image from 'next/image'

interface MFASetupProps {
  onComplete?: () => void
  onCancel?: () => void
}

interface MFASetupData {
  secret: string
  qrCodeUrl: string
  manualEntryKey: string
  backupCodes: string[]
  appName: string
  issuer: string
}

export function MFASetup({ onComplete, onCancel }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup' | 'complete'>('setup')
  const [loading, setLoading] = useState(false)
  const [setupData, setSetupData] = useState<MFASetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesCopied, setBackupCodesCopied] = useState(false)
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false)

  // Initialize MFA setup
  useEffect(() => {
    initializeMFASetup()
  }, [])

  const initializeMFASetup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to initialize MFA setup')
      }

      const data = await response.json()
      setSetupData(data.setup)
      
    } catch (error) {
      console.error('MFA setup initialization error:', error)
      toast.error('Failed to initialize MFA setup. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifySetup = async () => {
    if (!setupData || !verificationCode) {
      toast.error('Please enter the verification code')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          secret: setupData.secret,
          purpose: 'setup'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed')
      }

      toast.success('MFA setup verified successfully!')
      setStep('backup')
      
    } catch (error) {
      console.error('MFA verification error:', error)
      toast.error('Invalid verification code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const copyBackupCodes = async () => {
    if (!setupData) return

    const codes = setupData.backupCodes.join('\n')
    try {
      await navigator.clipboard.writeText(codes)
      setBackupCodesCopied(true)
      toast.success('Backup codes copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy backup codes')
    }
  }

  const downloadBackupCodes = () => {
    if (!setupData) return

    const codes = setupData.backupCodes.join('\n')
    const blob = new Blob([
      `AstralField MFA Backup Codes\n` +
      `Generated: ${new Date().toISOString()}\n` +
      `WARNING: Keep these codes secure and private!\n\n` +
      codes
    ], { type: 'text/plain' })
    
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'astralfield-backup-codes.txt'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    setBackupCodesDownloaded(true)
    toast.success('Backup codes downloaded')
  }

  const completeMFASetup = () => {
    setStep('complete')
    toast.success('Multi-Factor Authentication enabled successfully!')
    setTimeout(() => {
      onComplete?.()
    }, 2000)
  }

  if (loading && !setupData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <Shield className="w-12 h-12 animate-spin mx-auto text-blue-500" />
          <p className="text-gray-600">Initializing MFA setup...</p>
        </div>
      </div>
    )
  }

  if (!setupData) {
    return (
      <div className="text-center space-y-4 p-8">
        <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
        <p className="text-red-600">Failed to initialize MFA setup</p>
        <Button onClick={initializeMFASetup} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <Shield className="w-12 h-12 mx-auto text-green-500" />
        <h2 className="text-2xl font-bold text-gray-900">
          Enable Two-Factor Authentication
        </h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account
        </p>
      </div>

      {/* Step 1: Setup */}
      {step === 'setup' && (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Smartphone className="w-5 h-5 mr-2" />
              Step 1: Install Authenticator App
            </h3>
            <p className="text-gray-600 text-sm">
              Install an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator on your mobile device.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Key className="w-5 h-5 mr-2" />
              Step 2: Scan QR Code
            </h3>
            
            <div className="text-center space-y-4">
              <div className="bg-white p-4 rounded-lg border inline-block">
                <Image
                  src={setupData.qrCodeUrl}
                  alt="MFA QR Code"
                  width={200}
                  height={200}
                  className="mx-auto"
                />
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Can't scan? Enter this key manually:</p>
                <div className="bg-gray-100 p-2 rounded font-mono text-xs mt-2">
                  {setupData.manualEntryKey}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Step 3: Enter Verification Code
            </h3>
            <Input
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-lg tracking-widest"
              maxLength={6}
            />
            <p className="text-xs text-gray-500">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={verifySetup}
              disabled={verificationCode.length !== 6 || loading}
              className="flex-1"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </Button>
            <Button onClick={onCancel} variant="outline">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Backup Codes */}
      {step === 'backup' && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-orange-600 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Important: Save Your Backup Codes
            </h3>
            <p className="text-gray-600 text-sm">
              These backup codes can be used to access your account if you lose your authenticator device. 
              Save them in a secure location.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-yellow-800">Backup Codes</h4>
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="text-yellow-600 hover:text-yellow-800"
              >
                {showBackupCodes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            {showBackupCodes && (
              <div className="space-y-2">
                <div className="bg-white p-3 rounded border font-mono text-sm">
                  {setupData.backupCodes.map((code, index) => (
                    <div key={index} className="py-1">
                      {code}
                    </div>
                  ))}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    onClick={copyBackupCodes}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {backupCodesCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadBackupCodes}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {backupCodesDownloaded ? (
                      <>
                        <Check className="w-4 h-4 mr-1" />
                        Downloaded
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-1" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="codes-saved"
                checked={backupCodesCopied || backupCodesDownloaded}
                onChange={() => {}}
                className="rounded"
              />
              <label htmlFor="codes-saved" className="text-sm text-gray-700">
                I have saved my backup codes in a secure location
              </label>
            </div>
            
            <Button
              onClick={completeMFASetup}
              disabled={!backupCodesCopied && !backupCodesDownloaded}
              className="w-full"
            >
              Complete MFA Setup
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Complete */}
      {step === 'complete' && (
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-600">
              MFA Enabled Successfully!
            </h3>
            <p className="text-gray-600">
              Your account is now protected with two-factor authentication.
            </p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
            <ul className="space-y-1 text-left">
              <li>✓ Authenticator app configured</li>
              <li>✓ Backup codes saved</li>
              <li>✓ Account security enhanced</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default MFASetup