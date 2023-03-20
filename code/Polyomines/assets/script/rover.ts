import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const, same_position, String_Builder } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { calcu_entity_future_position, calcu_entity_future_squares, clacu_reversed_direction, collinear_direction, Direction, Entity_Type, Game_Entity, locate_entities_in_target_direction, same_direction } from './Game_Entity';
import { Move_Transaction } from './Move_Transaction';
import { Move_Flags, Move_Info, Pushed_Move, Single_Move, Support_Move } from './Single_Move';
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
        function try_push_other_entities(e: Game_Entity, d: Direction): boolean {
            for (let other of locate_entities_in_target_direction(manager, e, d)) {
                if (other == null) continue;
                if (other == e) continue;

                const pushed_move = new Pushed_Move(e, other, d);
                if (!pushed_move.try_add_itself(transaction)) {
                    return false;
                }
            }
            return true;
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
                turned_around = !try_push_other_entities(rover, direction);
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
                    stucked = !try_push_other_entities(rover, direction);
                } else {
                    // @implementMe Turning is a problem for now, we don't even have a suitable model...
                }
            }
        }

        if (!stucked) {
            this.info.end_direction = direction;
            this.info.end_position = calcu_entity_future_position(rover, this.end_direction);
            const position_delta = new Vec3(this.end_position).subtract(this.start_position);
            const supportees = manager.locate_current_supportees(rover);
            for (let supportee of supportees) {
                const support_move = new Support_Move(supportee, 0, position_delta);
                support_move.try_add_itself(transaction);
            }
        }

        if (!same_position(this.start_position, this.end_position))
            this.flags |= Move_Flags.MOVED;

        if (this.start_direction != this.end_direction)
            this.flags |= Move_Flags.ROTATED;

        transaction.moves.push(this);
        return true;
    }

    async execute_async(transaction: Move_Transaction) {
        const manager = transaction.entity_manager;
        const entity = manager.find(this.target_entity_id);

        if (this.flags & Move_Flags.MOVED) {
            manager.move_entity(entity, this.end_position);
        }

        if (this.flags & Move_Flags.ROTATED) {
            entity.undoable.orientation = this.end_direction; // @implementMe Extract it to entity manager
            entity.logically_rotate_to(this.end_direction);
        }
    }

    debug_info(): string {
        let builder = new String_Builder();
        builder.append('ROVER#').append(this.id);
        builder.append('\n-   entity#').append(this.info.target_entity_id);

        if (this.flags & Move_Flags.ROTATED) {
            builder.append('\n-   rotation: from ')
                .append(Const.Direction_Names[this.start_direction])
                .append(' to ')
                .append(Const.Direction_Names[this.end_direction]);
        }

        if (this.flags & Move_Flags.MOVED) {
            builder.append('\n-   movement: from ')
                .append(this.start_position.toString())
                .append(' to ')
                .append(this.end_position.toString());
        }

        return builder.to_string();
    }
}

export function check_if_switch_turned_on(manager: Entity_Manager) {
    let e_switch = null;
    for (let e of manager.all_entities) {
        if (e.entity_type == Entity_Type.SWITCH) {
            e_switch = e;
        };
    }

    if (e_switch == null) return;

    for (let e of manager.locate_current_supportees(e_switch)) {
        if (e.entity_type == Entity_Type.GEM) {
            manager.switch_turned_on = true;
            return;
        }
    }

    manager.switch_turned_on = false;
}

export function generate_rover_moves(transaction_manager: Transaction_Manager) {
    const entity_manager = transaction_manager.entity_manager;
    if (!entity_manager.switch_turned_on) return;

    for (let rover of entity_manager.rovers) {
        const rover_move = new Rover_Move(rover);
        transaction_manager.try_add_new_move(rover_move);
    }
}