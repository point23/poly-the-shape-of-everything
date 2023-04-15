import { _decorator, Component, Node, AudioSource, AudioClip } from 'cc';
import { random } from './Const';
const { ccclass, property } = _decorator;

export enum Random_Audio_Group {
    DROP,
    PUSH,
}

type random_audio_group = {
    last_idx: number,
    clips: AudioClip[],
}

// @implementMe The future AUDIO api format...
function audio_play_sfx(sfx_name: string) {

}

@ccclass('Audio_Manager')
export class Audio_Manager extends Component {
    public static instance: Audio_Manager = null;
    public static Settle(instance: Audio_Manager) {
        Audio_Manager.instance = instance;
    }

    // MUSIC
    @property(AudioClip) main_theme: AudioClip = null;

    // SFX
    @property(AudioClip) show_hints: AudioClip = null;
    @property(AudioClip) footstep: AudioClip = null;
    @property(AudioClip) rewind: AudioClip = null;
    @property(AudioClip) switch_hero: AudioClip = null;
    @property(AudioClip) switch_turned_on: AudioClip = null;
    @property(AudioClip) rover_move: AudioClip = null;

    @property(AudioClip) possible_win: AudioClip = null;
    @property(AudioClip) pending_win: AudioClip = null;

    @property(AudioClip) invalid: AudioClip = null;
    @property(AudioClip) click: AudioClip = null;

    @property([AudioClip]) drop_sfx: AudioClip[] = [];
    @property([AudioClip]) push_sfx: AudioClip[] = [];

    @property(AudioSource) primary_audio: AudioSource = null;
    @property(AudioSource) secondary_audio: AudioSource = null;

    clip_groups: Map<number, random_audio_group> = new Map();

    start() {
        this.clip_groups.set(Random_Audio_Group.DROP, {
            last_idx: -1,
            clips: this.drop_sfx,
        });
        this.clip_groups.set(Random_Audio_Group.PUSH, {
            last_idx: -1,
            clips: this.push_sfx,
        });
    }

    random_play_one_sfx(group: Random_Audio_Group) {
        const item = this.clip_groups.get(group);
        const last_idx = item.last_idx;
        const clips = item.clips;
        let i = random(0, clips.length - 1);
        if (i == last_idx) {
            i = random(0, clips.length - 1);
        }
        item.last_idx = i;
        this.clip_groups.set(group, item);
        this.play_sfx(clips[i]);
    }

    loop(clip: AudioClip) {
        this.primary_audio.clip = clip;
        this.primary_audio.play();
    }

    end_loop() {
        this.primary_audio.stop();
    }

    play_sfx(clip: AudioClip) {
        this.secondary_audio.playOneShot(clip);
    }

    end_sfx() {
        this.secondary_audio.stop();
    }
}