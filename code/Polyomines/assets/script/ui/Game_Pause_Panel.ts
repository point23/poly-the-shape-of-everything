import { _decorator, Component, Node, Button } from 'cc';
import { play_sfx } from '../Audio_Manager';
import { $$ } from '../Const';
import { load_succeed_level, Main } from '../Main';
import { show_blinds } from '../UI_Manager';
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
                const game = Main.instance;
                this.node.active = false;
                const sb = show_blinds(game.dim, 1, 1);
                sb.on_complete = () => {
                    load_succeed_level(game);
                };
                sb.execute();
            }, this);
        }
    }
}