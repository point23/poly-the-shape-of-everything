System.register(["__unresolved_0", "cc", "__unresolved_1"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, instantiate, Node, Prefab, Game_Board, _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3, _crd, ccclass, property, Entity_Manager;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfGame_Board(extras) {
    _reporterNs.report("Game_Board", "./Game_Board", _context.meta, extras);
  }

  return {
    setters: [function (_unresolved_) {
      _reporterNs = _unresolved_;
    }, function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Component = _cc.Component;
      instantiate = _cc.instantiate;
      Node = _cc.Node;
      Prefab = _cc.Prefab;
    }, function (_unresolved_2) {
      Game_Board = _unresolved_2.Game_Board;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "89328Z88v5EzLcWZ8mbUS4x", "Entity_Manager", undefined);

      __checkObsolete__(['_decorator', 'Component', 'instantiate', 'Node', 'Prefab']);

      ({
        ccclass,
        property
      } = _decorator);
      /* FIXME Not complete */

      _export("Entity_Manager", Entity_Manager = (_dec = ccclass('Entity_Manager'), _dec2 = property(Prefab), _dec3 = property(Node), _dec4 = property(_crd && Game_Board === void 0 ? (_reportPossibleCrUseOfGame_Board({
        error: Error()
      }), Game_Board) : Game_Board), _dec(_class = (_class2 = class Entity_Manager extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "ground_prefab", _descriptor, this);

          _initializerDefineProperty(this, "grounds", _descriptor2, this);

          _initializerDefineProperty(this, "game_board", _descriptor3, this);
        }

        generate_grounds(grounds_info) {
          for (var ground_info of grounds_info) {
            var ground = instantiate(this.ground_prefab);
            ground.setParent(this.grounds);
            var convert_res = this.game_board.coordToWorldPosition(ground_info.coord);
            ground.setPosition(convert_res.pos);
          }
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "ground_prefab", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "grounds", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "game_board", [_dec4], {
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
//# sourceMappingURL=1c7d1c1f3948f7fb7440f35ee26545d102fce53c.js.map