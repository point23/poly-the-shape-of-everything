System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, instantiate, Node, Prefab, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _crd, ccclass, property, Game_Board;

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
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0bbd2p3zRJObb/V2hrwaO1N", "Game_Board", undefined);

      __checkObsolete__(['_decorator', 'Component', 'instantiate', 'MeshRenderer', 'Node', 'Prefab', 'Size']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Game_Board", Game_Board = (_dec = ccclass('Game_Board'), _dec2 = property(Node), _dec3 = property(Prefab), _dec(_class = (_class2 = class Game_Board extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "origin", _descriptor, this);

          _initializerDefineProperty(this, "board_region_prefab", _descriptor2, this);
        }

        show_grids(size) {
          let origin_pos = this.origin.position;
          console.log();

          for (let x = 0; x < size.width; x++) {
            for (let y = 0; y < size.height; y++) {
              let region = instantiate(this.board_region_prefab);
              region.setParent(this.node);
            }
          }
        }

        showGrid() {}

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "origin", [_dec2], {
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
//# sourceMappingURL=4cf7695dd6e134b34dfbfb3059eb46d3f9399d7a.js.map