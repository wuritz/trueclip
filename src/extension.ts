import {
  initialize,
  type ActivationContext,
  AudioTrack,
  AudioClip
} from "@ableton-extensions/sdk";

export function activate(activation: ActivationContext) {
  const context = initialize(activation, "1.0.0");

  context.commands.registerCommand("stemPrep.run", (_arg: unknown) => {
      void (async () => {
        try {
          const song = context.application.song;

          let nOfTracks = 0;
          for (const track of song.tracks) {
            if (!(track instanceof AudioTrack)) continue;

            // If there's no clips in the track, skip
            const clips = track.arrangementClips;
            if (!clips || clips.length === 0) continue;

            // Turn off track
            await context.withinTransaction(() => {
              track.mute = true;
            });

            // Read all clips
            const snapshots = clips
              .filter((c): c is AudioClip<"1.0.0"> => c instanceof AudioClip)
              .map(clip => ({
                clip,
                filePath: clip.filePath,
                duration: clip.duration,
                startMarker: clip.startMarker,
                endMarker: clip.endMarker,
                name: clip.name,
                color: clip.color,
                muted: clip.muted
              }));

            for (const s of snapshots) {
              await context.withinTransaction(() => track.deleteClip(s.clip));
            }

            const newClips = [];
            for (const s of snapshots) {
              let _startTime = 0;

              if (newClips.length > 0) {
                const lastClip = newClips[newClips.length - 1];
                
                _startTime = lastClip.duration; 
              }

              const newClip = await context.withinTransaction(() =>
                track.createAudioClip({
                  filePath: s.filePath,
                  startTime: _startTime, 
                  isWarped: false 
                })
              );

              await context.withinTransaction(() => {
                newClip.name = s.name;
                newClip.color = s.color;
                newClip.muted = s.muted;
              });

              newClips.push(newClip);
            }

            nOfTracks++;
          }
          
          console.log(nOfTracks + " tracks have been prepared!");
        } catch (error) {
          console.error("Stem preparation failed:", error);
        }
      })();
    }
  );

  // Register Context Menu
  context.ui.registerContextMenuAction("AudioTrack", "Prepare All Stems", "stemPrep.run");
  context.ui.registerContextMenuAction("AudioClip", "Prepare All Stems", "stemPrep.run");

  console.log("Extension is ready!");
}