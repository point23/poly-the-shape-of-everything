import { _decorator, Component, Node, Toggle, Layout, instantiate, Label, EventHandler } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Rating')
export class Rating extends Component {
    @property(Label) label: Label = null;
    @property(Toggle) star_0: Toggle = null;
    @property(Layout) layout: Layout = null;
    @property({ slide: true, type: Number, min: 1, max: 8, step: 1 }) max: number = 1;

    val: number = 0;
    stars: Toggle[] = [];

    on_rated: EventHandler[] = [];

    onLoad() {
        this.stars.push(this.star_0);
        for (let i = 1; i < this.max; i++) {
            const node = instantiate(this.star_0.node);
            this.stars.push(node.getComponent(Toggle));
            node.setParent(this.layout.node);
        }

        for (let i = 0; i < this.max; i++) {
            const e = new Rating.EventHandler();
            e.target = this.node;
            e.component = "Rating";
            e.handler = 'on_rate';
            e.customEventData = String(i + 1);
            this.stars[i].clickEvents.push(e);
        }
        this.layout.updateLayout();
    }

    set_rating(v: number, clicked: boolean = false) {
        this.val = v;

        for (let i = 0; i < this.max; i++) {
            this.stars[i].isChecked = (i + (clicked ? 1 : 0) < v);
        }

        this.on_rated.forEach((it) => { it.emit([v]); });
    }

    on_rate(event: Event, v: any) {
        v = Number(v);
        this.set_rating(v, true);
    }
}