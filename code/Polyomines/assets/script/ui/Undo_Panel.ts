import { _decorator, Component, Node } from 'cc';
import { Navigator } from './Navigator';
const { ccclass, property } = _decorator;

@ccclass('Undo_Panel')
export class Undo_Panel extends Component {
    @property(Navigator) navigator: Navigator = null;

    show_changes(num: number) {
        this.navigator.label_current.string = `${num} changes`;
    }
}


