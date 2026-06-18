import "./index.css";
import { Composition } from "remotion";
import { Narrated } from "./Composition";
import { AUDIO_S, FPS } from "./vo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Narrated"
      component={Narrated}
      durationInFrames={Math.ceil(AUDIO_S * FPS)}
      fps={FPS}
      width={1280}
      height={720}
    />
  );
};
