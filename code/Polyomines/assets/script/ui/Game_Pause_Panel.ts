import { _decorator, Component, Node, Button } from 'cc';
import { Audio_Manager } from '../Audio_Manager';
import { $$ } from '../Const';
const { ccclass, property } = _decorator;

@ccclass('Game_Pause_Panel')
export class Game_Pause_Panel extends Component {
    @property(Button) btn_resume: Button = null;
    @property(Button) btn_exit: Button = null;
    @property(Button) btn_options: Button = null;
    @property(Button) btn_quit: Button = null;

    start() {
        { // Resume Game
            this.btn_resume.node.on(Button.EventType.CLICK, () => {
                Audio_Manager.instance.play(Audio_Manager.instance.click);
                $$.IS_RUNNING = true;
                this.node.active = false;
            }, this);
        }
    }

    exit() {

    }

    options() {

    }

    quit() {

    }
}


