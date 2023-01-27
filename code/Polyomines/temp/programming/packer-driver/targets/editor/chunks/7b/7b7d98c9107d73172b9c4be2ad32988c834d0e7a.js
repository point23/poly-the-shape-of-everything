System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, instantiate, Node, Prefab, Vec3, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _class3, _crd, ccclass, property, Game_Board;

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

      _export("Game_Board", Game_Board = (_dec = ccclass('Game_Board'), _dec2 = property(Node), _dec3 = property(Prefab), _dec(_class = (_class2 = (_class3 = class Game_Board extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "regions", _descriptor, this);

          _initializerDefineProperty(this, "board_region_prefab", _descriptor2, this);
        }

        show_grids(grid_size) {
          let origin_pos_x = 0;
          let origin_pos_z = 0;
          let step_z = Game_Board.region_size;
          let step_x = Game_Board.region_size;
          let pos_x = origin_pos_x + Game_Board.half_region_size;

          for (let x = 0; x < grid_size.width; x++) {
            let pos_z = origin_pos_z + Game_Board.half_region_size;

            for (let y = 0; y < grid_size.height; y++) {
              let region = instantiate(this.board_region_prefab);
              region.setParent(this.regions);
              region.setPosition(new Vec3(pos_x, 0, pos_z));
              pos_z += step_z;
            }

            pos_x += step_x;
          }
        }

      }, _class3.region_size = 10, _class3.half_region_size = 5, _class3.square_size = 1, _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "regions", [_dec2], {
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
//# sourceMappingURL=7b7d98c9107d73172b9c4be2ad32988c834d0e7a.js.map