import { Color, Game, Quat, Size, Vec3 } from 'cc';
import { Game_Entity } from './Game_Entity';
import { Single_Move } from './Single_Move';

export class String_Builder {
    strings: string[];
    constructor() {
        this.strings = [];
    }
    append(v: any): String_Builder {
        this.strings.push(`${v}`);
        return this;
    }
    to_string(): string {
        return this.strings.join('');
    }
}

export function compare_pid(a: Pid, b: Pid): boolean {
    return a.val == b.val;
}

export class Pid {
    static entity = Symbol('entity');
    static single_move = Symbol('single move');

    static digit_0: Map<symbol, number> = new Map<symbol, number>([
        [Pid.entity, 0],
        [Pid.single_move, 0],
    ]);
    static digit_1: Map<symbol, number> = new Map<symbol, number>([
        [Pid.entity, 1],
        [Pid.single_move, 2],
    ]); val: string;

    //@incomplete Support other types like Single_Move, Move_Transaction... 
    constructor(t: any) {
        let s: symbol;
        if (t instanceof Game_Entity) {
            s = Pid.entity;
        } else if (t instanceof Single_Move) {
            s = Pid.single_move;
        }

        let d_0: number = Pid.digit_0.get(s), d_1: number = Pid.digit_1.get(s);
        let builder = new String_Builder();
        builder.append(d_1).append('-').append(d_0);
        this.val = builder.to_string();
        Pid.digit_0.set(s, d_0 + 1);
    }
}

export class Const {
    /** FIXME Don't use absolute path... */
    static Data_Path: string =
        'A:/code/poly/code/Polyomines/assets/resources/data';
    static Default_Level: string = 'level#001';

    static Default_Game_Board_Size: Size = new Size(10, 10);

    static Tick_Interval: number = 0.1;
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