import { _decorator, Component, Node, Button } from 'cc';
import { play_sfx } from '../Audio_Manager';
import { $$ } from '../Const';
import { load_succeed_level, Main } from '../Main';
const { ccclass, property } = _decorator;

@ccclass('Game_Pause_Panel')
export class Game_Pause_Panel extends Component {
    @property(Button) btn_resume: Button = null;
    @property(Button) btn_exit: Button = null;
    @property(Button) btn_settings: Button = null;
    @property(Button) btn_quit: Button = null;

    start() {
        { // Resume Game
            this.btn_resume.node.on(Button.EventType.CLICK, () => {
                play_sfx("click");
                $$.IS_RUNNING = true;
                this.node.active = false;
            }, this);
        }

        { // Exit Current Room
            this.btn_exit.node.on(Button.EventType.CLICK, () => {
                play_sfx("click");
                this.node.active = false;
                load_succeed_level(Main.instance); // @Fixme Save if user already solved that puzzle...
            }, this);
        }
    }
}