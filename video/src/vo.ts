// The ElevenLabs voiceover (public/narration.mp3) is the timing authority.
// The screencast is stretched by an imperceptible factor so it co-terminates.
export const FPS = 30;
export const AUDIO_S = 122.488163; // public/narration.mp3
export const SCREENCAST_S = 119.8; // public/screencast.mp4
export const PLAYBACK_RATE = SCREENCAST_S / AUDIO_S; // ~0.978
