import { Color, Quat, Size, Vec3 } from 'cc';

/** Global Flags */
export class $ {
    static S_doing_undo = Symbol("doing_undo");
    static S_next_undo_record_is_checkpoint = Symbol("next_undo_record_is_checkpoint");

    static [s: symbol]: boolean;
    static get doing_undo(): boolean { return $[$.S_doing_undo]; }
    static get next_undo_record_is_checkpoint(): boolean { return $[$.S_doing_undo]; }

    static {
        $[$.S_doing_undo] = true;
        $[$.S_next_undo_record_is_checkpoint] = false;
    }

    static take(s: symbol): boolean {
        let r = $[s];
        $[s] = false;
        return r;
    }

    static flip(s: symbol) {
        let r = $[s];
        $[s] = !r;
    }
}

export class String_Builder {
    constructor(private strings: string[] = []) { }
    append(v: any): String_Builder {
        this.strings.push(`${v}`);
        return this;
    }

    get size(): number { return this.strings.length };

    get_cursor(): number {
        return this.strings.length;
    }

    set(i: number, v: any) {
        if (i >= this.strings.length) return;
        this.strings[i] = `${v}`;
    }

    to_string(s: string = ''): string {
        return this.strings.join(s);
    }
}

export class Stack<T> {
    private storage: T[] = []; // @todo Refactor this into sth like memory impl by Uint32Array...

    constructor(private capacity: number = Infinity) { }

    get(i: number): T {
        return this.storage[i];
    }

    empty(): boolean {
        return this.size() == 0;
    }

    size(): number {
        return this.storage.length;
    }

    push(item: T) {
        if (this.size() === this.capacity) {
            throw Error('Reached max capacity');
        }
        this.storage.push(item);
    }

    pop(): T {
        return this.storage.pop();
    }

    peek(): T {
        return this.storage[this.size() - 1];
    }

    clear() {
        this.storage = [];
    }
}


export function compare_all_slots(a: any, b: any): boolean {
    // @tested
    for (let k of Reflect.ownKeys(a)) {
        const a_v = Reflect.get(a, k);
        const b_v = Reflect.get(b, k);

        if (a_v instanceof Object) {
            let res = compare_all_slots(a_v, b_v);
            if (!res) return false;
        } else {
            // Literial
            let res = (a_v == b_v);
            if (!res) return false;
        }
    }
    return true;
}

export function clone_all_slots(s: any, d: any) {
    // @tested
    for (let k of Reflect.ownKeys(s)) {
        let s_v = Reflect.get(s, k);
        if (s_v instanceof Object) {
            let d_v = Object.create(s_v);
            clone_all_slots(s_v, d_v);
            Reflect.set(d, k, d_v);
        } else { // Literial
            Reflect.set(d, k, s_v);
        }
    }
}

export class Const {
    /** @fixme Don't use absolute path... */
    static Data_Path: string = 'data';
    static Default_Level: string = 'level#001';

    static Default_Game_Board_Size: Size = new Size(10, 10);

    static Tick_Interval: number = 0.0125;
    static Ticks_Per_Loop: Map<number, number> = new Map<number, number>([
        [8, 1],
        [4, 2],
        [2, 4],
        [1, 8],
        [-1, 16],
        [-2, 32],
        [-4, 64],
        [-8, 128],
    ]);

    static Game_Board_Square_Size = 1;
    static Game_Board_Half_Square_Size = 0.5;
    static Game_Board_Orgin_Pos = new Vec3(0, 0, 0);

    static Mouse_Jiggling_Interval = 0.01;
    static Double_Click_Time_Interval = 0.25;

    static Cover_Selected_Color = new Color(0, 255, 0, 64);
    static Cover_Invalid_Color = new Color(255, 0, 0, 64);
    static Cover_Normal_Color = new Color(255, 255, 255, 0);

    static RADIUS_45: number = 0.25 * Math.PI;
    static RADIUS_90: number = 0.5 * Math.PI;
    static RADIUS_135: number = 0.75 * Math.PI;
    static RADIUS_180: number = Math.PI;
    static RADIUS_225: number = 1.25 * Math.PI;
    static RADIUS_270: number = 1.5 * Math.PI;
    static RADIUS_315: number = 1.75 * Math.PI;

    static Direction2Quat: Quat[] = [
    /* RIGHT */ new Quat(0, 0, 0, Math.cos(0)),
        /* FORWARD */
        new Quat(0, Math.sin(-this.RADIUS_45), 0, Math.cos(-this.RADIUS_45)),
        /* LEFT */
        new Quat(0, Math.sin(this.RADIUS_90), 0, Math.cos(this.RADIUS_90)),
        /* BACKWARD */
        new Quat(0, Math.sin(this.RADIUS_45), 0, Math.cos(this.RADIUS_45)),
    /* UP */ new Quat(0, 0, 0, 1),
    /* DOWN */ new Quat(0, 0, 0, 1),
    ];

    static Direction_Names: string[] = ['RIGHT', 'FORWARD', 'LEFT', 'BACKWARD', 'UP', 'DOWN'];
}