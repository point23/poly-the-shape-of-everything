import { _decorator, Vec3 } from 'cc';
import { same_position, String_Builder } from './Const';
import { calcu_entity_future_position, clacu_reversed_direction, collinear_direction, Direction, Entity_Type, Game_Entity, locate_entities_in_target_direction, same_direction } from './Game_Entity';
import { Move_Transaction } from './Move_Transaction';
import { move_supportees, log_target_entity, may_log_move, may_log_rotate, may_move_entity, Move_Flags, Move_Info, Pushed_Move, set_dirty, Single_Move, Support_Move, try_push_others } from './Single_Move';
import { Transaction_Manager } from './Transaction_Manager';

export class Rover_Move extends Single_Move {
    public constructor(entity: Game_Entity) {
        const move_info = new Move_Info();
        move_info.target_entity_id = entity.id;
        move_info.start_direction = move_info.end_direction = entity.orientation;
        move_info.start_position = move_info.end_position = entity.position;
        super(move_info);
    }

    try_add_itself(transaction: Move_Transaction): boolean {
        function locate_track_ahead(r: Game_Entity, d: Direction): Game_Entity {
            const supporters = manager.locate_future_supporters(r, d);
            for (let supporter of supporters) {
                if (supporter.entity_type == Entity_Type.TRACK) {
                    return supporter;
                }
            }
            return null;
        }
        //#SCOPE

        const manager = transaction.entity_manager;
        const rover = manager.find(this.info.target_entity_id);

        let direction = rover.orientation;
        let turned_around: boolean = false;
        let stucked: boolean = false;

        let track = locate_track_ahead(rover, direction);
        if (track == null) { // There's no way ahead, we need to turn around
            turned_around = true;
        } else {
            if (collinear_direction(track.rotation, rover.orientation)) {
                const push_res = try_push_others(transaction, rover, direction);
                turned_around = push_res.pushed && !push_res.push_succeed;
            } else {
                // @implementMe Turning is a problem for now, we don't even have a suitable model...
            }
        }

        if (turned_around) {
            direction = clacu_reversed_direction(rover.orientation);
            let track = locate_track_ahead(rover, direction);

            if (track == null) {
                stucked = true;
            } else {
                if (collinear_direction(track.rotation, rover.orientation)) {
                    const push_res = try_push_others(transaction, rover, direction);
                    stucked = push_res.pushed && !push_res.push_succeed;
                } else {
                    // @implementMe Turning is a problem for now, we don't even have a suitable model...
                }
            }
        }

        if (!stucked) {
            this.info.end_direction = direction;
            this.info.end_position = calcu_entity_future_position(rover, this.end_direction);
            const position_delta = new Vec3(this.end_position).subtract(this.start_position);
            move_supportees(transaction, rover, position_delta, 0);
        }

        if (!same_position(this.start_position, this.end_position))
            set_dirty(this, Move_Flags.MOVED);
        if (this.start_direction != this.end_direction)
            set_dirty(this, Move_Flags.ROTATED);

        transaction.moves.push(this);
        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        may_move_entity(this, manager, entity);
        if (this.flags & Move_Flags.ROTATED) {
            entity.undoable.orientation = this.end_direction; // @implementMe Extract it to entity manager
            entity.logically_rotate_to(this.end_direction);
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('ROVER#').append(this.id);
        log_target_entity(builder, this);
        may_log_rotate(builder, this);
        may_log_move(builder, this);
        return builder.to_string();
    }
}

export function generate_rover_moves(transaction_manager: Transaction_Manager) {
    const entity_manager = transaction_manager.entity_manager;
    if (!entity_manager.switch_turned_on) return;

    for (let rover of entity_manager.rovers) {
        const rover_move = new Rover_Move(rover);
        transaction_manager.try_add_new_move(rover_move);
    }
}