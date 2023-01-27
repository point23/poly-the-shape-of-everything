System.register(["cc"], function (_export, _context) {
  "use strict";

  var _cclegacy, __checkObsolete__, __checkObsoleteInNamespace__, _decorator, Camera, Component, input, Input, KeyCode, Vec3, _dec, _dec2, _class, _class2, _descriptor, _crd, ccclass, property, Swipe_Camera;

  function _initializerDefineProperty(target, property, descriptor, context) { if (!descriptor) return; Object.defineProperty(target, property, { enumerable: descriptor.enumerable, configurable: descriptor.configurable, writable: descriptor.writable, value: descriptor.initializer ? descriptor.initializer.call(context) : void 0 }); }

  function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) { var desc = {}; Object.keys(descriptor).forEach(function (key) { desc[key] = descriptor[key]; }); desc.enumerable = !!desc.enumerable; desc.configurable = !!desc.configurable; if ('value' in desc || desc.initializer) { desc.writable = true; } desc = decorators.slice().reverse().reduce(function (desc, decorator) { return decorator(target, property, desc) || desc; }, desc); if (context && desc.initializer !== void 0) { desc.value = desc.initializer ? desc.initializer.call(context) : void 0; desc.initializer = undefined; } if (desc.initializer === void 0) { Object.defineProperty(target, property, desc); desc = null; } return desc; }

  function _initializerWarningHelper(descriptor, context) { throw new Error('Decorating class property failed. Please ensure that ' + 'proposal-class-properties is enabled and runs after the decorators transform.'); }

  return {
    setters: [function (_cc) {
      _cclegacy = _cc.cclegacy;
      __checkObsolete__ = _cc.__checkObsolete__;
      __checkObsoleteInNamespace__ = _cc.__checkObsoleteInNamespace__;
      _decorator = _cc._decorator;
      Camera = _cc.Camera;
      Component = _cc.Component;
      input = _cc.input;
      Input = _cc.Input;
      KeyCode = _cc.KeyCode;
      Vec3 = _cc.Vec3;
    }],
    execute: function () {
      _crd = true;

      _cclegacy._RF.push({}, "b3c61wlrSdPMYT2vFS08hUQ", "Swipe_Camera", undefined);

      __checkObsolete__(['_decorator', 'Camera', 'Component', 'EventKeyboard', 'input', 'Input', 'KeyCode', 'Vec3']);

      ({
        ccclass,
        property
      } = _decorator);

      _export("Swipe_Camera", Swipe_Camera = (_dec = ccclass('Swipe_Camera'), _dec2 = property(Camera), _dec(_class = (_class2 = class Swipe_Camera extends Component {
        constructor(...args) {
          super(...args);

          _initializerDefineProperty(this, "camera", _descriptor, this);
        }

        onLoad() {
          this.register_event();
        }

        onDestroy() {
          this.unregister_event();
        }

        register_event() {
          input.on(Input.EventType.KEY_DOWN, this.on_keyboard_down, this);
          input.on(Input.EventType.KEY_UP, this.on_keyboard_up, this);
          input.on(Input.EventType.KEY_PRESSING, this.on_keyboard_pressing, this);
        }

        unregister_event() {
          input.off(Input.EventType.KEY_DOWN, this.on_keyboard_down, this);
          input.off(Input.EventType.KEY_UP, this.on_keyboard_up, this);
          input.off(Input.EventType.KEY_PRESSING, this.on_keyboard_pressing, this);
        }

        on_keyboard_down(event) {
          let key_code = event.keyCode;
          console.log(`key down: ${key_code}`);

          if (key_code == KeyCode.KEY_W) {
            this.camera.node.position.add(new Vec3(0, 1, 0));
          } else if (key_code == KeyCode.KEY_S) {
            this.camera.node.position.add(new Vec3(0, -1, 0));
          } else if (key_code == KeyCode.KEY_A) {
            this.camera.node.position.add(new Vec3(0, 0, -1));
          } else if (key_code == KeyCode.KEY_D) {
            this.camera.node.position.add(new Vec3(0, 0, 1));
          } else if (key_code == KeyCode.KEY_Q) {
            this.camera.node.position.add(new Vec3(-1, 0, 0));
          } else if (key_code == KeyCode.KEY_E) {
            this.camera.node.position.add(new Vec3(1, 0, 1));
          }
        }

        on_keyboard_up(event) {}

        on_keyboard_pressing(event) {}

      }, (_descriptor = _applyDecoratedDescriptor(_class2.prototype, "camera", [_dec2], {
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
//# sourceMappingURL=6f4ebaec5bf25e51bdf7e204723cbc07386c5c82.js.map