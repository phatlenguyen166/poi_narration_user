import type { AudioPlaybackResult, AudioState } from '../types'

type Listener = () => void
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='

class AudioService {
  private readonly audio = new Audio()
  private readonly unlockAudio = new Audio(SILENT_WAV)
  private listeners = new Set<Listener>()
  private unlocked = false
  private state: AudioState = {
    currentSrc: null,
    isPlaying: false,
    duration: 0,
    currentTime: 0
  }

  constructor() {
    this.audio.preload = 'auto'
    this.unlockAudio.preload = 'auto'
    this.audio.addEventListener('play', this.onPlay)
    this.audio.addEventListener('pause', this.onPause)
    this.audio.addEventListener('ended', this.onEnded)
    this.audio.addEventListener('timeupdate', this.onTimeUpdate)
    this.audio.addEventListener('durationchange', this.onDurationChange)
    this.bindGestureUnlock()
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getState(): AudioState {
    return { ...this.state }
  }

  async playSources(sources: string[]): Promise<AudioPlaybackResult> {
    let blockedSource: string | null = null

    for (const source of sources) {
      const result = await this.tryPlaySource(source)
      if (result.status === 'playing') {
        return result
      }
      if (result.status === 'blocked') {
        blockedSource = result.source
      }
    }

    if (blockedSource) {
      return { status: 'blocked', source: blockedSource }
    }

    return { status: 'missing', source: null }
  }

  async play(): Promise<void> {
    try {
      await this.audio.play()
    } catch {
      // ignore autoplay errors; UI still reflects current state
    }
  }

  pause(): void {
    this.audio.pause()
  }

  stop(): void {
    this.audio.pause()
    this.audio.currentTime = 0
    this.state = {
      ...this.state,
      isPlaying: false,
      currentTime: 0
    }
    this.emit()
  }

  seek(seconds: number): void {
    this.audio.currentTime = Math.max(0, seconds)
    this.state = {
      ...this.state,
      currentTime: this.audio.currentTime
    }
    this.emit()
  }

  async unlock(): Promise<void> {
    if (this.unlocked) {
      return
    }

    try {
      this.unlockAudio.currentTime = 0
      await this.unlockAudio.play()
      this.unlockAudio.pause()
      this.unlockAudio.currentTime = 0
      this.unlocked = true
    } catch {
      // ignore, browser may still allow playback after the next user gesture
    }
  }

  private bindGestureUnlock(): void {
    if (typeof document === 'undefined') {
      return
    }

    const handler = () => {
      void this.unlock()
      document.removeEventListener('pointerdown', handler)
      document.removeEventListener('keydown', handler)
    }

    document.addEventListener('pointerdown', handler, { passive: true })
    document.addEventListener('keydown', handler, { passive: true })
  }

  private async tryPlaySource(source: string): Promise<AudioPlaybackResult> {
    const loaded = await this.loadSource(source)
    if (!loaded) {
      return { status: 'missing', source: null }
    }

    this.audio.currentTime = 0
    this.state = {
      ...this.state,
      currentSrc: source
    }
    this.emit()

    try {
      await this.audio.play()
      return { status: 'playing', source }
    } catch (error) {
      const playbackError = error as DOMException | undefined
      if (playbackError?.name === 'NotAllowedError') {
        return { status: 'blocked', source }
      }
      return { status: 'missing', source: null }
    }
  }

  private async loadSource(source: string): Promise<boolean> {
    if (this.audio.src !== source) {
      this.audio.src = source
    }
    this.audio.load()

    return await new Promise<boolean>((resolve) => {
      const onReady = () => cleanup(true)
      const onError = () => cleanup(false)
      const timeoutId = window.setTimeout(() => cleanup(this.audio.duration > 0), 4000)

      const cleanup = (result: boolean) => {
        window.clearTimeout(timeoutId)
        this.audio.removeEventListener('loadedmetadata', onReady)
        this.audio.removeEventListener('canplay', onReady)
        this.audio.removeEventListener('error', onError)
        resolve(result)
      }

      this.audio.addEventListener('loadedmetadata', onReady, { once: true })
      this.audio.addEventListener('canplay', onReady, { once: true })
      this.audio.addEventListener('error', onError, { once: true })
    })
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  private readonly onPlay = (): void => {
    this.state = {
      ...this.state,
      isPlaying: true
    }
    this.emit()
  }

  private readonly onPause = (): void => {
    this.state = {
      ...this.state,
      isPlaying: false
    }
    this.emit()
  }

  private readonly onEnded = (): void => {
    this.state = {
      ...this.state,
      isPlaying: false,
      currentTime: 0
    }
    this.emit()
  }

  private readonly onTimeUpdate = (): void => {
    this.state = {
      ...this.state,
      currentTime: this.audio.currentTime
    }
    this.emit()
  }

  private readonly onDurationChange = (): void => {
    this.state = {
      ...this.state,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0
    }
    this.emit()
  }
}

export const audioService = new AudioService()
