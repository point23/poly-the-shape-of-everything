import { _decorator, Component, Node } from 'cc';
import { Navigator } from './Navigator';
const { ccclass, property } = _decorator;

@ccclass('Undo_Panel')
export class Undo_Panel extends Component {
    @property(Navigator) navigator: Navigator = null;

    num_changes: number = 0;

    reset() {
        this.num_changes = 0;
        this.show_changes();
    }

    note_changes(d: number) {
        this.num_changes += d;
        this.show_changes();
    }

    show_changes() {
        const i = this.num_changes;
        this.navigator.label_current.string = `${i} changes`;
    }
}


