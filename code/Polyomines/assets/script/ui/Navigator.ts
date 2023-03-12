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

    start() {
        this.btn_prev.node.on(Button.EventType.CLICK, this.navigate_to_prev, this);
        this.btn_next.node.on(Button.EventType.CLICK, this.navigate_to_next, this);
        this.btn_current.node.on(Button.EventType.CLICK, this.show_current, this);
    }

    show_current(button: Button) {
        this.label_current.string = "current";
    }

    navigate_to_prev(button: Button) {
        this.label_current.string = "prev";
    }

    navigate_to_next(button: Button) {
        this.label_current.string = "next";
    }
}


