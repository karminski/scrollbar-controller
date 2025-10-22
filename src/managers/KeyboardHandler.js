/**
 * KeyboardHandler - 键盘事件处理类，负责处理自动滚动相关的键盘快捷键
 *
 * 支持的快捷键：
 * - Ctrl+ArrowDown: 启动自动滚动
 * - Space: 停止自动滚动
 *
 * 通过事件系统与AutoScrollManager通信
 */
export class KeyboardHandler {
    constructor(eventBus, autoScrollManager = null) {
        this.eventBus = eventBus;
        this.autoScrollManager = autoScrollManager;

        // 事件处理状态
        this.isEnabled = false;
        this.isListening = false;

        // 事件处理器引用
        this.keydownHandler = null;
        this.keyupHandler = null;

        // 键盘状态跟踪
        this.pressedKeys = new Set();
        this.isCtrlPressed = false;

        // 输入框检测
        this.inputElements = ['input', 'textarea', 'select'];

        console.log('[KeyboardHandler] 键盘事件处理器已创建');
    }

    /**
     * 启用键盘事件处理
     * @returns {boolean} 是否成功启用
     */
    enable() {
        try {
            if (this.isEnabled) {
                console.log('[KeyboardHandler] 键盘事件处理已启用');
                return true;
            }

            this.isEnabled = true;

            // 如果还没有绑定事件，则绑定事件
            if (!this.isListening) {
                this.bindEvents();
            }

            console.log('[KeyboardHandler] 键盘事件处理已启用');

            // 发送启用事件
            this.eventBus.emit('keyboard-handler:enabled', {
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[KeyboardHandler] 启用键盘事件处理失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'enable' });
            return false;
        }
    }

    /**
     * 禁用键盘事件处理
     * @returns {boolean} 是否成功禁用
     */
    disable() {
        try {
            if (!this.isEnabled) {
                console.log('[KeyboardHandler] 键盘事件处理已禁用');
                return true;
            }

            this.isEnabled = false;

            // 清理键盘状态
            this.pressedKeys.clear();
            this.isCtrlPressed = false;

            console.log('[KeyboardHandler] 键盘事件处理已禁用');

            // 发送禁用事件
            this.eventBus.emit('keyboard-handler:disabled', {
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[KeyboardHandler] 禁用键盘事件处理失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'disable' });
            return false;
        }
    }

    /**
     * 绑定键盘事件监听器
     * @returns {boolean} 是否成功绑定事件
     */
    bindEvents() {
        try {
            if (this.isListening) {
                console.log('[KeyboardHandler] 键盘事件已绑定');
                return true;
            }

            // 创建事件处理器
            this.keydownHandler = event => this.handleKeyDown(event);
            this.keyupHandler = event => this.handleKeyUp(event);

            // 绑定事件监听器
            document.addEventListener('keydown', this.keydownHandler, true);
            document.addEventListener('keyup', this.keyupHandler, true);

            this.isListening = true;
            console.log('[KeyboardHandler] 键盘事件监听器已绑定');

            // 发送事件绑定完成事件
            this.eventBus.emit('keyboard-handler:events-bound', {
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[KeyboardHandler] 绑定键盘事件失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'bind-events' });
            return false;
        }
    }

    /**
     * 解绑键盘事件监听器
     * @returns {boolean} 是否成功解绑事件
     */
    unbindEvents() {
        try {
            if (!this.isListening) {
                console.log('[KeyboardHandler] 键盘事件未绑定');
                return true;
            }

            // 移除事件监听器
            if (this.keydownHandler) {
                document.removeEventListener('keydown', this.keydownHandler, true);
                this.keydownHandler = null;
            }

            if (this.keyupHandler) {
                document.removeEventListener('keyup', this.keyupHandler, true);
                this.keyupHandler = null;
            }

            this.isListening = false;

            // 清理键盘状态
            this.pressedKeys.clear();
            this.isCtrlPressed = false;

            console.log('[KeyboardHandler] 键盘事件监听器已解绑');

            // 发送事件解绑完成事件
            this.eventBus.emit('keyboard-handler:events-unbound', {
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[KeyboardHandler] 解绑键盘事件失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'unbind-events' });
            return false;
        }
    }

    /**
     * 检查键盘事件处理是否启用
     * @returns {boolean} 是否启用
     */
    isKeyboardHandlerEnabled() {
        return this.isEnabled;
    }

    /**
     * 检查是否正在监听键盘事件
     * @returns {boolean} 是否正在监听
     */
    isEventListening() {
        return this.isListening;
    }

    /**
     * 获取当前状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            listening: this.isListening,
            pressedKeys: Array.from(this.pressedKeys),
            ctrlPressed: this.isCtrlPressed,
            autoScrollEnabled: this.autoScrollManager
                ? this.autoScrollManager.isAutoScrollEnabled()
                : false,
            autoScrolling: this.autoScrollManager ? this.autoScrollManager.isAutoScrolling() : false
        };
    }

    /**
     * 处理keydown事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleKeyDown(event) {
        try {
            // 如果键盘处理未启用，直接返回
            if (!this.isEnabled) {
                return;
            }

            // 检查是否在输入框中
            if (this.isInInputElement(event.target)) {
                return;
            }

            // 记录按下的键
            const key = event.key || event.code;
            this.pressedKeys.add(key);

            // 更新Ctrl键状态
            if (event.ctrlKey || event.metaKey) {
                this.isCtrlPressed = true;
            }

            // 发送按键事件
            this.eventBus.emit('keyboard-handler:key-down', {
                key,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                target: event.target.tagName,
                timestamp: Date.now()
            });

            // 检查Ctrl+ArrowDown组合键
            if (this.isCtrlArrowDownPressed(event)) {
                this.handleCtrlArrowDown(event);
            }

            // 检查空格键
            if (this.isSpacePressed(event)) {
                this.handleSpace(event);
            }
        } catch (error) {
            console.error('[KeyboardHandler] 处理keydown事件失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'key-down', event });
        }
    }

    /**
     * 处理keyup事件
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleKeyUp(event) {
        try {
            // 如果键盘处理未启用，直接返回
            if (!this.isEnabled) {
                return;
            }

            // 移除释放的键
            const key = event.key || event.code;
            this.pressedKeys.delete(key);

            // 更新Ctrl键状态
            if (!event.ctrlKey && !event.metaKey) {
                this.isCtrlPressed = false;
            }

            // 发送按键释放事件
            this.eventBus.emit('keyboard-handler:key-up', {
                key,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                target: event.target.tagName,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[KeyboardHandler] 处理keyup事件失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'key-up', event });
        }
    }

    /**
     * 检查是否按下了Ctrl+ArrowDown组合键
     * @param {KeyboardEvent} event - 键盘事件对象
     * @returns {boolean} 是否按下了Ctrl+ArrowDown
     */
    isCtrlArrowDownPressed(event) {
        try {
            // 检查Ctrl键（包括Mac的Cmd键）
            const isCtrlPressed = event.ctrlKey || event.metaKey;

            // 检查向下箭头键
            const isArrowDownPressed =
                event.key === 'ArrowDown' || event.code === 'ArrowDown' || event.keyCode === 40;

            return isCtrlPressed && isArrowDownPressed;
        } catch (error) {
            console.error('[KeyboardHandler] 检查Ctrl+ArrowDown组合键失败:', error);
            return false;
        }
    }

    /**
     * 处理Ctrl+ArrowDown组合键
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleCtrlArrowDown(event) {
        try {
            console.log('[KeyboardHandler] 检测到Ctrl+ArrowDown组合键');

            // 发送组合键检测事件
            this.eventBus.emit('keyboard-handler:ctrl-arrow-down', {
                timestamp: Date.now(),
                event: {
                    ctrlKey: event.ctrlKey,
                    metaKey: event.metaKey,
                    key: event.key
                }
            });

            // 检查自动滚动管理器是否存在
            if (!this.autoScrollManager) {
                console.warn(
                    '[KeyboardHandler] AutoScrollManager不存在，通过事件系统请求启动自动滚动'
                );
                this.eventBus.emit('keyboard-handler:request-auto-scroll-start', {
                    reason: 'ctrl-arrow-down',
                    timestamp: Date.now()
                });
                return;
            }

            // 检查自动滚动功能是否启用
            if (!this.autoScrollManager.isAutoScrollEnabled()) {
                console.log('[KeyboardHandler] 自动滚动功能未启用，忽略Ctrl+ArrowDown');
                this.eventBus.emit('keyboard-handler:auto-scroll-disabled', {
                    reason: 'ctrl-arrow-down-ignored',
                    timestamp: Date.now()
                });
                return;
            }

            // 阻止默认行为，防止与页面原有快捷键冲突
            event.preventDefault();
            event.stopPropagation();

            // 启动自动滚动
            const success = this.autoScrollManager.startAutoScroll();
            if (success) {
                console.log('[KeyboardHandler] 通过Ctrl+ArrowDown成功启动自动滚动');
                this.eventBus.emit('keyboard-handler:auto-scroll-started', {
                    trigger: 'ctrl-arrow-down',
                    timestamp: Date.now()
                });
            } else {
                console.warn('[KeyboardHandler] 通过Ctrl+ArrowDown启动自动滚动失败');
                this.eventBus.emit('keyboard-handler:auto-scroll-start-failed', {
                    trigger: 'ctrl-arrow-down',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('[KeyboardHandler] 处理Ctrl+ArrowDown失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'ctrl-arrow-down' });
        }
    }

    /**
     * 检查是否按下了空格键
     * @param {KeyboardEvent} event - 键盘事件对象
     * @returns {boolean} 是否按下了空格键
     */
    isSpacePressed(event) {
        try {
            return (
                event.key === ' ' ||
                event.key === 'Space' ||
                event.code === 'Space' ||
                event.keyCode === 32
            );
        } catch (error) {
            console.error('[KeyboardHandler] 检查空格键失败:', error);
            return false;
        }
    }

    /**
     * 处理空格键
     * @param {KeyboardEvent} event - 键盘事件对象
     */
    handleSpace(event) {
        try {
            console.log('[KeyboardHandler] 检测到空格键');

            // 发送空格键检测事件
            this.eventBus.emit('keyboard-handler:space-pressed', {
                timestamp: Date.now(),
                target: event.target.tagName
            });

            // 检查自动滚动管理器是否存在
            if (!this.autoScrollManager) {
                console.warn(
                    '[KeyboardHandler] AutoScrollManager不存在，通过事件系统请求停止自动滚动'
                );
                this.eventBus.emit('keyboard-handler:request-auto-scroll-stop', {
                    reason: 'space-key',
                    timestamp: Date.now()
                });
                return;
            }

            // 检查是否正在自动滚动
            if (!this.autoScrollManager.isAutoScrolling()) {
                console.log('[KeyboardHandler] 自动滚动未在进行中，忽略空格键');
                this.eventBus.emit('keyboard-handler:auto-scroll-not-active', {
                    reason: 'space-key-ignored',
                    timestamp: Date.now()
                });
                return;
            }

            // 阻止空格键的默认行为（页面滚动）
            event.preventDefault();
            event.stopPropagation();

            // 停止自动滚动
            const success = this.autoScrollManager.stopAutoScroll();
            if (success) {
                console.log('[KeyboardHandler] 通过空格键成功停止自动滚动');
                this.eventBus.emit('keyboard-handler:auto-scroll-stopped', {
                    trigger: 'space-key',
                    timestamp: Date.now()
                });
            } else {
                console.warn('[KeyboardHandler] 通过空格键停止自动滚动失败');
                this.eventBus.emit('keyboard-handler:auto-scroll-stop-failed', {
                    trigger: 'space-key',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('[KeyboardHandler] 处理空格键失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'space-key' });
        }
    }

    /**
     * 检查目标元素是否为输入框
     * @param {Element} target - 目标元素
     * @returns {boolean} 是否为输入框
     */
    isInInputElement(target) {
        try {
            if (!target || !target.tagName) {
                return false;
            }

            const tagName = target.tagName.toLowerCase();

            // 检查是否为输入元素
            if (this.inputElements.includes(tagName)) {
                return true;
            }

            // 检查是否为可编辑元素
            if (target.contentEditable === 'true' || target.contentEditable === '') {
                return true;
            }

            // 检查是否在可编辑区域内
            let parent = target.parentElement;
            while (parent) {
                if (parent.contentEditable === 'true' || parent.contentEditable === '') {
                    return true;
                }
                parent = parent.parentElement;
            }

            return false;
        } catch (error) {
            console.error('[KeyboardHandler] 检查输入元素失败:', error);
            return false;
        }
    }

    /**
     * 设置AutoScrollManager引用
     * @param {AutoScrollManager} autoScrollManager - AutoScrollManager实例
     */
    setAutoScrollManager(autoScrollManager) {
        this.autoScrollManager = autoScrollManager;
        console.log('[KeyboardHandler] AutoScrollManager引用已设置');

        // 发送引用设置事件
        this.eventBus.emit('keyboard-handler:auto-scroll-manager-set', {
            timestamp: Date.now(),
            hasManager: !!autoScrollManager
        });
    }

    /**
     * 手动触发Ctrl+ArrowDown处理（用于测试）
     */
    triggerCtrlArrowDown() {
        try {
            const mockEvent = {
                ctrlKey: true,
                metaKey: false,
                key: 'ArrowDown',
                code: 'ArrowDown',
                keyCode: 40,
                target: document.body,
                preventDefault: () => {},
                stopPropagation: () => {}
            };

            this.handleCtrlArrowDown(mockEvent);
            console.log('[KeyboardHandler] 手动触发Ctrl+ArrowDown完成');
        } catch (error) {
            console.error('[KeyboardHandler] 手动触发Ctrl+ArrowDown失败:', error);
        }
    }

    /**
     * 手动触发空格键处理（用于测试）
     */
    triggerSpace() {
        try {
            const mockEvent = {
                key: ' ',
                code: 'Space',
                keyCode: 32,
                target: document.body,
                preventDefault: () => {},
                stopPropagation: () => {}
            };

            this.handleSpace(mockEvent);
            console.log('[KeyboardHandler] 手动触发空格键完成');
        } catch (error) {
            console.error('[KeyboardHandler] 手动触发空格键失败:', error);
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            console.log('[KeyboardHandler] 开始清理资源...');

            // 解绑事件监听器
            this.unbindEvents();

            // 禁用键盘处理
            this.disable();

            // 清理引用
            this.autoScrollManager = null;
            this.keydownHandler = null;
            this.keyupHandler = null;

            // 清理状态
            this.pressedKeys.clear();
            this.isCtrlPressed = false;

            // 发送清理完成事件
            this.eventBus.emit('keyboard-handler:cleanup', {
                timestamp: Date.now()
            });

            console.log('[KeyboardHandler] 资源清理完成');
        } catch (error) {
            console.error('[KeyboardHandler] 清理资源失败:', error);
            this.eventBus.emit('keyboard-handler:error', { error, phase: 'cleanup' });
        }
    }
}
