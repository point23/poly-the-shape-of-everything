import { _decorator, Component, tween, Node, Sprite, Color, sp, UITransform, Vec2, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

export enum Show_Hide_Type {
    FADE,
    BLINDS,
}

type show_hide_info = {
    target: Node,
    show_delay: number,
    show_duration: number,
    hide_delay: number,
    hide_duration: number,
    type: Show_Hide_Type
}

@ccclass('UI_Manager')
export class UI_Manager extends Component {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }

    show_and_hide(info: show_hide_info) {
        switch (info.type) {
            case Show_Hide_Type.FADE: {
                const sprite = info.target.getComponent(Sprite);
                const show_color = new Color().set(sprite.color);
                const hide_color = new Color().set(sprite.color);
                hide_color.a = 0;
                sprite.color.set(hide_color);

                tween(sprite)
                    .delay(info.show_delay)
                    .to(info.show_duration, { color: show_color })
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { color: hide_color })
                    .start();
            } break;

            case Show_Hide_Type.BLINDS: {
                const height = info.target.getComponent(UITransform).height;
                const show_pos = new Vec3().set(info.target.getWorldPosition());
                const hide_pos = new Vec3(info.target.getWorldPosition());
                hide_pos.y += height;

                tween(info.target)
                    .delay(info.show_delay)
                    .to(info.show_duration, { worldPosition: show_pos })
                    .delay(info.hide_delay)
                    .to(info.hide_duration, { worldPosition: hide_pos })
                    .start();
            }
        }
    }
}