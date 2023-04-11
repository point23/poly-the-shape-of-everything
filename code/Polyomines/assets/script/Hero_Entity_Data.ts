import { _decorator, AnimationClip, Component, Node, SkeletalAnimation, } from 'cc';
import { $$, Const } from './Const';
const { ccclass, property } = _decorator;

export enum HERO_ANIM_STATE {
    NULL,
    NORMAL_IDLE,
    SAD_IDLE,
    VICTORY_IDLE,
    NORMAL_RUNNING,
    PUSHING,
}

@ccclass('Hero_Entity_Data')
export class Hero_Entity_Data extends Component {
    @property(SkeletalAnimation) animation: SkeletalAnimation = null;

    anim_state: HERO_ANIM_STATE = HERO_ANIM_STATE.NULL;

    normal_idle(duration = 1) {
        if (this.anim_state == HERO_ANIM_STATE.NORMAL_IDLE) return;

        this.animation.getState('Normal Idle').speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade('Normal Idle', 1);
        this.anim_state = HERO_ANIM_STATE.NORMAL_IDLE;
    }

    push() {
        if (this.anim_state == HERO_ANIM_STATE.PUSHING) return;

        this.animation.getState('Pushing').speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade('Pushing');
        this.anim_state = HERO_ANIM_STATE.PUSHING;
    }

    run() {
        if (this.anim_state == HERO_ANIM_STATE.NORMAL_RUNNING) return;
        if (this.anim_state == HERO_ANIM_STATE.PUSHING) return;

        this.animation.getState('Normal Running').speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade("Normal Running");
        this.anim_state = HERO_ANIM_STATE.NORMAL_RUNNING;
    }
}