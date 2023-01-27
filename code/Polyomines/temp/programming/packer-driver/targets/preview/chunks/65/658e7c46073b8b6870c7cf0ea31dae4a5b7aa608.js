System.register(["__unresolved_0", "cc", "__unresolved_1", "__unresolved_2"], function (_export, _context) {
  "use strict";

  var _reporterNs, _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Component, resources, sys, Entity_Manager, Game_Board, _dec, _dec2, _dec3, _class, _class2, _descriptor, _descriptor2, _class3, _crd, ccclass, property, Main;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  function _reportPossibleCrUseOfEntity_Manager(extras) {
    _reporterNs.report("Entity_Manager", "./Entity_Manager", _context.meta, extras);
  }

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
      resources = _cc.resources;
      sys = _cc.sys;
    }, function (_unresolved_2) {
      Entity_Manager = _unresolved_2.Entity_Manager;
    }, function (_unresolved_3) {
      Game_Board = _unresolved_3.Game_Board;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "8eeb1JJfflAxIpigFBqMuBI", "Main", undefined);

      __checkObsolete__(['_decorator', 'assetManager', 'Component', 'JsonAsset', 'resources', 'Size', 'sys']);

      ({
        ccclass,
        property
      } = _decorator);
      /* TODO For now, the 'Main' is just a Level_Loader?
       */

      _export("Main", Main = (_dec = ccclass('Main'), _dec2 = property(_crd && Game_Board === void 0 ? (_reportPossibleCrUseOfGame_Board({
        error: Error()
      }), Game_Board) : Game_Board), _dec3 = property(_crd && Entity_Manager === void 0 ? (_reportPossibleCrUseOfEntity_Manager({
        error: Error()
      }), Entity_Manager) : Entity_Manager), _dec(_class = (_class2 = (_class3 = class Main extends Component {
        constructor() {
          super(...arguments);

          _initializerDefineProperty(this, "game_board", _descriptor, this);

          _initializerDefineProperty(this, "entity_manager", _descriptor2, this);
        }

        start() {
          console.warn("platform: " + sys.platform);
          resources.load('data/level_01', (err, jsonAsset) => {
            if (err != null) {
              console.error(err);
              return;
            }

            this.load_level(jsonAsset.json);
          });
        }

        load_level(level_config) {
          Main.Level_Config = level_config;
          this.game_board.show_grids(level_config.game_board.grid_size);
          this.entity_manager.generate_grounds(level_config.grounds);
        }

      }, _class3.Level_Config = void 0, _class3), (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "game_board", [_dec2], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: null
      }), _descriptor2 = _applyDecoratedDescriptor(_class2.prototype, "entity_manager", [_dec3], {
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
//# sourceMappingURL=658e7c46073b8b6870c7cf0ea31dae4a5b7aa608.js.map