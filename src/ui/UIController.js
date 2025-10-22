/**
 * UIController - 用户界面控制器
 * 负责协调和管理所有UI组件，包括ControlDot和ControlPanel
 */

import { ControlDot } from './ControlDot.js';
import { ControlPanel } from './ControlPanel.js';

export class UIController {
    constructor(eventBus, styleManager) {
        this.eventBus = eventBus;
        this.styleManager = styleManager;

        // UI组件实例
        this.controlDot = null;
        this.controlPanel = null;

        // 状态管理
        this.isInitialized = false;
        this.panelVisible = false;
        this.currentMode = 'default';

        // 绑定事件处理器
        this.handleDotClick = this.handleDotClick.bind(this);
        this.handleModeSelect = this.handleModeSelect.bind(this);
        this.handleDocumentClick = this.handleDocumentClick.bind(this);

        console.log('[UIController] 已创建');
    }

    /**
     * 初始化UI控制器
     */
    initialize() {
        if (this.isInitialized) {
            console.warn('[UIController] 已经初始化，跳过重复初始化');
            return;
        }

        try {
            // 创建UI组件
            this.createControlDot();
            this.createControlPanel();

            // 设置事件监听
            this.setupEventListeners();

            // 设置文档点击处理器
            this.setupDocumentClickHandler();

            this.isInitialized = true;
            console.log('[UIController] 初始化完成');

            // 发送初始化完成事件
            this.eventBus.emit('ui:initialized');
        } catch (error) {
            console.error('[UIController] 初始化失败:', error);
            throw error;
        }
    }

    /**
     * 创建控制圆点
     */
    createControlDot() {
        if (this.controlDot) {
            console.warn('[UIController] ControlDot已存在，跳过创建');
            return;
        }

        try {
            this.controlDot = new ControlDot(this.eventBus);
            this.controlDot.create();
            console.log('[UIController] ControlDot已创建');
        } catch (error) {
            console.error('[UIController] 创建ControlDot失败:', error);
            throw error;
        }
    }

    /**
     * 创建控制面板
     */
    createControlPanel() {
        if (this.controlPanel) {
            console.warn('[UIController] ControlPanel已存在，跳过创建');
            return;
        }

        try {
            this.controlPanel = new ControlPanel(this.eventBus);
            this.controlPanel.create();
            console.log('[UIController] ControlPanel已创建');
        } catch (error) {
            console.error('[UIController] 创建ControlPanel失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 监听圆点点击事件
        this.eventBus.on('ui:dot-click', this.handleDotClick);

        // 监听模式选择事件
        this.eventBus.on('ui:mode-select', this.handleModeSelect);

        // 监听样式管理器的模式变化
        this.eventBus.on('style:mode-change', mode => {
            this.currentMode = mode;
            this.updatePanelState();
        });

        console.log('[UIController] 事件监听器已设置');
    }

    /**
     * 设置文档点击处理器
     */
    setupDocumentClickHandler() {
        try {
            // 使用捕获阶段确保能够处理所有点击事件
            document.addEventListener('click', this.handleDocumentClick, true);
            console.log('[UIController] 文档点击处理器已设置');
        } catch (error) {
            console.error('[UIController] 设置文档点击处理器失败:', error);
        }
    }

    /**
     * 处理圆点点击事件
     */
    handleDotClick() {
        try {
            this.togglePanel();
        } catch (error) {
            console.error('[UIController] 处理圆点点击失败:', error);
        }
    }

    /**
     * 处理模式选择事件
     * @param {string} mode - 选择的模式
     */
    handleModeSelect(mode) {
        try {
            this.currentMode = mode;

            // 通知样式管理器切换模式
            this.styleManager.setMode(mode);

            // 发送模式变化事件
            this.eventBus.emit('ui:mode-changed', mode);

            // 更新面板状态
            this.updatePanelState();

            console.log('[UIController] 模式已切换到:', mode);
        } catch (error) {
            console.error('[UIController] 处理模式选择失败:', error);
        }
    }

    /**
     * 处理文档点击事件
     * @param {Event} event - 点击事件
     */
    handleDocumentClick(event) {
        if (!this.panelVisible) {
            return;
        }

        try {
            const target = event.target;

            // 检查点击是否在控制组件内部
            const isClickOnDot = this.controlDot && this.controlDot.contains(target);
            const isClickOnPanel = this.controlPanel && this.controlPanel.contains(target);

            // 如果点击在组件外部，隐藏面板
            if (!isClickOnDot && !isClickOnPanel) {
                this.hidePanel();
            }
        } catch (error) {
            console.error('[UIController] 处理文档点击失败:', error);
        }
    }

    /**
     * 切换面板显示状态
     */
    togglePanel() {
        if (this.panelVisible) {
            this.hidePanel();
        } else {
            this.showPanel();
        }
    }

    /**
     * 显示控制面板
     */
    showPanel() {
        if (!this.controlPanel) {
            console.warn('[UIController] ControlPanel不存在，无法显示');
            return;
        }

        try {
            this.controlPanel.show();
            this.panelVisible = true;

            // 更新面板状态
            this.updatePanelState();

            // 发送面板显示事件
            this.eventBus.emit('ui:panel-show');

            console.log('[UIController] 控制面板已显示');
        } catch (error) {
            console.error('[UIController] 显示控制面板失败:', error);
        }
    }

    /**
     * 隐藏控制面板
     */
    hidePanel() {
        if (!this.controlPanel) {
            return;
        }

        try {
            this.controlPanel.hide();
            this.panelVisible = false;

            // 发送面板隐藏事件
            this.eventBus.emit('ui:panel-hide');

            console.log('[UIController] 控制面板已隐藏');
        } catch (error) {
            console.error('[UIController] 隐藏控制面板失败:', error);
        }
    }

    /**
     * 更新面板状态
     */
    updatePanelState() {
        if (!this.controlPanel || !this.panelVisible) {
            return;
        }

        try {
            this.controlPanel.updateState({
                currentMode: this.currentMode,
                panelVisible: this.panelVisible
            });
        } catch (error) {
            console.error('[UIController] 更新面板状态失败:', error);
        }
    }

    /**
     * 获取当前模式
     * @returns {string} 当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 获取面板可见状态
     * @returns {boolean} 面板是否可见
     */
    isPanelVisible() {
        return this.panelVisible;
    }

    /**
     * 销毁UI控制器
     */
    destroy() {
        try {
            // 移除事件监听器
            this.eventBus.off('ui:dot-click', this.handleDotClick);
            this.eventBus.off('ui:mode-select', this.handleModeSelect);
            document.removeEventListener('click', this.handleDocumentClick, true);

            // 销毁UI组件
            if (this.controlDot) {
                this.controlDot.destroy();
                this.controlDot = null;
            }

            if (this.controlPanel) {
                this.controlPanel.destroy();
                this.controlPanel = null;
            }

            // 重置状态
            this.isInitialized = false;
            this.panelVisible = false;

            console.log('[UIController] 已销毁');

            // 发送销毁事件
            this.eventBus.emit('ui:destroyed');
        } catch (error) {
            console.error('[UIController] 销毁失败:', error);
        }
    }
}
