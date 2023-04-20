import { _decorator, Component, tween, Node, Sprite, Color, UITransform, Vec3, Label, Tween, } from 'cc';
const { ccclass } = _decorator
    ;
// === UI_MECHANISMS API === 
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

export function type(target: Label, content: string, show_delay: number, duration: number, hide_delay: number): UI_Mechanism {
    const t = new Typer();
    t.label = target;
    t.content = content;
    t.show_delay = show_delay;
    t.hide_delay = hide_delay;
    t.duration = duration;
    return t;
}

export function show_blinds(blinds: Node, show_delay: number, duration: number): UI_Mechanism {
    const sb = new Show_Blinds();
    sb.blinds = blinds;
    sb.show_delay = show_delay;
    sb.duration = duration;
    return sb;
}

export function hide_blinds(blinds: Node, hide_delay: number, duration: number): UI_Mechanism {
    const hb = new Hide_Blinds();
    hb.blinds = blinds;
    hb.hide_delay = hide_delay;
    hb.duration = duration;
    return hb;
}

export function fade_in(item: Node, show_delay: number, duration: number): UI_Mechanism {
    const fi = new Fade_In();
    fi.sprite = item.getComponent(Sprite);
    fi.show_delay = show_delay;
    fi.duration = duration;
    return fi;
}

export function fade_out(item: Node, hide_delay: number, duration: number): UI_Mechanism {
    const fo = new Fade_Out();
    fo.sprite = item.getComponent(Sprite);
    fo.hide_delay = hide_delay;
    fo.duration = duration;
    return fo;
}

/// === PRIVATE === 
type typer_tween = { idx: number };
class Typer extends UI_Mechanism {
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

const default_ui_show_position = new Vec3();
class Show_Blinds extends UI_Mechanism {
    // @Note There're some dependency that, binds must be in the hide-pos before we do this...
    blinds: Node = null;
    post_begin(): void {
        this.blinds.active = true;
    }
    post_execute(): Tween<any> {
        const blinds = this.blinds;
        return tween(blinds)
            .delay(this.show_delay)
            .to(this.duration, { worldPosition: default_ui_show_position });
    }
}

class Hide_Blinds extends UI_Mechanism {
    // @Note There're some dependency that, binds must be in the show-pos before we do this...
    blinds: Node = null;
    post_begin(): void {
        default_ui_show_position.set(this.blinds.getWorldPosition());
    }
    post_end(): void {
        this.blinds.active = false;
    }
    post_execute(): Tween<any> {
        const blinds = this.blinds;
        const height = blinds.getComponent(UITransform).height;
        const hide_position = new Vec3(blinds.getWorldPosition());
        hide_position.y += height;

        return tween(blinds)
            .delay(this.hide_delay)
            .to(this.duration, { worldPosition: hide_position });
    }
}

class Fade_In extends UI_Mechanism {
    // @Note There're some dependency that, binds must be in the hide-pos before we do this...
    sprite: Sprite = null;
    show_color: Color = null;
    hide_color: Color = null;

    post_begin(): void {
        const sprite = this.sprite;
        this.show_color = new Color().set(sprite.color);
        const hide_color = this.hide_color = new Color().set(sprite.color);

        hide_color.a = 0;
        sprite.color.set(hide_color);
        sprite.node.active = true;
    }

    post_execute(): Tween<any> {
        const sprite = this.sprite;
        const show_color = this.show_color;

        return tween(sprite)
            .delay(this.show_delay)
            .to(this.duration, { color: show_color });
    }
}

class Fade_Out extends UI_Mechanism {
    // @Note There're some dependency that, binds must be in the hide-pos before we do this...
    sprite: Sprite = null;
    hide_color: Color = null;

    post_begin(): void {
        const sprite = this.sprite;
        const hide_color = this.hide_color = new Color().set(sprite.color);
        hide_color.a = 0;
    }

    post_end(): void {
        this.sprite.node.active = false;
    }

    post_execute(): Tween<any> {
        const sprite = this.sprite;
        const hide_color = this.hide_color;

        return tween(sprite)
            .delay(this.hide_delay)
            .to(this.duration, { color: hide_color });
    }
}

@ccclass('UI_Manager')
export class UI_Manager extends Component {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }
}