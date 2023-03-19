import { _decorator, Component, Node, Vec3 } from 'cc';
import { Const, same_position, String_Builder } from './Const';
import { calcu_entity_future_position, calcu_entity_future_squares, clacu_reversed_direction, collinear_direction, Direction, Entity_Type, Game_Entity, same_direction } from './Game_Entity';
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
        const manager = transaction.entity_manager;

        let rover = manager.find(this.info.target_entity_id);

        let track = null;
        const supporters = manager.locate_future_supporters(rover, rover.orientation);
        for (let supporter of supporters) {
            if (supporter.entity_type == Entity_Type.TRACK) {
                track = supporter;
            }
        }

        let direction = 0;
        if (track == null) { // There's no way ahead, we need to turn around
            direction = clacu_reversed_direction(rover.orientation);
        } else {
            if (collinear_direction(track.rotation, rover.orientation)) {
                direction = rover.orientation;
            } else {
                // @implementMe Turning is a problem for now, we don't even have a suitable model...
            }

            const future_squares = calcu_entity_future_squares(rover, direction);
            for (let pos of future_squares) {
                for (let other of manager.locate_entities(pos)) {

                    if (other == null) continue;
                    if (other == rover) continue;

                    const pushed_move = new Pushed_Move(rover, other, direction);

                    if (!pushed_move.try_add_itself(transaction)) {
                        direction = clacu_reversed_direction(rover.orientation);
                    }
                }
            }
        }

        this.info.end_direction = direction;
        const direction_delta = this.end_direction - this.start_direction;
        this.info.end_position = calcu_entity_future_position(rover, this.end_direction);
        const position_delta = new Vec3(this.end_position).subtract(this.start_position);

        const supportees = manager.locate_current_supportees(rover);
        for (let supportee of supportees) {
            const support_move = new Support_Move(supportee, direction_delta, position_delta);
            support_move.try_add_itself(transaction);
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
            // Rotation
            builder.append('\n-   rotation: from ')
                .append(Const.Direction_Names[this.start_direction])
                .append(' to ')
                .append(Const.Direction_Names[this.end_direction]);
        }

        if (this.flags & Move_Flags.MOVED) {
            // Movement
            builder.append('\n-   movement: from ')
                .append(this.start_position.toString())
                .append(' to ')
                .append(this.end_position.toString());
        }

        return builder.to_string();
    }
}

export function generate_rover_moves(transaction_manager: Transaction_Manager) {
    const entity_manager = transaction_manager.entity_manager;
    for (let rover of entity_manager.rovers) {
        const rover_move = new Rover_Move(rover);
        transaction_manager.try_add_new_move(rover_move);
    }
}

