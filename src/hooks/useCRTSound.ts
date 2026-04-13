import {
  useCallback,
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  createElement,
  type ReactNode,
} from 'react'

type SoundType = 'boot' | 'glitch' | 'type' | 'transition' | 'click' | 'whoosh'

interface CRTSoundOptions {
  defaultEnabled?: boolean
  defaultVolume?: number
}

interface CRTSoundResult {
  isEnabled: boolean
  volume: number
  toggleSound: () => void
  setVolume: (volume: number) => void
  playSound: (type: SoundType) => void
  playBootSound: () => void
  playGlitchSound: () => void
  playTypeSound: () => void
  playTransitionSound: () => void
  playClickSound: () => void
}

// Storage key for user preference
const STORAGE_KEY = 'horizon-crt-sound-enabled'
const VOLUME_KEY = 'horizon-crt-sound-volume'

/**
 * Web Audio API-based CRT sound effects hook
 * Creates synthesized retro sounds without requiring audio files
 */
export function useCRTSound(options: CRTSoundOptions = {}): CRTSoundResult {
  const { defaultEnabled = false, defaultVolume = 0.3 } = options

  // Load initial state from localStorage
  const [isEnabled, setIsEnabled] = useState(() => {
    if (typeof window === 'undefined') return defaultEnabled
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? stored === 'true' : defaultEnabled
  })

  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return defaultVolume
    const stored = localStorage.getItem(VOLUME_KEY)
    return stored ? parseFloat(stored) : defaultVolume
  })

  // Audio context reference
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context on first interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    // Resume if suspended (browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isEnabled))
  }, [isEnabled])

  useEffect(() => {
    localStorage.setItem(VOLUME_KEY, String(volume))
  }, [volume])

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setIsEnabled((prev) => !prev)
  }, [])

  // Set volume (0-1)
  const setVolume = useCallback((newVolume: number) => {
    setVolumeState(Math.max(0, Math.min(1, newVolume)))
  }, [])

  /**
   * Create a noise buffer for static/glitch effects
   */
  const createNoiseBuffer = useCallback(
    (context: AudioContext, duration: number): AudioBuffer => {
      const sampleRate = context.sampleRate
      const bufferSize = sampleRate * duration
      const buffer = context.createBuffer(1, bufferSize, sampleRate)
      const data = buffer.getChannelData(0)

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1
      }

      return buffer
    },
    []
  )

  /**
   * Play CRT boot/power-on sound - DISABLED
   */
  const playBootSound = useCallback(() => {
    // Sounds disabled
    return
  }, [])

  /**
   * Play glitch/static sound - DISABLED
   */
  const playGlitchSound = useCallback(() => {
    return
  }, [])

  /**
   * Play typing/keypress sound - DISABLED
   */
  const playTypeSound = useCallback(() => {
    return
  }, [])

  /**
   * Play transition/whoosh sound - DISABLED
   */
  const playTransitionSound = useCallback(() => {
    return
  }, [])

  /**
   * Play click sound - DISABLED
   */
  const playClickSound = useCallback(() => {
    return
  }, [])

  /**
   * Generic play sound function
   */
  const playSound = useCallback(
    (type: SoundType) => {
      switch (type) {
        case 'boot':
          playBootSound()
          break
        case 'glitch':
          playGlitchSound()
          break
        case 'type':
          playTypeSound()
          break
        case 'transition':
        case 'whoosh':
          playTransitionSound()
          break
        case 'click':
          playClickSound()
          break
      }
    },
    [playBootSound, playGlitchSound, playTypeSound, playTransitionSound, playClickSound]
  )

  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  return {
    isEnabled,
    volume,
    toggleSound,
    setVolume,
    playSound,
    playBootSound,
    playGlitchSound,
    playTypeSound,
    playTransitionSound,
    playClickSound,
  }
}

/**
 * Global sound context for sharing sound state across components
 */
const CRTSoundContext = createContext<CRTSoundResult | null>(null)

export function CRTSoundProvider({ children }: { children: ReactNode }) {
  const sound = useCRTSound()

  return createElement(CRTSoundContext.Provider, { value: sound }, children)
}

export function useCRTSoundContext(): CRTSoundResult {
  const context = useContext(CRTSoundContext)
  if (!context) {
    throw new Error('useCRTSoundContext must be used within a CRTSoundProvider')
  }
  return context
}

/**
 * Safe version of useCRTSoundContext that returns null if not in provider
 * Useful for components that may render before provider is mounted
 */
export function useCRTSoundContextSafe(): CRTSoundResult | null {
  const context = useContext(CRTSoundContext)
  return context
}
