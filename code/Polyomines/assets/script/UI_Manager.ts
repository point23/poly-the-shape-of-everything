import { _decorator, Button, RichText, Component } from 'cc';
import { Button_Group } from './ui/Button_Group';
import { Navigator } from './ui/Navigator';
import { Rating } from './ui/Rating';
import { Transaction_Panel } from './ui/Transaction_Panel';
const { ccclass, property } = _decorator;

@ccclass('UI_Manager')
export class UI_Manager extends Component {
    public static instance: UI_Manager = null;
    public static Settle(instance: UI_Manager) {
        UI_Manager.instance = instance;
    }

    @property(RichText) txt_info: RichText = null;
    @property(Transaction_Panel) transaction_panel: Transaction_Panel = null;

    @property(Navigator) undos: Navigator = null;
    @property(Navigator) levels: Navigator = null;

    @property(Navigator) durations: Navigator = null;

    @property(Rating) difficulty: Rating = null;

    @property(Button) btn_save: Button = null;
    @property(Button) btn_download: Button = null;

    @property(Button_Group) modes: Button_Group = null;

    show_undo_changes(num: number) {
        this.undos.label_current.string = `${num} changes`;
    }

    info(s: string) {
        this.txt_info.string = s;
        this.scheduleOnce(() => {
            this.txt_info.string = "";
        }, 1);
    }
}