import { _decorator, Component, Node, CCString, Prefab, AudioClip } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Prefab_Pair')
export class Prefab_Pair {
    @property(CCString) id = '';
    @property(Prefab) prefab = null;
};

@ccclass('Audio_Clip_Pair')
export class Auido_Clip_Pair {
    @property(CCString) name: string = '';
    @property(AudioClip) clip = null;
};

@ccclass('Audio_Clip_Group_Pair')
export class Audio_Clip_Group_Pair {
    @property(CCString) name: string = '';
    @property([AudioClip]) clips = [];

    last_played_idx: Number = 0;
};