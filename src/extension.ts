import { ActivationContext, AudioClip, AudioTrack, Handle, initialize } from "@ableton-extensions/sdk";

import settingsHtml from "./ui/settings.html";
import settingsCss  from "./ui/settings.css";
import settingsJs   from "./ui/settings.js";

const settingsInterface = settingsHtml
    .replace("/* __STYLE__ */", settingsCss)
    .replace("/* __SCRIPT__ */", settingsJs);

const settingsDialogUrl = `data:text/html,${encodeURIComponent(settingsInterface)}`;

type DialogResult =
    | { cancelled: true}
    | {
        cancelled: false;
        mode: "prep";
        warp: boolean;
        align: boolean;
        mute: boolean;
    }
    | {
        cancelled: false;
        mode: "rename";
        scope: "track" | "set";
    };

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

function getTrackFromHandle(
    context: ReturnType<typeof initialize<"1.0.0">>,
    handle: Handle
): AudioTrack<"1.0.0"> | undefined {
    try {
        return context.getObjectFromHandle(handle, AudioTrack);
    } catch {
        try {
            const clip = context.getObjectFromHandle(handle, AudioClip);
            const parent = clip.parent;
            return parent instanceof AudioTrack ? parent : undefined;
        } catch {
            return undefined;
        }
    }
}

async function runStemPreparation(
    context: ReturnType<typeof initialize<"1.0.0">>,
    tracks: AudioTrack<"1.0.0">[],
    settings: { warp: boolean; align: boolean; mute: boolean; }
) {
    const total = tracks.length;
            
    await context.ui.withinProgressDialog("Preparing Stems", {}, async (update, abortSignal) => {        
        for (let i = 0; i < tracks.length; i++) {
            // cancel button
            if (abortSignal.aborted) {
                update("Cancelled.", 100);
                return;
            }

            // current track + progress
            const track = tracks[i];
            const progress = Math.round((i / total) * 100);

            // read clips
            const clips = track.arrangementClips.filter(
                (c): c is AudioClip<"1.0.0"> => c instanceof AudioClip
            );
            
            const currentTrackInfo = `[${i + 1}/${total}] ${track.name}`;

            if (settings.warp || settings.align) {
                await update(`${currentTrackInfo} - reading clips..`, progress);

                // 1: take a snapshot of every clip in the track
                const snapshots = clips.map(clip => ({
                    clip,
                    filePath:       clip.filePath,
                    duration:       clip.duration,
                    startMarker:    clip.startMarker,
                    endMarker:      clip.endMarker,
                    startTime:      clip.startTime,
                    name:           clip.name,
                    color:          clip.color,
                    muted:          clip.muted
                }));

                // 2: delete existing clips
                await update(`${currentTrackInfo} - deleting clips..`, progress);

                for (const { clip } of snapshots) {
                    await context.withinTransaction(() => track.deleteClip(clip));
                }

                // 3: recreate the clips
                await update(`${currentTrackInfo} - placing clips..`, progress);

                let cursor = 0;

                for (const s of snapshots) {
                    const startTime = settings.align ? cursor : s.startTime;

                    const newClip = await context.withinTransaction(() =>
                        track.createAudioClip({
                            filePath:   s.filePath,
                            startTime,
                            isWarped:   settings.warp ? false : true
                        })
                    );

                    await context.withinTransaction(() => {
                        newClip.name =  s.name;
                        newClip.color = s.color;
                        newClip.muted = s.muted;
                    });

                    cursor += s.duration;
                }
            }

            if (settings.mute) {
                await update(`${currentTrackInfo} - muting...`, progress);
                await context.withinTransaction(() => {
                    track.mute = true;
                });
            }
        }

        await update(`Done - ${total} track(s) have been prepared!`, 100);
        console.log(`Done - ${total} track(s) have been prepared!`);
    });
}

async function runRenameClips(
    context: ReturnType<typeof initialize<"1.0.0">>,
    tracks:  AudioTrack<"1.0.0">[]
) {
    const total = tracks.length;

    await context.ui.withinProgressDialog("Renaming Clips", { progress: 0 }, async (update, abortSignal) => {
        for (let i = 0; i < tracks.length; i++) {
            if (abortSignal.aborted) {
                await update("Cancelled.", 100);
                return;
            }

            const track = tracks[i];
            const progress = Math.round((i / total) * 100);
            
            await update(`[${i + 1}/${total}] - Renaming ${track.name}...`, progress);
            await renameClipsOnTrack(context, track);
        }

        await update(`Done - ${total} tracks have been renamed.`, 100);
        console.log(`Done - ${total} tracks have been renamed.`);
    });
}

export function activate(activation: ActivationContext) {
    const context = initialize(activation, "1.0.0");

    // Register
    context.ui.registerContextMenuAction("AudioTrack", "Open..", "trueClip.run");
    context.ui.registerContextMenuAction("AudioClip", "Open..", "trueClip.run");

    context.commands.registerCommand("trueClip.run", (_arg: unknown) => {
        void (async (handle: Handle) => {
            try {
                const resultString = await context.ui.showModalDialog(
                    settingsDialogUrl,
                    380, 420
                );

                const result = JSON.parse(resultString) as DialogResult;

                if (result.cancelled) {
                    console.log("Cancelled by user.");
                    return;
                }

                const song = context.application.song;
                const allAudioTracks = song.tracks.filter(
                    (t): t is AudioTrack<"1.0.0"> => t instanceof AudioTrack && t.arrangementClips.length > 0
                );

                if (result.mode == "prep") {
                    if (allAudioTracks.length === 0) {
                        console.log("No audio tracks with clips found.");
                        return;
                    }

                    await runStemPreparation(context, allAudioTracks, {
                        warp:   result.warp,
                        align:  result.align,
                        mute:   result.mute
                    });
                    return;
                }

                // mode is rename
                if (result.scope === "set") {
                    if (allAudioTracks.length === 0) {
                        console.log("No audio tracks with clips found.");
                        return;
                    }

                    await runRenameClips(context, allAudioTracks);
                } else {
                    const track = getTrackFromHandle(context, handle);
                    
                    if (!track) {
                        console.log("Could not resolve the selected track.");
                        return;
                    }

                    await runRenameClips(context, [track]);
                }
            } catch (err) {
                console.error(`Error occurred: ${err}`);
            }
        })(_arg as Handle);
    });

    console.log("Extension is ready!");
}