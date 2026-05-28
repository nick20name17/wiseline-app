import { toast } from 'sonner'

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}

export const playBeep = (success: boolean) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    const audioContext = new AudioContextClass()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = success ? 800 : 300
    oscillator.type = 'sine'
    gainNode.gain.value = 0.3

    oscillator.start()
    oscillator.stop(audioContext.currentTime + (success ? 0.15 : 0.3))
  } catch {
    toast.error('Failed to play sound')
  }
}
