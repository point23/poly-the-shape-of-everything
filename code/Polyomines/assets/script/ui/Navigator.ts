import { _decorator, Component, Node, Label, Button } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Navigator')
export class Navigator extends Component {
    @property(Label) label!: Label;
    @property(Label) label_current!: Label;

    @property(Button) btn_label!: Button;
    @property(Button) btn_prev!: Button;
    @property(Button) btn_current!: Button;
    @property(Button) btn_next!: Button;
}