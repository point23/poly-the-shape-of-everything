System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, instantiate, Node, Prefab, Size, Vec3, Coord, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _class3, _crd, ccclass, property, Game_Board;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      instantiate = _cc.instantiate;
      Node = _cc.Node;
      Prefab = _cc.Prefab;
      Size = _cc.Size;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0bbd2p3zRJObb/V2hrwaO1N", "Game_Board", undefined);

      __checkObsolete__(['_decorator', 'Component', 'instantiate', 'MeshRenderer', 'Node', 'Prefab', 'Size', 'Vec2', 'Vec3']);

      ({
        ccclass,
        property
      } = _decorator);
      Coord = class Coord {
        constructor(x, y) {
          this.x = void 0;
          this.y = void 0;
          this.x = x;
          this.y = y;
        }

      };
      /* NOTE
          - Draw debug info
          - show grids
          - Transform from board coords to world position
       */

      _export("Game_Board", Game_Board = (_dec = ccclass('Game_Board'), _dec2 = property(Node), _dec3 = property(Prefab), _dec(_class = (_class2 = (_class3 = class Game_Board extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "regions", _descriptor, this);

          _initializerDefineProperty(this, "board_region_prefab", _descriptor2, this);

          this.grid_size = void 0;
        }

        show_grids(grid_size) {
          this.grid_size = new Size(grid_size.width, grid_size.height);
          let cols = grid_size.width / Game_Board.region_size;
          let rows = grid_size.height / Game_Board.region_size;
          let step_z = Game_Board.region_size;
          let step_x = Game_Board.region_size;
          let pos_x = Game_Board.origin_pos.x + Game_Board.half_region_size - Game_Board.half_square_size;

          for (let row = 0; row < rows; row++) {
            let pos_z = Game_Board.origin_pos.z + Game_Board.half_region_size - Game_Board.half_square_size;

            for (let col = 0; col < cols; col++) {
              let region = instantiate(this.board_region_prefab);
              region.setParent(this.regions);
              region.setPosition(new Vec3(pos_x, 0, pos_z));
              pos_z += step_z;
            }

            pos_x += step_x;
          }
        }

        coordToWorldPosition(coord) {
          if (coord.x > this.grid_size.width || coord.y > this.grid_size.height) {
            return {
              succeed: false,
              pos: Vec3.ZERO
            };
          }

          let pos = new Vec3(coord.y * Game_Board.square_size, 0, coord.x * Game_Board.square_size);
          return {
            succeed: true,
            pos: pos
          };
        }

      }, _class3.region_size = 10, _class3.half_region_size = 5, _class3.square_size = 1, _class3.half_square_size = 0.5, _class3.origin_pos = new Vec3(0, 0, 0), _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "regions", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "board_region_prefab", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      })), _class2)) || _class));

      _cclegacy._RF.pop();

      _crd = false;
    }
  };
});
//# sourceMappingURL=acb007374e9bfa73b04687ea3b1fb03c0c3d068a.js.map