import { _decorator, Component, Node, Button, EventHandler } from 'cc';
import { Entity_Edit_Mode } from '../modes/Entity_Edit_Mode';
const { ccclass, property } = _decorator;

@ccclass('Entity_Edit_Panel')
export class Entity_Edit_Panel extends Component {
    @property(Button) btn_save: Button;
    mode: Entity_Edit_Mode;

    start() {
        this.btn_save.node.on(Button.EventType.CLICK, this.on_save, this);
        this.btn_save.node.active = false;
    }

    on_save(btn: Button) {
        this.mode.save_level();
    }

    show() {
        this.btn_save.node.active = true;
    }

    hide() {
        this.btn_save.node.active = false;
    }
}


