import { RenderDataWorkerPool } from "../mapviewer/worker/RenderDataWorkerPool";
import { SoundData, SoundLoader, SoundLoaderInput } from "../mapviewer/worker/SoundLoader";

export type AudioSettings = {
    muted: boolean;
    // 0-1: the sound effects', and the music's (maps with music)
    volume: number;
    music: number;
};

// A horde makes hundreds of sounds a second; keep it to a few at once
const MAX_VOICES = 24;
// Sounds this far from the player (tiles) are at their quietest
const HEARING_DISTANCE = 22;
// Music plays this much quieter than the sound effects, under the fighting
const MUSIC_VOLUME = 0.7;

export type PlayOptions = {
    // 0-1 before the master volume
    volume?: number;
    // -1 (left) to 1 (right)
    pan?: number;
    // Milliseconds before the same sound can play again
    minGap?: number;
    // A low pass (Hz): some of the synthesizer's sounds have hiss right up top, which this takes
    // off. It can't soften a sound that's one high tone: that's a matter for volume and rate.
    lowpass?: number;
    // Playback speed: under 1 plays a sound lower, and longer by as much (0.5 is an octave down)
    rate?: number;
};

function loadSettings(key: string): AudioSettings {
    try {
        const json = window.localStorage.getItem(key);
        if (json) {
            const data = JSON.parse(json);
            const volume = readVolume(data.volume, 0.6);
            return {
                muted: !!data.muted,
                volume,
                // Saved before music had its own: as loud as it was
                music: readVolume(data.music, volume),
            };
        }
    } catch (e) {}
    return { muted: false, volume: 0.6, music: 0.6 };
}

function readVolume(value: unknown, otherwise: number): number {
    return typeof value === "number" ? Math.min(Math.max(value, 0), 1) : otherwise;
}

// Plays the client's synthesized sound effects with Web Audio. Browsers only
// allow audio after the page is interacted with, so the context is made on the
// first click or key press; sounds asked for before then are skipped. On a touch
// screen a press doesn't count until the finger lifts, hence the two ends of one.
export class GameAudio {
    settings: AudioSettings;

    private context?: AudioContext;
    private master?: GainNode;
    // Synthesized, waiting for their first play: each one moves into an
    // AudioBuffer then, so a sound is only held once
    private readonly sounds = new Map<number, SoundData>();
    private readonly buffers = new Map<number, AudioBuffer>();
    private readonly lastPlayed = new Map<number, number>();
    private voices = 0;
    // The recording looping now, streamed rather than decoded up front
    private music?: { url: string; element: HTMLAudioElement };
    // Where music a game makes itself goes: the music's volume and mute, apart from the effects'
    private musicBus?: GainNode;
    private readonly musicWaiting: ((context: AudioContext, output: AudioNode) => void)[] = [];

    // settingsKey: where the volume and mute are kept in localStorage, the game's own
    constructor(private readonly settingsKey: string) {
        this.settings = loadSettings(settingsKey);
        window.addEventListener("pointerdown", this.unlock);
        window.addEventListener("pointerup", this.unlock);
        window.addEventListener("touchend", this.unlock);
        window.addEventListener("keydown", this.unlock);
        document.addEventListener("visibilitychange", this.onVisibilityChange);
    }

    dispose(): void {
        window.removeEventListener("pointerdown", this.unlock);
        window.removeEventListener("pointerup", this.unlock);
        window.removeEventListener("touchend", this.unlock);
        window.removeEventListener("keydown", this.unlock);
        document.removeEventListener("visibilitychange", this.onVisibilityChange);
        this.stopMusic();
        this.context?.close();
    }

    // Synthesizes the sounds in the render workers
    async load(workerPool: RenderDataWorkerPool, ids: number[]): Promise<void> {
        const unique = [...new Set(ids.filter((id) => id >= 0))];
        const sounds = await workerPool.queueLoad<SoundLoaderInput, SoundData[], SoundLoader>(
            new SoundLoader(),
            { ids: unique },
        );
        this.add(sounds);
    }

    // Samples the game has without the render workers (made in code, or exported from the cache and
    // loaded from files), played the same way as the cache's. One under an id already held takes its
    // place.
    add(sounds: SoundData[]): void {
        for (const sound of sounds) {
            this.sounds.set(sound.id, sound);
            this.buffers.delete(sound.id);
        }
    }

    private unlock = (): void => {
        if (!this.context) {
            try {
                this.context = new AudioContext();
                this.master = this.context.createGain();
                this.master.connect(this.context.destination);
                this.musicBus = this.context.createGain();
                this.musicBus.connect(this.context.destination);
                this.applyVolume();
            } catch (e) {
                console.error("No audio", e);
                return;
            }
            for (const start of this.musicWaiting.splice(0)) {
                start(this.context, this.musicBus!);
            }
        }
        // iOS also has "interrupted", for after a call or going to another app
        if (this.context.state !== "running") {
            this.context.resume();
        }
        // Started away from a press, it can be refused (a run has loading first)
        if (this.music?.element.paused) {
            this.music.element.play().catch(() => {});
        }
    };

    private onVisibilityChange = (): void => {
        if (!document.hidden && this.context && this.context.state !== "running") {
            this.context.resume().catch(() => {});
        }
    };

    private applyVolume(): void {
        if (this.master) {
            this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
        }
        if (this.musicBus) {
            this.musicBus.gain.value = this.settings.muted ? 0 : this.settings.music * MUSIC_VOLUME;
        }
        if (this.music) {
            this.music.element.volume = this.settings.music * MUSIC_VOLUME;
            this.music.element.muted = this.settings.muted;
        }
    }

    // Loops a recording quietly until it's stopped (a run's map music). Runs
    // start with a click, so the browser lets it play.
    playMusic(url: string): void {
        if (this.music?.url !== url) {
            this.stopMusic();
            const element = new Audio(url);
            element.loop = true;
            this.music = { url, element };
            this.applyVolume();
        }
        this.music.element.play().catch((e) => console.warn("No music", e));
    }

    // Music a game makes itself with Web Audio, rather than a recording: `start` gets the context
    // and the node to connect it to, which follows the music's volume and mute. That's once the
    // browser allows sound (the first press), or at once if it already does.
    onMusicOutput(start: (context: AudioContext, output: AudioNode) => void): void {
        if (this.context && this.musicBus) {
            start(this.context, this.musicBus);
        } else {
            this.musicWaiting.push(start);
        }
    }

    stopMusic(): void {
        if (this.music) {
            this.music.element.pause();
            // Lets go of the stream
            this.music.element.removeAttribute("src");
            this.music.element.load();
            this.music = undefined;
        }
    }

    setSettings(settings: Partial<AudioSettings>): void {
        this.settings = { ...this.settings, ...settings };
        this.applyVolume();
        try {
            window.localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
        } catch (e) {}
    }

    private getBuffer(id: number): AudioBuffer | undefined {
        const context = this.context;
        if (!context) {
            return undefined;
        }
        let buffer = this.buffers.get(id);
        if (!buffer) {
            const sound = this.sounds.get(id);
            if (!sound || sound.samples.length === 0) {
                return undefined;
            }
            buffer = context.createBuffer(1, sound.samples.length, sound.sampleRate);
            buffer.copyToChannel(sound.samples as Float32Array<ArrayBuffer>, 0);
            this.buffers.set(id, buffer);
            this.sounds.delete(id);
        }
        return buffer;
    }

    play(id: number, options: PlayOptions = {}): void {
        const context = this.context;
        const master = this.master;
        if (
            id < 0 ||
            !context ||
            !master ||
            context.state !== "running" ||
            this.settings.muted ||
            this.voices >= MAX_VOICES
        ) {
            return;
        }
        const now = performance.now();
        const last = this.lastPlayed.get(id) ?? -Infinity;
        if (now - last < (options.minGap ?? 50)) {
            return;
        }
        const buffer = this.getBuffer(id);
        if (!buffer) {
            return;
        }
        this.lastPlayed.set(id, now);

        const source = context.createBufferSource();
        source.buffer = buffer;
        if (options.rate) {
            source.playbackRate.value = options.rate;
        }
        const gain = context.createGain();
        gain.gain.value = options.volume ?? 1;
        let node: AudioNode = gain;
        if (options.pan) {
            const panner = context.createStereoPanner();
            panner.pan.value = Math.min(Math.max(options.pan, -1), 1);
            gain.connect(panner);
            node = panner;
        }
        let filter: BiquadFilterNode | undefined;
        if (options.lowpass) {
            filter = context.createBiquadFilter();
            filter.type = "lowpass";
            filter.frequency.value = options.lowpass;
            // Flat to the corner (Butterworth; for a low pass Q is in dB), with none of the default's
            // bump there to ring
            filter.Q.value = -3.01;
            source.connect(filter);
            filter.connect(gain);
        } else {
            source.connect(gain);
        }
        node.connect(master);
        this.voices++;
        source.onended = () => {
            this.voices--;
            source.disconnect();
            filter?.disconnect();
            node.disconnect();
        };
        source.start();
    }

    // A sound at a world position, quieter and panned by where it is from the
    // listener (the camera faces north, so east is to the right)
    playAt(
        id: number,
        x: number,
        y: number,
        listenerX: number,
        listenerY: number,
        options: PlayOptions = {},
    ): void {
        const dx = x - listenerX;
        const dy = y - listenerY;
        const distance = Math.hypot(dx, dy);
        const falloff = Math.max(0.2, 1 - distance / HEARING_DISTANCE);
        this.play(id, {
            ...options,
            volume: (options.volume ?? 1) * falloff,
            pan: Math.min(Math.max(dx / 14, -0.8), 0.8),
        });
    }
}
