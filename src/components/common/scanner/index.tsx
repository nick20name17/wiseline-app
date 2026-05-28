import { RiErrorWarningFill, RiKeyboardBoxLine } from '@remixicon/react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { playBeep } from '@/routes/scanner/-utils/beep'

export interface ScanResult {
  text: string
  format: string
}

export interface ScannerProps {
  onSuccess: (result: ScanResult) => void
  enabled?: boolean
  disabledReason?: string[]
  error?: string | null
  isPending?: boolean
}

const SCANNING_DELAY = 1_000

export const Scanner = ({
  onSuccess,
  enabled = true,
  disabledReason = [],
  error: externalError,
  isPending = false
}: ScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const lastScanAtRef = useRef(0)

  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const handleScanSuccess = useCallback(
    (text: string, format: string) => {
      const now = Date.now()
      if (now - lastScanAtRef.current < SCANNING_DELAY) return
      lastScanAtRef.current = now
      playBeep(true)
      const scanResult = { text, format }
      setResult(scanResult)
      onSuccess(scanResult)
    },
    [onSuccess]
  )

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualCode.trim()) return
    handleScanSuccess(manualCode.trim(), 'MANUAL')
    setManualCode('')
  }

  useEffect(() => {
    if (!enabled) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access requires HTTPS or localhost.')
      return
    }

    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128])

    const reader = new BrowserMultiFormatReader(hints)

    const start = async () => {
      try {
        setIsScanning(true)
        setError(null)

        controlsRef.current = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          videoRef.current!,
          (res) => {
            if (res) {
              handleScanSuccess(res.getText(), res.getBarcodeFormat().toString())
            }
          }
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to access camera')
        setIsScanning(false)
      }
    }

    start()

    return () => {
      controlsRef.current?.stop()
      controlsRef.current = null
    }
  }, [enabled, handleScanSuccess])

  if (!enabled) {
    return <DisabledScanner reasons={disabledReason} />
  }

  const displayError = isPending ? null : (externalError ?? error)
  const showResult = !!result && !isPending

  return (
    <div className='flex flex-col items-center p-5'>
      <h2 className='mb-5 text-xl font-semibold'>Barcode Scanner</h2>

      <ScannerVideo videoRef={videoRef} />

      {isPending ? (
        <ScannerStatusSkeleton />
      ) : displayError || showResult ? (
        <ScannerStatus
          error={displayError}
          result={showResult ? result : null}
        />
      ) : null}

      {isScanning && !result && !displayError && (
        <p className='text-muted-foreground mt-4'>Point camera at a barcode</p>
      )}

      <ScannerManual
        manualCode={manualCode}
        setManualCode={setManualCode}
        onSubmit={handleManualSubmit}
      />
    </div>
  )
}

const DisabledScanner = ({ reasons }: { reasons: string[] }) => (
  <div className='mt-5 flex flex-col items-center'>
    <Card className='w-full max-w-md'>
      <CardHeader className='text-center'>
        <RiErrorWarningFill className='mx-auto size-12 text-yellow-500' />
        <CardTitle>Scanner Disabled</CardTitle>
        {reasons.length > 0 && (
          <CardDescription>Please provide the following to enable scanning:</CardDescription>
        )}
      </CardHeader>
      {reasons.length > 0 && (
        <CardContent>
          <div className='flex flex-wrap justify-center gap-2'>
            {reasons.map((reason) => (
              <Badge
                key={reason}
                variant='outline'
              >
                {reason}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  </div>
)

const ScannerStatus = ({ error, result }: { error: string | null; result: ScanResult | null }) => {
  const isError = !!error
  const title = isError ? 'Error' : 'Scanned'
  const content = isError ? error : result?.text

  if (!content) return null

  return (
    <div
      className={cn(
        'mt-5 h-fit min-w-75 rounded-md border px-4 py-3 text-center',
        isError ? 'border-destructive bg-destructive/5' : 'border-success bg-success/5'
      )}
    >
      <div className='text-xs tracking-wide uppercase'>{title}</div>
      <div
        className={cn(
          'mt-1 text-base font-semibold break-all',
          isError ? 'text-destructive' : 'text-success'
        )}
      >
        {content}
      </div>
    </div>
  )
}

const ScannerStatusSkeleton = () => (
  <div className='border-muted bg-muted/40 mt-5 h-18 min-w-75 rounded-md border px-4 py-3 text-center'>
    <Skeleton className='mx-auto h-3 w-16' />
    <Skeleton className='mt-2 h-5 w-full' />
  </div>
)

const ScannerManual = ({
  manualCode,
  setManualCode,
  onSubmit
}: {
  manualCode: string
  setManualCode: React.Dispatch<React.SetStateAction<string>>
  onSubmit: (e: React.FormEvent) => void
}) => (
  <form
    onSubmit={onSubmit}
    className='mt-4 w-full max-w-md space-y-2'
  >
    <div className='text-muted-foreground flex items-center gap-2 text-sm'>
      <RiKeyboardBoxLine className='size-4' />
      <span>Or enter barcode manually:</span>
    </div>
    <div className='flex gap-2'>
      <Input
        value={manualCode}
        onChange={(e) => setManualCode(e.target.value)}
        placeholder='Enter barcode...'
        className='flex-1'
      />
      <Button
        type='submit'
        variant='outline'
        disabled={!manualCode.trim()}
      >
        Submit
      </Button>
    </div>
  </form>
)

const ScannerVideo = ({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) => (
  <div className='relative aspect-4/3 w-full max-w-md overflow-hidden rounded-xl bg-black'>
    <video
      ref={videoRef}
      muted
      playsInline
      className='size-full object-cover'
    />
    <div className='absolute inset-0 flex items-center rounded-xl border-4 border-white/50'>
      <div className='bg-primary h-0.5 w-full animate-pulse shadow-[0_0_8px_#22c55e]' />
    </div>
  </div>
)
