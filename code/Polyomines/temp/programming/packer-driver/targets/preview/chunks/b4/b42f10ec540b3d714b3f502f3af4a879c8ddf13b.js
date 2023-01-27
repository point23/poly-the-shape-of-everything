System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, MeshRenderer, Prefab, Size, _dec, _dec2, _dec3, _dec4, _class, _class2, _descriptor, _descriptor2, _descriptor3, _crd, ccclass, property, Game_Board;

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
      MeshRenderer = _cc.MeshRenderer;
      Prefab = _cc.Prefab;
      Size = _cc.Size;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "0c0faPAYd1FT7ltL2ABCGgc", "Game_Board", undefined);

      __checkObsolete__(['_decorator', 'Component', 'DebugMode', 'Mesh', 'MeshRenderer', 'Node', 'Prefab', 'Size', 'Vec4']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Game_Board", Game_Board = (_dec = ccclass('Game_Board'), _dec2 = property(Size), _dec3 = property(Boolean), _dec4 = property(Prefab), _dec(_class = (_class2 = class Game_Board extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "grid_size", _descriptor, this);

          _initializerDefineProperty(this, "is_show_coords", _descriptor2, this);

          _initializerDefineProperty(this, "coord_prefab", _descriptor3, this);
        }

        start() {
          var renderable = this.getComponent(MeshRenderer);

          if (this.is_show_coords) {}
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "grid_size", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "is_show_coords", [_dec3], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor3 = _applyDecoratedDescriptor(_class2.prototype, "coord_prefab", [_dec4], {
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
//# sourceMappingURL=b42f10ec540b3d714b3f502f3af4a879c8ddf13b.js.map