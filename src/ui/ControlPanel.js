/**
 * ControlPanel - 控制面板组件
 * 负责创建和管理滚动条控制面板，处理用户设置和模式选择
 */

export class ControlPanel {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.element = null;
        this.isCreated = false;
        this.isVisible = false;
        this.currentMode = 'default';

        // 模式选项配置
        this.modeOptions = [
            { value: 'default', label: '默认模式', description: '显示原始滚动条' },
            { value: 'always', label: '隐藏模式', description: '永远隐藏滚动条' },
            { value: 'semi', label: '半透明模式', description: '滚动时显示，停止后隐藏' }
        ];

        console.log('[ControlPanel] 已创建');
    }

    /**
     * 创建控制面板元素
     */
    create() {
        if (this.isCreated || this.element) {
            console.warn('[ControlPanel] 面板已存在，跳过创建');
            return;
        }

        try {
            // 创建面板容器
            this.element = document.createElement('div');
            this.element.id = 'scrollbar-control-panel';

            // 设置面板的CSS样式
            this.element.style.cssText = `
                position: fixed !important;
                bottom: 45px !important;
                right: 20px !important;
                width: 280px !important;
                min-width: 280px !important;
                max-width: 320px !important;
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
                -webkit-backdrop-filter: blur(10px) !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                z-index: 999998 !important;
                display: none !important;
                opacity: 0 !important;
                transform: translateY(10px) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                font-size: 14px !important;
                line-height: 1.4 !important;
                overflow: visible !important;
                box-sizing: border-box !important;
            `;

            // 创建面板内容
            this.createPanelContent();

            // 将面板添加到页面
            document.body.appendChild(this.element);

            this.isCreated = true;
            console.log('[ControlPanel] 控制面板已创建');

            // 发送创建完成事件
            this.eventBus.emit('ui:panel-created');
        } catch (error) {
            console.error('[ControlPanel] 创建控制面板失败:', error);
            throw error;
        }
    }

    /**
     * 创建面板内容
     */
    createPanelContent() {
        if (!this.element) {
            return;
        }

        try {
            // 创建标题
            const title = document.createElement('div');
            title.style.cssText = `
                padding: 16px 16px 8px 16px !important;
                font-weight: 600 !important;
                color: #374151 !important;
                font-size: 16px !important;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1) !important;
                margin-bottom: 8px !important;
            `;
            title.textContent = '滚动条控制';

            // 创建选项容器
            const optionsContainer = document.createElement('div');
            optionsContainer.id = 'scrollbar-options-container';
            optionsContainer.style.cssText = `
                padding: 8px 16px 16px 16px !important;
                overflow: visible !important;
                box-sizing: border-box !important;
                width: 100% !important;
            `;

            // 创建模式选项按钮
            this.modeOptions.forEach(option => {
                const button = this.createOptionButton(option);
                optionsContainer.appendChild(button);
            });

            // 创建自动滚动控制区域
            const autoScrollSection = this.createAutoScrollSection();
            optionsContainer.appendChild(autoScrollSection);

            // 将内容添加到面板
            this.element.appendChild(title);
            this.element.appendChild(optionsContainer);

            console.log('[ControlPanel] 面板内容已创建');
        } catch (error) {
            console.error('[ControlPanel] 创建面板内容失败:', error);
        }
    }

    /**
     * 创建自动滚动控制区域
     * @returns {Element} 自动滚动控制容器
     */
    createAutoScrollSection() {
        const section = document.createElement('div');
        section.className = 'auto-scroll-section';
        section.style.cssText = `
            margin-top: 16px !important;
            padding-top: 16px !important;
            border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
            width: 100% !important;
            box-sizing: border-box !important;
        `;

        // 创建自动滚动标题
        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: 500 !important;
            color: #374151 !important;
            margin-bottom: 12px !important;
            font-size: 14px !important;
        `;
        title.textContent = '自动滚动';

        // 创建开关按钮
        const toggleButton = document.createElement('button');
        toggleButton.id = 'auto-scroll-toggle';
        toggleButton.style.cssText = `
            width: 100% !important;
            padding: 10px 12px !important;
            margin-bottom: 12px !important;
            border: 2px solid #e5e7eb !important;
            border-radius: 6px !important;
            background: #f9fafb !important;
            color: #374151 !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            transition: all 0.2s ease !important;
            box-sizing: border-box !important;
        `;
        toggleButton.textContent = '开始自动滚动';

        // 创建速度控制滑块
        const speedSlider = this.createSliderControl({
            label: '滚动速度',
            min: 1,
            max: 10,
            value: 3,
            step: 1,
            onChange: (value) => {
                this.eventBus.emit('ui:speed-change', { speed: value });
            }
        });

        // 添加开关按钮事件
        let isAutoScrolling = false;
        toggleButton.addEventListener('click', () => {
            isAutoScrolling = !isAutoScrolling;
            
            if (isAutoScrolling) {
                toggleButton.textContent = '停止自动滚动';
                toggleButton.style.background = '#fef3c7';
                toggleButton.style.borderColor = '#f59e0b';
                toggleButton.style.color = '#92400e';
                this.eventBus.emit('ui:auto-scroll-start');
            } else {
                toggleButton.textContent = '开始自动滚动';
                toggleButton.style.background = '#f9fafb';
                toggleButton.style.borderColor = '#e5e7eb';
                toggleButton.style.color = '#374151';
                this.eventBus.emit('ui:auto-scroll-stop');
            }
        });

        // 监听自动滚动状态变化
        this.eventBus.on('auto-scroll:start', () => {
            isAutoScrolling = true;
            toggleButton.textContent = '停止自动滚动';
            toggleButton.style.background = '#fef3c7';
            toggleButton.style.borderColor = '#f59e0b';
            toggleButton.style.color = '#92400e';
        });

        this.eventBus.on('auto-scroll:stop', () => {
            isAutoScrolling = false;
            toggleButton.textContent = '开始自动滚动';
            toggleButton.style.background = '#f9fafb';
            toggleButton.style.borderColor = '#e5e7eb';
            toggleButton.style.color = '#374151';
        });

        // 组装元素
        section.appendChild(title);
        section.appendChild(toggleButton);
        section.appendChild(speedSlider);

        return section;
    }

    /**
     * 创建滑块控件
     * @param {Object} config - 滑块配置 {label, min, max, value, step, onChange}
     * @returns {Element} 滑块容器元素
     */
    createSliderControl(config) {
        const container = document.createElement('div');
        container.className = 'scrollbar-slider-container';
        container.style.cssText = `
            padding: 12px 0 !important;
            margin-bottom: 12px !important;
            width: 100% !important;
            box-sizing: border-box !important;
        `;

        // 创建标签
        const label = document.createElement('div');
        label.style.cssText = `
            font-weight: 500 !important;
            color: #374151 !important;
            margin-bottom: 8px !important;
            font-size: 14px !important;
        `;
        label.textContent = config.label || '滑块控制';

        // 创建滑块容器
        const sliderWrapper = document.createElement('div');
        sliderWrapper.style.cssText = `
            position: relative !important;
            width: 100% !important;
            height: 20px !important;
            display: flex !important;
            align-items: center !important;
        `;

        // 创建滑块输入
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = config.min || 0;
        slider.max = config.max || 100;
        slider.value = config.value || 50;
        slider.step = config.step || 1;
        slider.style.cssText = `
            width: 100% !important;
            height: 4px !important;
            border-radius: 2px !important;
            background: #e5e7eb !important;
            outline: none !important;
            -webkit-appearance: none !important;
            appearance: none !important;
            cursor: pointer !important;
        `;

        // 创建滑块样式
        const style = document.createElement('style');
        style.textContent = `
            input[type="range"]::-webkit-slider-thumb {
                -webkit-appearance: none !important;
                appearance: none !important;
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                background: #8b5cf6 !important;
                cursor: pointer !important;
                box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3) !important;
                transition: all 0.2s ease !important;
            }
            input[type="range"]::-webkit-slider-thumb:hover {
                background: #7c3aed !important;
                transform: scale(1.1) !important;
                box-shadow: 0 4px 8px rgba(139, 92, 246, 0.4) !important;
            }
            input[type="range"]::-moz-range-thumb {
                width: 16px !important;
                height: 16px !important;
                border-radius: 50% !important;
                background: #8b5cf6 !important;
                cursor: pointer !important;
                border: none !important;
                box-shadow: 0 2px 4px rgba(139, 92, 246, 0.3) !important;
            }
        `;
        document.head.appendChild(style);

        // 创建数值显示
        const valueDisplay = document.createElement('div');
        valueDisplay.style.cssText = `
            margin-left: 8px !important;
            font-size: 12px !important;
            color: #6b7280 !important;
            min-width: 30px !important;
            text-align: center !important;
        `;
        valueDisplay.textContent = slider.value;

        // 添加事件监听器
        slider.addEventListener('input', (e) => {
            valueDisplay.textContent = e.target.value;
            if (config.onChange) {
                config.onChange(parseFloat(e.target.value));
            }
        });

        // 组装元素
        sliderWrapper.appendChild(slider);
        sliderWrapper.appendChild(valueDisplay);
        container.appendChild(label);
        container.appendChild(sliderWrapper);

        return container;
    }

    /**
     * 创建选项按钮
     * @param {Object} option - 选项配置
     * @returns {Element} 按钮元素
     */
    createOptionButton(option) {
        const button = document.createElement('div');
        button.className = 'scrollbar-option-button';
        button.dataset.mode = option.value;

        // 设置按钮样式
        button.style.cssText = `
            padding: 12px !important;
            margin-bottom: 8px !important;
            border-radius: 8px !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            border: 2px solid transparent !important;
            background: rgba(0, 0, 0, 0.02) !important;
            width: 100% !important;
            box-sizing: border-box !important;
            overflow: visible !important;
        `;

        // 创建按钮内容
        const label = document.createElement('div');
        label.style.cssText = `
            font-weight: 500 !important;
            color: #374151 !important;
            margin-bottom: 4px !important;
        `;
        label.textContent = option.label;

        const description = document.createElement('div');
        description.style.cssText = `
            font-size: 12px !important;
            color: #6b7280 !important;
            line-height: 1.3 !important;
        `;
        description.textContent = option.description;

        button.appendChild(label);
        button.appendChild(description);

        // 添加事件监听器
        button.addEventListener('click', () => {
            this.handleModeSelect(option.value);
        });

        // 添加悬停效果
        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(139, 92, 246, 0.1)';
            button.style.borderColor = 'rgba(139, 92, 246, 0.2)';
        });

        button.addEventListener('mouseleave', () => {
            if (option.value !== this.currentMode) {
                button.style.background = 'rgba(0, 0, 0, 0.02)';
                button.style.borderColor = 'transparent';
            }
        });

        return button;
    }

    /**
     * 处理模式选择
     * @param {string} mode - 选择的模式
     */
    handleModeSelect(mode) {
        try {
            this.currentMode = mode;

            // 更新按钮状态
            this.updateButtonStates(mode);

            // 发送模式选择事件
            this.eventBus.emit('ui:mode-select', mode);

            console.log('[ControlPanel] 模式已选择:', mode);
        } catch (error) {
            console.error('[ControlPanel] 处理模式选择失败:', error);
        }
    }

    /**
     * 更新按钮状态
     * @param {string} selectedMode - 选中的模式
     */
    updateButtonStates(selectedMode) {
        if (!this.element) {
            return;
        }

        try {
            const buttons = this.element.querySelectorAll('.scrollbar-option-button');

            buttons.forEach(button => {
                const mode = button.dataset.mode;

                if (mode === selectedMode) {
                    // 选中状态
                    button.style.background = 'rgba(139, 92, 246, 0.15)';
                    button.style.borderColor = 'rgba(139, 92, 246, 0.4)';
                    button.style.boxShadow = '0 0 0 1px rgba(139, 92, 246, 0.1)';
                } else {
                    // 未选中状态
                    button.style.background = 'rgba(0, 0, 0, 0.02)';
                    button.style.borderColor = 'transparent';
                    button.style.boxShadow = 'none';
                }
            });

            console.log('[ControlPanel] 按钮状态已更新');
        } catch (error) {
            console.error('[ControlPanel] 更新按钮状态失败:', error);
        }
    }

    /**
     * 显示控制面板
     */
    show() {
        if (!this.element) {
            console.warn('[ControlPanel] 元素不存在，无法显示');
            return;
        }

        try {
            this.element.style.display = 'block';

            // 使用requestAnimationFrame确保动画效果
            requestAnimationFrame(() => {
                this.element.style.opacity = '1';
                this.element.style.transform = 'translateY(0)';
            });

            this.isVisible = true;
            console.log('[ControlPanel] 控制面板已显示');
        } catch (error) {
            console.error('[ControlPanel] 显示控制面板失败:', error);
        }
    }

    /**
     * 隐藏控制面板
     */
    hide() {
        if (!this.element) {
            return;
        }

        try {
            this.element.style.opacity = '0';
            this.element.style.transform = 'translateY(10px)';

            // 延迟隐藏元素
            setTimeout(() => {
                if (this.element) {
                    this.element.style.display = 'none';
                }
            }, 300);

            this.isVisible = false;
            console.log('[ControlPanel] 控制面板已隐藏');
        } catch (error) {
            console.error('[ControlPanel] 隐藏控制面板失败:', error);
        }
    }

    /**
     * 更新面板状态
     * @param {Object} state - 状态对象
     */
    updateState(state) {
        try {
            if (state.currentMode && state.currentMode !== this.currentMode) {
                this.currentMode = state.currentMode;
                this.updateButtonStates(this.currentMode);
            }

            console.log('[ControlPanel] 状态已更新:', state);
        } catch (error) {
            console.error('[ControlPanel] 更新状态失败:', error);
        }
    }

    /**
     * 检查元素是否包含指定的目标元素
     * @param {Element} target - 目标元素
     * @returns {boolean} 是否包含目标元素
     */
    contains(target) {
        if (!this.element || !target) {
            return false;
        }

        try {
            // 使用contains方法或降级到直接比较
            if (this.element.contains) {
                return this.element.contains(target);
            } else {
                return this.element === target;
            }
        } catch (error) {
            console.error('[ControlPanel] 检查包含关系失败:', error);
            return false;
        }
    }

    /**
     * 获取面板元素
     * @returns {Element|null} 面板DOM元素
     */
    getElement() {
        return this.element;
    }

    /**
     * 检查面板是否已创建
     * @returns {boolean} 是否已创建
     */
    isElementCreated() {
        return this.isCreated && this.element !== null;
    }

    /**
     * 检查面板是否可见
     * @returns {boolean} 是否可见
     */
    isPanelVisible() {
        return this.isVisible;
    }

    /**
     * 获取当前模式
     * @returns {string} 当前模式
     */
    getCurrentMode() {
        return this.currentMode;
    }

    /**
     * 销毁控制面板
     */
    destroy() {
        try {
            // 移除所有事件监听器
            if (this.element) {
                const buttons = this.element.querySelectorAll('.scrollbar-option-button');
                buttons.forEach(button => {
                    // 移除事件监听器（通过克隆元素的方式）
                    const newButton = button.cloneNode(true);
                    button.parentNode.replaceChild(newButton, button);
                });

                // 从DOM中移除元素
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }

            // 重置状态
            this.element = null;
            this.isCreated = false;
            this.isVisible = false;

            console.log('[ControlPanel] 控制面板已销毁');

            // 发送销毁事件
            this.eventBus.emit('ui:panel-destroyed');
        } catch (error) {
            console.error('[ControlPanel] 销毁控制面板失败:', error);
        }
    }
}
