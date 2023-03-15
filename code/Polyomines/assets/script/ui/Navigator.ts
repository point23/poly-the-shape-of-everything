import { _decorator, Component, Node, Label, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Navigator')
export class Navigator extends Component {
    @property(Label) label: Label = null;
    @property(Label) label_current: Label = null;

    @property(Button) btn_label: Button = null;
    @property(Button) btn_prev: Button = null;
    @property(Button) btn_current: Button = null;
    @property(Button) btn_next: Button = null;

    clear() {
        this.btn_label.clickEvents = [];
        this.btn_prev.clickEvents = [];
        this.btn_current.clickEvents = [];
        this.btn_next.clickEvents = [];
    }
}