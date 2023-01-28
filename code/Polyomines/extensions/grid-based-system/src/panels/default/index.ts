import {readFileSync} from 'fs-extra';
import {join} from 'path';
import {App, createApp} from 'vue';

const panelDataMap = new WeakMap<any, App>();
module.exports = Editor.Panel.define({
  listeners: {
    show() {
      console.log('show');
    },
    hide() {
      console.log('hide');
    },
  },

  template: readFileSync(
      join(__dirname, '../../../static/template/default/index.html'), 'utf-8'),

  style: readFileSync(
      join(__dirname, '../../../static/style/default/index.css'), 'utf-8'),

  $: {
    app: '#app',
    text: '#text',
  },

  methods: {
    hello() {
      if (this.$.text) {
        this.$.text.innerHTML = 'hello';
        console.log('[cocos-panel-html.default]: hello');
      }
    },
  },

  ready() {
    if (this.$.text) {
      this.$.text.innerHTML = 'Grid-based Entity Management System';
    }
    if (this.$.app) {
      const app = createApp({});
      app.config.compilerOptions.isCustomElement = (tag) =>
          tag.startsWith('ui-');
      app.component('MyCounter', {
        template: readFileSync(
            join(__dirname, '../../../static/template/vue/counter.html'),
            'utf-8'),
        data() {
          return {
            counter: 0,
          };
        },
        methods: {
          addition() {
            this.counter += 1;
          },
          subtraction() {
            this.counter -= 1;
          },
        },
      });
      app.mount(this.$.app);
      panelDataMap.set(this, app);
    }
  },

  beforeClose() {},

  close() {
    const app = panelDataMap.get(this);
    if (app) {
      app.unmount();
    }
  },

});
