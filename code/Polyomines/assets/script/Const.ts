import { Color, KeyCode, Quat, Size, Vec3 } from 'cc';
import { Keyboard_Command_Button } from './input/Game_Input_Handler';
import { keymap } from './input/Input_Manager';

export enum Direction {
    LEFT,
    RIGHT,
    FORWARD,
    BACKWORD,
    UP,
    DOWN,
}

/** Global Flags */
export class $$ {
    static FOR_EDITING: boolean;
    static HINTS_EDITABLE: boolean;

    static IS_RUNNING: boolean = false;
    static DOING_UNDO: boolean;
    static RELOADING: boolean;
    static STARTUP: boolean;

    static SWITCH_TURNED_ON: boolean;
    static SHOWING_HINTS: boolean;

    static HERO_VISUALLY_MOVING = false; // @deprecated

    static DOING_USER_MOVE: boolean = false;

    static DURATION_IDX: number = 0;

    // @todo Remove it...
    static {
        $$.STARTUP = true;

        $$.RELOADING = false;
        $$.IS_RUNNING = false;
        $$.DOING_UNDO = false;
        $$.FOR_EDITING = false;
        $$.HINTS_EDITABLE = false;
        $$.SWITCH_TURNED_ON = false;
        $$.SHOWING_HINTS = false;
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

    clear() {
        this.strings = [];
    }

    get(i: number) {
        if (i >= this.size) return null;
        return this.strings[i];
    }

    set(i: number, v: any) {
        if (i >= this.size) return;
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

export function random(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1) + min)
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

export function same_position(a: Vec3, b: Vec3): boolean {
    return compare_all_slots(a, b);
}

export class Const {
    static LEFT = 0;
    static RIGHT = 0;
    static FORWARD = 0;
    static BACKWARD = 0;

    static DATA_PATH: string = 'data';

    static SPEED_ROVER_FREQ: number = 6;
    static SLOW_ROVER_FREQ: number = 18;

    static DEBUG_TICK_INTERVAL: number = 0.008; // @note On PC, we can run at 160 fps, so we just run as fast as we can.

    static TICKS_PER_ROUND: number[] = [
        1 << 0,
        1 << 1,
        1 << 2,
        1 << 3,
        1 << 4,
        1 << 5,
        1 << 6,
        1 << 7,
    ]

    static DEFAULT_DURATION_IDX: number = 3;
    static MAX_DURATION_IDX: number = 7;
    static DURATION_NAMES: string[] = [
        '8',
        '4',
        '2',
        '1',
        '-1',
        '-2',
        '-4',
        '-8',
    ];

    static ANIM_SPEED: number[] = [
        8,
        4,
        2,
        1,
        0.5,
        0.25,
        0.125,
        0.0625,
    ];

    static Default_Game_Board_Size: Size = new Size(10, 10);
    static Game_Board_Square_Size = 1;
    static Game_Board_Half_Square_Size = 0.5;
    static GAME_BOARD_ORIGIN = new Vec3(0, 0, 0);

    static SUPPORTEE_PIORITY_DOWNGRADE_FACTOR = 0.9;

    static JOYSTICK_DEADZONE = 0.05;

    static VALID_PRESSING_INTERVAL = 3; // For now there're some zigzag when it's not n times tick-interval(ms)

    static SWITCH_HERO_DURATION = 0.5;
    static HINTS_DURATION = 3;
    static HINTS_SHOW_COLOR = new Color(247, 53, 153, 139);
    static HINTS_HIDE_COLOR = new Color(0, 0, 0, 0);

    static Mouse_Jiggling_Interval = 0.01;
    static Double_Click_Time_Interval = 0.25;

    static ACTION_BUTTON_PRESSED_SCALE = new Vec3(0.5, 0.5, 1);
    static DPAD_PRESSED_SCALE = new Vec3(0.5, 0.5, 1);

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

    static DIRECTION2QUAT: Quat[] = [
        /* LEFT */ new Quat(0, Math.sin(this.RADIUS_90), 0, Math.cos(this.RADIUS_90)),
        /* RIGHT */ new Quat(0, 0, 0, Math.cos(0)),
        /* FORWARD */ new Quat(0, Math.sin(-this.RADIUS_45), 0, Math.cos(-this.RADIUS_45)),
        /* BACKWARD */ new Quat(0, Math.sin(this.RADIUS_45), 0, Math.cos(this.RADIUS_45)),
        /* UP */ new Quat(0, 0, 0, 1),
        /* DOWN */ new Quat(0, 0, 0, 1),
    ];

    static DIRECTION_NAMES: string[] = ['LEFT', 'RIGHT', 'FORWARD', 'BACKWARD', 'UP', 'DOWN'];

    static DEFAULT_KEYMAP: keymap = {
        // Action Buttons
        undo: [KeyCode.KEY_Z],
        reset: [KeyCode.KEY_R],
        switch: [KeyCode.TAB],

        // Movement Buttons
        backward: [KeyCode.ARROW_UP, KeyCode.KEY_W],
        forward: [KeyCode.ARROW_DOWN, KeyCode.KEY_S],
        left: [KeyCode.ARROW_LEFT, KeyCode.KEY_A],
        right: [KeyCode.ARROW_RIGHT, KeyCode.KEY_D],

        // Command Buttons
        command_rotate: Keyboard_Command_Button.SHIFT,
    }
}