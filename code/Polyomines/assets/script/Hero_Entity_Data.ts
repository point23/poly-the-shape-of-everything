import { _decorator, AnimationClip, Component, Node, SkeletalAnimation, } from 'cc';
import { $$, Const } from './Const';
const { ccclass, property } = _decorator;

export enum HERO_ANIM_STATE {
    NULL,
    ACTIVE,
    INACTIVE,
    VICTORY,
    RUN,
    DEAD,
    PUSH,
    PULL,
    LANDING,
}

@ccclass('Hero_Entity_Data')
export class Hero_Entity_Data extends Component {
    @property(SkeletalAnimation) animation: SkeletalAnimation = null;

    anim_state: HERO_ANIM_STATE = HERO_ANIM_STATE.NULL;

    active_anims = ['Active-Left', 'Active-Right'];
    active_anim_idx = 0;

    active(duration: number = 0) {
        if (this.anim_state == HERO_ANIM_STATE.ACTIVE) return;
        // if (this.anim_state == HERO_ANIM_STATE.LANDING) return;

        const anim = this.active_anims[this.active_anim_idx];
        this.active_anim_idx = 1 - this.active_anim_idx;

        this.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade(anim, duration);
        this.anim_state = HERO_ANIM_STATE.ACTIVE;
    }

    inactive() {
        if (this.anim_state == HERO_ANIM_STATE.INACTIVE) return;

        const anim = 'Inactive';
        this.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade(anim);
        this.anim_state = HERO_ANIM_STATE.INACTIVE;
    }

    push() {
        if (this.anim_state == HERO_ANIM_STATE.PUSH) return;

        const anim = 'Push';
        this.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade(anim);
        this.anim_state = HERO_ANIM_STATE.PUSH;
    }

    run(hard: boolean = false) {
        if (this.anim_state == HERO_ANIM_STATE.RUN) return;
        if (!hard && this.anim_state == HERO_ANIM_STATE.PUSH) return;

        const anim = 'Run';
        this.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade(anim);
        this.anim_state = HERO_ANIM_STATE.RUN;
    }

    landing() {
        if (this.anim_state == HERO_ANIM_STATE.LANDING) return;

        const anim = 'Landing';
        this.animation.getState(anim).speed = Const.ANIM_SPEED[$$.DURATION_IDX];
        this.animation.crossFade(anim);
        this.anim_state = HERO_ANIM_STATE.LANDING;
    }
}