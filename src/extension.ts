import { ActivationContext, AudioClip, AudioTrack, initialize } from "@ableton-extensions/sdk";

export function activate(activation: ActivationContext) {
    const context = initialize(activation, "1.0.0");

    context.ui.registerContextMenuAction("AudioTrack", "Prepare All Tracks", "trueClip.run");
    context.ui.registerContextMenuAction("AudioClip", "Prepare All Tracks", "trueClip.run");

    context.commands.registerCommand("trueClip.run", (_arg: unknown) => {
        void (async () => {
            const song = context.application.song;

            // collect audiotracks
            const audioTracks = song.tracks.filter(
                (t): t is AudioTrack<"1.0.0"> => t instanceof AudioTrack && t.arrangementClips.length > 0
            );

            if (audioTracks.length === 0) {
                console.log("No audio tracks with clips found.");
                return;
            }

            // we can begin
            const total = audioTracks.length;
            
            await context.ui.withinProgressDialog("Preparing Stems", {}, async (update, abortSignal) => {        
                for (let i = 0; i < audioTracks.length; i++) {
                    // cancel button
                    if (abortSignal.aborted) {
                        update("Cancelled.", 100);
                        return;
                    }

                    // current track + progress
                    const track = audioTracks[i];
                    const progress = Math.round((i / total) * 100);

                    const currentTrackInfo = `[${i + 1}/${total}] ${track.name}`;

                    update(`${currentTrackInfo} - reading clips..`, progress);

                    // read clips
                    const clips = track.arrangementClips.filter(
                        (c): c is AudioClip<"1.0.0"> => c instanceof AudioClip
                    );

                    // 1: take a snapshot of every clip in the track
                    const snapshots = clips.map(clip => ({
                        clip,
                        filePath:       clip.filePath,
                        duration:       clip.duration,
                        startMarker:    clip.startMarker,
                        endMarker:      clip.endMarker,
                        name:           clip.name,
                        color:          clip.color,
                        muted:          clip.muted
                    }));

                    // 2: delete existing clips
                    update(`${currentTrackInfo} - deleting clips..`, progress);

                    for (const { clip } of snapshots) {
                        await context.withinTransaction(() => track.deleteClip(clip));
                    }

                    // 3: recreate the clips
                    update(`${currentTrackInfo} - placing clips..`, progress);

                    let cursor = 0;

                    for (const s of snapshots) {
                        const newClip = await context.withinTransaction(() =>
                            track.createAudioClip({
                                filePath:   s.filePath,
                                startTime:  cursor,
                                isWarped:   false
                            })
                        );

                        await context.withinTransaction(() => {
                            newClip.name =  s.name;
                            newClip.color = s.color;
                            newClip.muted = s.muted;
                        });

                        cursor += s.duration;
                    }

                    update(`${currentTrackInfo} - muting..`, progress);

                    await context.withinTransaction(() => {
                        track.mute = true;
                    });
                }

                update(`Done - ${total} track(s) have been prepared!`, 100);
                console.log(`Done - ${total} track(s) have been prepared!`);
            });
        })();
    });

    console.log("Extension ready!");
}