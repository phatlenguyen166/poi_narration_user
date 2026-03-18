import { useEffect, useState } from 'react'
import { audioService } from '../services/audio'
import type { AudioState } from '../types'

const format = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '00:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioState>(() => audioService.getState())

  useEffect(() => {
    return audioService.subscribe(() => {
      setState(audioService.getState())
    })
  }, [])

  return {
    state,
    play: (): Promise<void> => audioService.play(),
    pause: (): void => audioService.pause(),
    stop: (): void => audioService.stop(),
    seek: (seconds: number): void => audioService.seek(seconds),
    formatTime: format
  }
}
