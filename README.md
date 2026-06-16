# TrueClip for Ableton Live

An [Ableton Live](https://www.ableton.com) extension designed to clean up, reset and sequence imported audio stems. <br>

When working with stems or tracking sessions, audio clips often end up trimmed, warped, or maybe scattered across the timeline. **TrueClip** automatically restores your clips to their true, unedited states and arranges them sequentially, making your timeline clean and ready for mixing or exporting.

I built TrueClip to automate my own personal workflow for prepping stems, turning a tedious routine into a convenient extension.

## Features

TrueClip optimizes your audio clips by: 

1. Turning off warps for all clips
2. Putting the clip to the first point in the arrangement (1.1.1.1)
3. Brings the start of the clip to the start of the audio
4. Same with the end of the clip and the audio
5. Turns off the track, so when you hit play, your ears won't get blasted off

A couple important things to note:
* It *ONLY* works on **Audio Tracks**
* It *DOES* retain the **original clip names, colours and mute states**

![Alt Text](https://media.giphy.com/media/vFKqnCdLPNOKc/giphy.gif)

## Prerequisites

If you want to compile the extension from the source:
- Node.js ≥ 24.14.1
- Ableton Extensions SDK (available to beta testers via Ableton's Centercode program — place the `.tgz` files in `vendor/`)

## Installation

You need **Ableton Live 12.4.5** (extensions should be supported) or higher to work.

1. Download the latest release (.ablx) from the [Releases](https://github.com/wuritz/trueclip/releases/latest) page
2. Open Ableton's `Preferences\Extensions`
3. Drag & Drop into there

## Usage
Right-click onto an `Audio Track` or an `Audio Clip`, and under `Extensions` select `TrueClip - Prepare All Tracks`.