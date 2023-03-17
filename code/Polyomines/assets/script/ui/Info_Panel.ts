import { _decorator, Component, Node, RichText } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Info_Panel')
export class Info_Panel extends Component {
    @property(RichText) text: RichText = null;

    show(info: string) {
        this.text.string = info;
        this.scheduleOnce(() => {
            this.text.string = "";
        }, 10);
    }
}


