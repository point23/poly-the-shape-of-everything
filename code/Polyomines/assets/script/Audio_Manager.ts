import { _decorator, Component, Node, AudioSource, AudioClip } from 'cc';
import { random } from './Const';
const { ccclass, property } = _decorator;

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
    @property(AudioClip) drop: AudioClip = null;
    @property(AudioClip) rewind: AudioClip = null;
    @property(AudioClip) switch_hero: AudioClip = null;
    @property(AudioClip) switch_turned_on: AudioClip = null;
    @property(AudioClip) rover_move: AudioClip = null;

    @property(AudioClip) possible_win: AudioClip = null;
    @property(AudioClip) pending_win: AudioClip = null;

    @property([AudioClip]) push_sfx: AudioClip[] = [];
    @property([AudioClip]) drop_sfx: AudioClip[] = [];

    @property(AudioSource) primary_audio: AudioSource = null;
    @property(AudioSource) secondary_audio: AudioSource = null;

    random_play_one(clips: AudioClip[]) {
        const i = random(0, clips.length - 1);
        this.play(clips[i]);
    }

    play(clip: AudioClip) {
        this.secondary_audio.playOneShot(clip);
    }

    loop(clip: AudioClip) {
        this.primary_audio.clip = clip;
        this.primary_audio.play();
    }

    end_loop() {
        this.primary_audio.stop();
    }
}