# Stem Preparator

An [Ableton Live](https://www.ableton.com) extension, to prepare your stems. <br>
This was my standard procedure to prepare my stems, and I just made it an extension to automate that process.

## Features

Turns all Audio Clips into production-ready format, by:
1. Turning off warps for all clips
2. Putting the clip to the first point in the arrangement (1.1.1.1)
3. Brings the start of the clip to the start of the audio
4. Same with the end of the clip and the audio
5. Turns off the track, so when you hit play, your ears won't get blasted off

A couple important things to note are:
* It only works on Audio Tracks
* It DOES retain the original clip names, colours and mute states

## Prerequisites

Only if you want to compile the extension from the source:
- Node.js ≥ 24.14.1
- Ableton Extensions SDK (available to beta testers via Ableton's Centercode program — place the `.tgz` files in `vendor/`)

## Installation

You need Ableton Live 12.4.5 (extensions should be supported) or higher to work.

1. Download the latest release from the [Releases](https://github.com/wuritz/stem-preparator/releases/latest) page
2. Open Ableton's `Preferences\Extensions`
3. Drag & Drop into there

## Usage
Right-click onto an `Audio Track` or an `Audio Clip`, and under `Extensions` select `Stem Preparator - Prepare All Stems`.