System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, MeshRenderer, Vec4, Size, Game_Board, _dec, _dec2, _class, _class2, _descriptor, _crd, ccclass, property, Main;

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
      Vec4 = _cc.Vec4;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8eeb1JJfflAxIpigFBqMuBI", "Main", undefined);

      __checkObsolete__(['_decorator', 'Component', 'game', 'Mesh', 'MeshRenderer', 'Node', 'profiler', 'Quat', 'Vec4']);

      ({
        ccclass,
        property
      } = _decorator);
      Size = class Size {
        constructor(width, height) {
          this.values = void 0;
          this.values = [width, height];
        }

        get x() {
          return this.values[0];
        }

        get y() {
          return this.values[1];
        }

      };
      Game_Board = class Game_Board {
        constructor(grid_size, renderable) {
          this.grid_size = void 0;
          this.renderable = void 0;
          this.grid_size = grid_size;
          this.renderable = renderable;
        }

        render() {
          console.log(this.renderable.material);
          this.renderable.material.setProperty('tilingOffset', new Vec4(8, 8, 0, 0));
        }

      };

      _export("Main", Main = (_dec = ccclass('Main'), _dec2 = property(MeshRenderer), _dec(_class = (_class2 = class Main extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "board_renderable", _descriptor, this);
        }

        start() {
          var game_board = new Game_Board(new Size(8, 8), this.board_renderable);
          game_board.render();
        }

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "board_renderable", [_dec2], {
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
//# sourceMappingURL=5dc60be46b47d7fffb1e04a26e2e72320a2e587a.js.map