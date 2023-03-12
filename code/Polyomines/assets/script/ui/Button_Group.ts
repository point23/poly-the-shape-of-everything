import { _decorator, Component, Node, Button, EventHandler } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Button_Group')
export class Button_Group extends Component {
    @property([Button]) btns: Button[] = [];
    events: EventHandler[] = [];

    onLoad() {
        this.btns.forEach((it, it_idx) => {
            const e = new EventHandler();
            e.target = this.node;
            e.component = "Button_Group";
            e.handler = 'on_btn_click';
            e.customEventData = `${it_idx}`;
            it.clickEvents.push(e);
        });
    }

    on_btn_click(event: Event, idx: string) {
        this.events.forEach((it) => {
            it.customEventData = idx;
            it.emit([idx]);
        });
    }
}