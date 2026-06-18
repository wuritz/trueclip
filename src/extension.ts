import { ActivationContext, AudioClip, AudioTrack, Handle, initialize } from "@ableton-extensions/sdk";

export function activate(activation: ActivationContext) {
    const context = initialize(activation, "1.0.0");

    // 'prepare tracks' context
    context.ui.registerContextMenuAction("AudioTrack", "Prepare All Tracks", "trueClip.run");
    context.ui.registerContextMenuAction("AudioClip", "Prepare All Tracks", "trueClip.run");

    // 'rename tracks' context
    context.ui.registerContextMenuAction("AudioTrack", "This Track - Rename Clips to Track name", "trueClip.renameClips");
    context.ui.registerContextMenuAction("AudioClip", "This Track - Rename Clips to Track name", "trueClip.renameClips");
    
    context.ui.registerContextMenuAction("AudioTrack", "ALL - Rename Clips to Track name", "trueClip.renameClipsAll");
    context.ui.registerContextMenuAction("AudioClip", "ALL - Rename Clips to Track name", "trueClip.renameClipsAll");

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

    context.commands.registerCommand("trueClip.renameClips", (arg: unknown) => {
        void (async (handle: Handle) => {
            const track = context.getObjectFromHandle(handle, AudioTrack);
            await renameClipsOnTrack(context, track);

            console.log(`Renamed clips on ${track.name}.`);
        })(arg as Handle).catch((e) => console.error("Error renaming clips: ", e));
    });

    context.commands.registerCommand("trueClip.renameClipsAll", async (_arg: unknown) => {
        try {
            const song = context.application.song;

            const audioTracks = song.tracks.filter(
                (t): t is AudioTrack<"1.0.0"> => t instanceof AudioTrack && t.arrangementClips.length > 0
            );

            if (audioTracks.length === 0) {
                console.log("No audio tracks with clips found.");
                return;
            }

            const total = audioTracks.length;

            await context.ui.withinProgressDialog("Renaming Clips", { progress: 0}, async (update, abortSignal) => {
                for (let i = 0; i < audioTracks.length; i++) {
                    if (abortSignal.aborted) {
                        await update("Cancelled.", 100);
                        return;
                    }

                    const track = audioTracks[i];
                    const progress = Math.round((i / total) * 100);
                    
                    await update(`[${i + 1}/${total}] - Renaming ${track.name}...`, progress);
                    await renameClipsOnTrack(context, track);
                }

                await update(`Done - ${total} tracks have been renamed.`, 100);
                console.log(`Done - ${total} tracks have been renamed.`);
            });
        } catch (error) {
            console.error("Error renaming all tracks: ", error);
        }
    });

    console.log("Extension ready!");
}

async function renameClipsOnTrack(
    context: ReturnType<typeof initialize<"1.0.0">>, 
    track: AudioTrack<"1.0.0">
) {
    const clips = track.arrangementClips
        .filter((c) : c is AudioClip<"1.0.0"> => c instanceof AudioClip)
        .sort((a, b) => a.startTime - b.startTime);

    const multiple = clips.length > 1;

    for (let i = 0; i < clips.length; i++) {
        const name = multiple ? `${track.name}_${i + 1}` : track.name;
        
        await context.withinTransaction(() => {
            clips[i].name = name;
        });
    }
}