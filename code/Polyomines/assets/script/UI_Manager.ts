import { _decorator, Component, tween, Node, Sprite, Color, sp, UITransform, Vec2, Vec3, Label, Tween, } from 'cc';
const { ccclass } = _decorator;

export abstract class UI_Mechanism {
    show_delay: number = 0;
    duration: number;
    hide_delay: number = 0;
    successor: UI_Mechanism = null;
    tween: Tween<any> = null;

    execute(): void {
        this.#begin();
        const t = this.tween = this.post_execute();

        if (t) {
            t.call(() => {
                this.#end();
                this.successor?.execute();
            });

            t.start();
        }
    }

    suspend() {
        // @ImplementMe !!! 
    }

    terminate() {
        this.tween.stop();
    }

    #begin() {
        this.post_begin();
        this.on_start();
    }
    #end() {
        this.post_end();
        this.on_complete();
    }

    // Type specific methods
    post_begin(): void { }
    post_end(): void { }
    post_execute(): Tween<any> {
        return null;
    }

    on_start(): void { }
    on_complete(): void { }
}

type typer_tween = { idx: number };
export class Typer extends UI_Mechanism {
    label: Label = null;
    content: string = "";
    should_hide: boolean = true;

    post_begin(): void {
        this.label.node.active = true;
    }
    post_end(): void {
        const should_hide = this.should_hide;
        const label = this.label;

        if (should_hide) {
            label.string = "";
            label.node.active = false;
        } else {
            label.string = label.string.substring(0, label.string.length - 1);
        }
    }

    post_execute(): Tween<any> {
        const label = this.label;
        const duration = this.duration;
        const show_delay = this.show_delay;
        this.should_hide = this.hide_delay != Infinity;
        const hide_delay = this.should_hide ? this.hide_delay : 0;
        const content = this.content;

        const i = { idx: 0 };
        return tween(i)
            .delay(show_delay)
            .to(duration,
                {
                    idx: content.length,
                },
                {
                    onUpdate(t: typer_tween) {
                        label.string = content.substring(0, t.idx) + '|';
                    }
                })
            .delay(hide_delay);
    }
}

export enum Show_Hide_Type {
    FADE,
    BLINDS,
}

type show_info = {
    target: Node,
    show_delay: number,
    show_duration: number,
    type: Show_Hide_Type,
    callback: () => void,
}

type hide_info = {
    target: Node,
    hide_delay: number,
    hide_duration: number,
    type: Show_Hide_Type,
    callback: () => void,
}

type show_hide_info = {
    target: Node,
    show_delay: number,
    show_duration: number,
    hide_delay: number,
    hide_duration: number,
    type: Show_Hide_Type,
    callback: () => void,
}

type typer_info = {
    label: Label,
    content: string,
    show_delay: number
    duration: number,
    hide_delay: number,
    callback: () => void,
}

// === UI_MECHANISMS API === 
export function type(target: Label, content: string, show_delay: number, duration: number, hide_delay: number): UI_Mechanism {
    const t = new Typer();
    t.label = target;
    t.content = content;
    t.show_delay = show_delay;
    t.hide_delay = hide_delay;
    t.duration = duration;
    return t;
}

@ccclass('UI_Manager')
export class UI_Manager extends Component {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }

    typer(info: typer_info) {
        const label = info.label;
        label.node.active = true;

        type bind_target = { idx: number };
        let i = { idx: 0 };

        const should_hide = Number.isFinite(info.hide_delay);
        if (!should_hide) info.hide_delay = 0;

        tween(i)
            .delay(info.show_delay)
            .to(info.duration,
                {
                    idx: info.content.length,
                },
                {
                    onUpdate(t: bind_target) {
                        label.string = info.content.substring(0, t.idx) + '|';
                    }
                })
            .delay(info.hide_delay)
            .call(() => {
                if (should_hide) label.string = '';
                else {
                    label.string = label.string.substring(0, label.string.length - 1);
                }
                info.callback();
            })
            .start();
    }

    show(info: show_info) {
        const target = info.target;
        target.active = false;

        switch (info.type) {
            case Show_Hide_Type.FADE: {
                info.target.active = true;
                // @Note Here we had asume that it's initial colored.
                const sprite = info.target.getComponent(Sprite);
                const show_color = new Color().set(sprite.color);
                const hide_color = new Color().set(sprite.color);
                hide_color.a = 0;
                sprite.color.set(hide_color);

                tween(sprite)
                    .delay(info.show_delay)
                    .to(info.show_duration, { color: show_color })
                    .call(() => {
                        info.callback();
                    })
                    .start();
            } break;

            case Show_Hide_Type.BLINDS: {
                info.target.active = true;

                const height = info.target.getComponent(UITransform).height;
                const show_pos = new Vec3().set(info.target.getWorldPosition());
                const hide_pos = new Vec3(info.target.getWorldPosition());
                hide_pos.y += height;
                info.target.setWorldPosition(hide_pos);

                if (info.show_delay || info.show_duration)
                    info.target.setWorldPosition(hide_pos);

                tween(info.target)
                    .delay(info.show_delay)
                    .to(info.show_duration, { worldPosition: show_pos })
                    .call(() => {
                        info.callback();
                    })
                    .start();
            }
        }
    }

    hide(info: hide_info) {
        const target = info.target;
        target.active = false;

        switch (info.type) {
            case Show_Hide_Type.FADE: {
                info.target.active = true;

                const sprite = info.target.getComponent(Sprite);
                const show_color = new Color().set(sprite.color);
                const hide_color = new Color().set(sprite.color);
                hide_color.a = 0;

                tween(sprite)
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { color: hide_color })
                    .call(() => {
                        info.target.active = false;
                        sprite.color.set(show_color);
                        info.callback();
                    })
                    .start();
            } break;

            case Show_Hide_Type.BLINDS: {
                info.target.active = true;

                const height = info.target.getComponent(UITransform).height;
                const show_pos = new Vec3().set(info.target.getWorldPosition());
                const hide_pos = new Vec3(info.target.getWorldPosition());
                hide_pos.y += height;

                tween(info.target)
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { worldPosition: hide_pos })
                    .call(() => {
                        info.target.active = false;
                        info.target.setWorldPosition(show_pos);
                        info.callback();
                    })
                    .start();
            }
        }
    }


    show_and_hide(info: show_hide_info) {
        const target = info.target;
        target.active = false;

        const should_hide = Number.isFinite(info.hide_delay); // @Note Handling those weird special cases
        if (!should_hide) info.hide_delay = 0;

        switch (info.type) {
            case Show_Hide_Type.FADE: {
                info.target.active = true;

                const sprite = info.target.getComponent(Sprite);
                const show_color = new Color().set(sprite.color);
                const hide_color = new Color().set(sprite.color);
                if (should_hide) { hide_color.a = 0; }
                sprite.color.set(hide_color);

                tween(sprite)
                    .delay(info.show_delay)
                    .to(info.show_duration, { color: show_color })
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { color: hide_color })
                    .call(() => {
                        if (should_hide) {
                            info.target.active = false;
                            sprite.color.set(show_color);
                        }
                        info.callback();
                    })
                    .start();
            } break;

            case Show_Hide_Type.BLINDS: {
                info.target.active = true;

                const height = info.target.getComponent(UITransform).height;
                const show_pos = new Vec3().set(info.target.getWorldPosition());
                const hide_pos = new Vec3(info.target.getWorldPosition());
                if (should_hide) { hide_pos.y += height; }
                if (info.show_delay || info.show_duration)
                    info.target.setWorldPosition(hide_pos);

                tween(info.target)
                    .delay(info.show_delay)
                    .to(info.show_duration, { worldPosition: show_pos })
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { worldPosition: hide_pos })
                    .call(() => {
                        if (should_hide) {
                            info.target.active = false;
                            info.target.setWorldPosition(show_pos);
                        }
                        info.callback();
                    })
                    .start();
            }
        }
    }
}