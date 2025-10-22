/**
 * 应用常量和配置定义
 * 提供统一的配置管理和常量定义
 */

// 滚动条模式常量
export const ScrollbarModes = {
    DEFAULT: 'default',
    ALWAYS: 'always',
    SEMI: 'semi'
};

// 事件类型定义
export const EventTypes = {
    // 应用生命周期
    APP_INIT: 'app:init',
    APP_DESTROY: 'app:destroy',

    // 样式相关
    STYLE_MODE_CHANGE: 'style:mode-change',
    SCROLLBAR_SHOW: 'scrollbar:show',
    SCROLLBAR_HIDE: 'scrollbar:hide',

    // 滚动相关
    SCROLL_START: 'scroll:start',
    SCROLL_END: 'scroll:end',
    AUTO_SCROLL_START: 'auto-scroll:start',
    AUTO_SCROLL_STOP: 'auto-scroll:stop',

    // UI相关
    UI_PANEL_TOGGLE: 'ui:panel-toggle',
    UI_MODE_SELECT: 'ui:mode-select',
    UI_SPEED_CHANGE: 'ui:speed-change',
    UI_DOT_CLICK: 'ui:dot-click',

    // 插件相关
    PLUGIN_REGISTER: 'plugin:register',
    PLUGIN_UNREGISTER: 'plugin:unregister',

    // 键盘相关
    KEYBOARD_TOGGLE: 'keyboard:toggle',
    KEYBOARD_SPEED_UP: 'keyboard:speed-up',
    KEYBOARD_SPEED_DOWN: 'keyboard:speed-down'
};

// 扩展点定义
export const ExtensionPoints = {
    BEFORE_INIT: 'before-init',
    AFTER_INIT: 'after-init',
    STYLE_CHANGE: 'style-change',
    SCROLL_EVENT: 'scroll-event',
    UI_INTERACTION: 'ui-interaction',
    CUSTOM_CONTROL: 'custom-control'
};

// 应用配置
export const Config = {
    scrollbar: {
        modes: [ScrollbarModes.DEFAULT, ScrollbarModes.ALWAYS, ScrollbarModes.SEMI],
        defaultMode: ScrollbarModes.DEFAULT
    },
    autoScroll: {
        minSpeed: 1,
        maxSpeed: 10,
        defaultSpeed: 3,
        frameRate: 60,
        smoothness: 0.1
    },
    ui: {
        dotSize: 20,
        panelWidth: 200,
        zIndex: 999999,
        fadeTimeout: 3000
    },
    extensions: {
        enabled: true,
        autoLoad: true
    },
    keyboard: {
        toggleKey: 'KeyS',
        speedUpKey: 'ArrowUp',
        speedDownKey: 'ArrowDown',
        modifierKey: 'ctrlKey'
    }
};

// CSS类名常量
export const CSSClasses = {
    SCROLLBAR_HIDDEN: 'scrollbar-hidden',
    SCROLLBAR_ALWAYS: 'scrollbar-always',
    SCROLLBAR_SEMI: 'scrollbar-semi',
    CONTROL_DOT: 'scrollbar-control-dot',
    CONTROL_PANEL: 'scrollbar-control-panel',
    PANEL_VISIBLE: 'panel-visible',
    AUTO_SCROLL_ACTIVE: 'auto-scroll-active'
};

// 浏览器类型常量
export const BrowserTypes = {
    CHROME: 'chrome',
    FIREFOX: 'firefox',
    SAFARI: 'safari',
    EDGE: 'edge',
    OPERA: 'opera',
    UNKNOWN: 'unknown'
};

// 错误类型常量
export const ErrorTypes = {
    INITIALIZATION_ERROR: 'initialization-error',
    PLUGIN_ERROR: 'plugin-error',
    UI_ERROR: 'ui-error',
    STYLE_ERROR: 'style-error',
    EVENT_ERROR: 'event-error'
};

// 日志级别常量
export const LogLevels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// 默认样式常量
export const DefaultStyles = {
    controlDot: {
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#007acc',
        position: 'fixed',
        top: '20px',
        right: '20px',
        cursor: 'pointer',
        zIndex: '999999',
        opacity: '0.7',
        transition: 'opacity 0.3s ease'
    },
    controlPanel: {
        width: '200px',
        backgroundColor: '#ffffff',
        border: '1px solid #ccc',
        borderRadius: '5px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: '50px',
        right: '20px',
        zIndex: '999998',
        padding: '10px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif'
    }
};
