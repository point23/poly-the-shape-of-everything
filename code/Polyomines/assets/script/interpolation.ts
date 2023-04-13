import { _decorator, Vec3 } from 'cc';
import { Game_Entity } from './Game_Entity';
import { gameplay_time, Gameplay_Timer } from './Gameplay_Timer';

// type interpolation_phase = {
//     end_at: number, // @note Ratio

//     start_point: Vec3;
//     end_point: Vec3;

//     on_complete: (() => void),
// };

export class Visual_Interpolation {
    static running_interpolations: Visual_Interpolation[] = [];

    ratio: number;

    entity: Game_Entity;

    start_at: gameplay_time = null;
    end_at: gameplay_time = null;

    start_point: Vec3 = null;
    end_point: Vec3 = null;

    // phases: interpolation_phase[];

    constructor(entity: Game_Entity, start_at: gameplay_time, end_at: gameplay_time, start_point: Vec3, end_point: Vec3) {
        this.entity = entity;

        this.start_at = start_at;
        this.end_at = end_at;

        this.start_point = start_point;
        this.end_point = end_point;

        Visual_Interpolation.running_interpolations.push(this);
    }

    process() {
        const duration = Gameplay_Timer.calcu_delta_ticks(this.start_at, this.end_at); // @optimize
        const passed = Gameplay_Timer.calcu_delta_ticks(this.start_at);                // @optimize
        const ratio = passed / duration;
        this.ratio = ratio;
        console.log("+========+");
        console.log(this.ratio);
        console.log(passed);
        console.log(Gameplay_Timer.compare(Gameplay_Timer.get_gameplay_time(), this.end_at));

        const temp = new Vec3(); // @optimize
        const entity = this.entity;

        Vec3.lerp(temp, this.start_point, this.end_point, ratio);
        entity.visually_move_to(temp);
        entity.interpolation.ratio = ratio;

        if (this.ratio == 1 || 0 == Gameplay_Timer.compare(Gameplay_Timer.get_gameplay_time(), this.end_at)) {
            const idx = Visual_Interpolation.running_interpolations.indexOf(this);
            Visual_Interpolation.running_interpolations.splice(idx, 1);
            this.on_complete();
        }
    }

    on_complete() { }
}
