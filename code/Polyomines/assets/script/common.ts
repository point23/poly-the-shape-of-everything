import { _decorator, } from 'cc';
import { play_sfx } from './Audio_Manager';
import { init_animation_state, human_animation_graph, animate, Character_Data } from './Character_Data';
import { $$, Const, Direction } from './Const';
import { Entity_Manager } from './Entity_Manager';
import { Level_Editor } from './Level_Editor';
import { Main } from './Main';
import { Transaction_Manager } from './Transaction_Manager';
import { Game_Input, Game_Button, Button_State } from './input/Game_Input_Handler';
import { Input_Manager } from './input/Input_Manager';
import { generate_player_move } from './sokoban';
import { do_one_undo } from './undo';
import { Game_Entity } from './Game_Entity';

export function init_animations() {
    const entity_manager = Entity_Manager.current;
    for (let h of entity_manager.by_type.Hero) {
        init_animation_state(h, human_animation_graph);
    }

    animate(entity_manager.active_hero, "activate");
}

export function per_round_animation_update(entity: Game_Entity) {
    const c = entity?.getComponent(Character_Data);
    if (!c) return;

    const state = c.anim_state;
    const node = c.anim_state.node;

    if (state.contains_deferred_transition) {
        state.deferred_rounds -= 1;
        if (state.deferred_rounds == 0) {
            console.log(state);

            state.contains_deferred_transition = false;
            animate(entity, state.deferred_msg, state.deferred_duration);
        }
        return;
    }

    const input: Game_Input = Input_Manager.instance.game_input;
    state.elapsed += 1;
    if (state.elapsed >= state.duration) {
        if (node.name == "run" || node.name == "push") {
            if (!input.keep_pressing_moving_btn()) {
                animate(entity, "stop");
            }
        }

        if (node.name == "landing") {
            animate(entity, "activate");
        }

        if (node.name == "victory") {
            animate(entity, "activate");
        }
    }

    if (state.node.name == "active") {
        if (input.keep_pressing_moving_btn() && input.buffered_player_moves.empty()) {
            animate(entity, "run");
        }
    }
}

export function update_inputs() {
    Input_Manager.instance.update_inputs();
}

export function process_inputs() {
    if (!$$.IS_RUNNING) return;

    const entity_manager = Entity_Manager.current;
    const transaction_manager = Transaction_Manager.instance;
    const input: Game_Input = Input_Manager.instance.game_input;
    const records = input.pending_records;

    if (!(input.button_states.get(Game_Button.UNDO).ended_down)) {
        $$.DOING_UNDO = false;
    }

    records.sort((a: Button_State, b: Button_State) => { return a.counter - b.counter });// @Note a > b if a - b < 0,

    for (let record of input.pending_records) {
        const button = record.button;

        if (button == Game_Button.RESET) {
            $$.IS_RUNNING = false;
            $$.RELOADING = true;
            if ($$.FOR_EDITING) {
                Level_Editor.instance.reload_current_level();
            } else {
                Main.instance.reload_current_level();
            }
        }

        if (button == Game_Button.UNDO) {
            $$.DOING_UNDO = true;
            do_one_undo(entity_manager);
            play_sfx("undo");
        }

        if (button == Game_Button.SWITCH_HERO) {
            if (entity_manager.num_heros == 1) {
                play_sfx("wrong");
            } else {
                entity_manager.switch_hero();
                play_sfx("hero!");
            }
        }

        // @Fixme There might be other types of  buttons.
        input.buffered_player_moves.enqueue(button);
    }

    input.pending_records = [];

    if ($$.DOING_UNDO || $$.RELOADING) return;
    if (!input.buffered_player_moves.empty() && !$$.PLAYER_MOVE_NOT_YET_EXECUTED) {
        while (input.buffered_player_moves.size() >= Const.WEIRD_USER_INPUT_COUNTS) { // @Note Handle weird user inputs.
            input.buffered_player_moves.storage.pop(); // @Hack
        }

        const button = input.buffered_player_moves.dequeue();

        // Move
        if (button == Game_Button.MOVE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 1);
        }
        if (button == Game_Button.MOVE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 1);
        }
        if (button == Game_Button.MOVE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 1);
        }
        if (button == Game_Button.MOVE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 1);
        }

        // Rotate @Deprecated Should be pull?
        if (button == Game_Button.FACE_BACKWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.BACKWORD, 0);
        }
        if (button == Game_Button.FACE_FORWARD) {
            generate_player_move(transaction_manager, entity_manager, Direction.FORWARD, 0);
        }
        if (button == Game_Button.FACE_LEFT) {
            generate_player_move(transaction_manager, entity_manager, Direction.LEFT, 0);
        }
        if (button == Game_Button.FACE_RIGHT) {
            generate_player_move(transaction_manager, entity_manager, Direction.RIGHT, 0);
        }
    }
}