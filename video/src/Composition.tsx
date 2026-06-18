import { AbsoluteFill, Audio, OffthreadVideo, staticFile } from "remotion";
import { PLAYBACK_RATE } from "./vo";

// Captioned screencast (silent) stretched to the voiceover length, with the
// ElevenLabs narration as the audio track.
export const Narrated: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo src={staticFile("screencast.mp4")} playbackRate={PLAYBACK_RATE} muted />
      <Audio src={staticFile("narration.mp3")} />
    </AbsoluteFill>
  );
};
