import { _decorator, Component, Node, Button, EventHandler } from 'cc';
import { Contextual_Manager } from '../Contextual_Manager';
import { Entity_Edit_Mode } from '../modes/Entity_Edit_Mode';
import { Resource_Manager } from '../Resource_Manager';
import { Button_Group } from './Button_Group';
import { Navigator } from './Navigator';
const { ccclass, property } = _decorator;

@ccclass('Level_Editor_Panel')
export class Level_Editor_Panel extends Component {
    @property(Navigator) levels: Navigator = null;
    @property(Button) btn_save: Button = null;
    @property(Button_Group) modes: Button_Group = null;

    start() {
        { // Save Config
            this.btn_save.node.on(Button.EventType.CLICK, () => {
                Contextual_Manager.instance.save_level();
                Resource_Manager.instance.download_config();
            }, this);
        }

        { // Switch Modes
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Level_Editor_Panel";
            e.handler = 'on_switch_mode';
            this.modes.events.push(e);
        }
    }

    on_switch_mode(event: Event, idx: string) {
        const i = Number(idx);
        Contextual_Manager.instance.switch_mode(i);
    }
}