import { _decorator, Component, Node, AudioSource, AudioClip } from 'cc';
import { random } from './Const';
import { Audio_Clip_Group_Pair, Auido_Clip_Pair } from './TIny_Little_Components';
const { ccclass, property } = _decorator;

export function play_sfx(sfx_name: string) {
    const audio = Audio_Manager.instance;

    const clip = audio.sfx_map.get(sfx_name);
    if (!clip) return;

    audio.secondary.playOneShot(clip);
}

export function end_sfx() {
    const audio = Audio_Manager.instance;
    audio.secondary.stop();
}

export function random_sfx(sfx_group_name: string) {
    const audio = Audio_Manager.instance;
    const group = audio.sfx_group_map.get(sfx_group_name);
    if (!group) return;

    audio.secondary.playOneShot(group.random_pick_one());
}

export function play_music(music_name: string, loop: boolean = false) {
    const audio = Audio_Manager.instance;
    const clip = audio.music_map.get(music_name);
    if (!clip) return;

    audio.primary.clip = clip;
    audio.primary.play();
}

export function loop_music(music_name: string) {
    play_music(music_name, true);
}

export function end_music() {
    const audio = Audio_Manager.instance;
    audio.primary.stop();
}

class Sfx_Group {
    clips: AudioClip[] = null;
    constructor(clips: AudioClip[]) {
        this.clips = clips;
    }

    #last_pick: number = -1;
    random_pick_one(): AudioClip {
        let i = random(0, this.clips.length - 1);
        if (i == this.#last_pick) {
            i = random(0, this.clips.length - 1);
        }
        this.#last_pick = i;
        return this.clips[i];
    }
}

@ccclass('Audio_Manager')
export class Audio_Manager extends Component {
    public static instance: Audio_Manager = null;
    public static Settle(instance: Audio_Manager) {
        Audio_Manager.instance = instance;
    }

    @property(AudioSource) primary: AudioSource = null;
    @property(AudioSource) secondary: AudioSource = null;

    @property([Auido_Clip_Pair]) sfx: Auido_Clip_Pair[] = [];
    @property([Audio_Clip_Group_Pair]) sfx_group: Audio_Clip_Group_Pair[] = [];
    @property([Auido_Clip_Pair]) music: Auido_Clip_Pair[] = [];

    sfx_map: Map<string, AudioClip> = new Map();
    music_map: Map<string, AudioClip> = new Map();
    sfx_group_map: Map<string, Sfx_Group> = new Map();

    protected onLoad(): void {
        for (let s of this.sfx) {
            this.sfx_map.set(s.name, s.clip);
        }

        for (let m of this.music) {
            this.music_map.set(m.name, m.clip);
        }

        for (let sg of this.sfx_group) {
            this.sfx_group_map.set(sg.name, new Sfx_Group(sg.clips));
        }
    }
}