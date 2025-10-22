import { ScrollbarModes } from '../utils/constants.js';

/**
 * ScrollDetector - 检测滚动事件并触发相应的样式变化
 *
 * 专门用于semi模式，检测用户滚动行为并通过事件系统
 * 与StyleManager通信，实现滚动时显示、停止后隐藏的效果
 */
export class ScrollDetector {
    constructor(eventBus, styleManager = null) {
        this.eventBus = eventBus;
        this.styleManager = styleManager;
        this.isScrolling = false;
        this.scrollTimeout = null;
        this.scrollHandler = null;
        this.isDetectionActive = false;

        // 配置参数
        this.scrollEndDelay = 1000; // 滚动结束后延迟隐藏的时间（毫秒）

        console.log('[ScrollDetector] 滚动检测器已创建');
    }

    /**
     * 开始滚动检测
     */
    startDetection() {
        if (this.isDetectionActive) {
            return; // 避免重复启动
        }

        try {
            // 创建滚动事件处理函数
            this.scrollHandler = this.createScrollHandler();

            // 添加滚动事件监听器
            window.addEventListener('scroll', this.scrollHandler, { passive: true });

            this.isDetectionActive = true;
            console.log('[ScrollDetector] 滚动检测已启动');

            // 发送检测启动事件
            this.eventBus.emit('scroll-detector:started', {
                timestamp: Date.now(),
                scrollEndDelay: this.scrollEndDelay
            });
        } catch (error) {
            console.error('[ScrollDetector] 启动滚动检测失败:', error);
            this.eventBus.emit('scroll-detector:error', { error, phase: 'start-detection' });
        }
    }

    /**
     * 停止滚动检测
     */
    stopDetection() {
        if (!this.isDetectionActive) {
            return;
        }

        try {
            // 移除滚动事件监听器
            if (this.scrollHandler) {
                window.removeEventListener('scroll', this.scrollHandler);
                this.scrollHandler = null;
            }

            // 清除滚动超时
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
                this.scrollTimeout = null;
            }

            // 重置状态
            this.isScrolling = false;
            this.isDetectionActive = false;

            console.log('[ScrollDetector] 滚动检测已停止');

            // 发送检测停止事件
            this.eventBus.emit('scroll-detector:stopped', {
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('[ScrollDetector] 停止滚动检测失败:', error);
            this.eventBus.emit('scroll-detector:error', { error, phase: 'stop-detection' });
        }
    }

    /**
     * 创建滚动事件处理函数
     * @returns {Function} 滚动事件处理函数
     */
    createScrollHandler() {
        return () => {
            try {
                // 如果不是滚动状态，触发滚动开始
                if (!this.isScrolling) {
                    this.onScrollStart();
                }

                // 清除之前的超时
                if (this.scrollTimeout) {
                    clearTimeout(this.scrollTimeout);
                }

                // 设置新的超时来检测滚动结束
                this.scrollTimeout = setTimeout(() => {
                    this.onScrollEnd();
                }, this.scrollEndDelay);
            } catch (error) {
                console.error('[ScrollDetector] 滚动事件处理失败:', error);
                this.eventBus.emit('scroll-detector:error', { error, phase: 'scroll-handling' });
            }
        };
    }

    /**
     * 滚动开始事件处理
     */
    onScrollStart() {
        if (this.isScrolling) {
            return; // 已经在滚动状态
        }

        try {
            this.isScrolling = true;

            // 发送滚动开始事件
            this.eventBus.emit('scroll:start', {
                timestamp: Date.now(),
                scrollPosition: window.pageYOffset || document.documentElement.scrollTop
            });

            // 通知StyleManager显示滚动条（仅在semi模式下）
            if (
                this.styleManager &&
                this.styleManager.getCurrentMode() === ScrollbarModes.SEMI &&
                typeof this.styleManager.showScrollbarForSemi === 'function'
            ) {
                const success = this.styleManager.showScrollbarForSemi();
                if (success) {
                    console.log('[ScrollDetector] 滚动开始 - 滚动条已显示');
                }
            } else {
                // 通过事件系统通知显示滚动条
                this.eventBus.emit('scroll-detector:show-scrollbar', {
                    reason: 'scroll-start',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('[ScrollDetector] 滚动开始处理失败:', error);
            this.eventBus.emit('scroll-detector:error', { error, phase: 'scroll-start' });
        }
    }

    /**
     * 滚动结束事件处理
     */
    onScrollEnd() {
        if (!this.isScrolling) {
            return; // 不在滚动状态
        }

        try {
            this.isScrolling = false;

            // 清除超时
            if (this.scrollTimeout) {
                clearTimeout(this.scrollTimeout);
                this.scrollTimeout = null;
            }

            // 发送滚动结束事件
            this.eventBus.emit('scroll:end', {
                timestamp: Date.now(),
                scrollPosition: window.pageYOffset || document.documentElement.scrollTop,
                delay: this.scrollEndDelay
            });

            // 通知StyleManager隐藏滚动条（仅在semi模式下）
            if (
                this.styleManager &&
                this.styleManager.getCurrentMode() === ScrollbarModes.SEMI &&
                typeof this.styleManager.hideScrollbarForSemi === 'function'
            ) {
                const success = this.styleManager.hideScrollbarForSemi();
                if (success) {
                    console.log('[ScrollDetector] 滚动结束 - 滚动条已隐藏');
                }
            } else {
                // 通过事件系统通知隐藏滚动条
                this.eventBus.emit('scroll-detector:hide-scrollbar', {
                    reason: 'scroll-end',
                    timestamp: Date.now(),
                    delay: this.scrollEndDelay
                });
            }
        } catch (error) {
            console.error('[ScrollDetector] 滚动结束处理失败:', error);
            this.eventBus.emit('scroll-detector:error', { error, phase: 'scroll-end' });
        }
    }

    /**
     * 检查是否正在滚动
     * @returns {boolean} 滚动状态
     */
    isCurrentlyScrolling() {
        return this.isScrolling;
    }

    /**
     * 检查检测是否激活
     * @returns {boolean} 检测状态
     */
    isActive() {
        return this.isDetectionActive;
    }

    /**
     * 设置滚动结束延迟时间
     * @param {number} delay - 延迟时间（毫秒）
     */
    setScrollEndDelay(delay) {
        if (typeof delay === 'number' && delay > 0) {
            const previousDelay = this.scrollEndDelay;
            this.scrollEndDelay = delay;
            console.log('[ScrollDetector] 滚动结束延迟已设置为:', delay, 'ms');

            // 发送延迟时间变更事件
            this.eventBus.emit('scroll-detector:delay-changed', {
                previousDelay,
                newDelay: delay,
                timestamp: Date.now()
            });
        } else {
            console.warn('[ScrollDetector] 无效的延迟时间:', delay);
        }
    }

    /**
     * 获取滚动结束延迟时间
     * @returns {number} 延迟时间（毫秒）
     */
    getScrollEndDelay() {
        return this.scrollEndDelay;
    }

    /**
     * 设置StyleManager引用
     * @param {StyleManager} styleManager - StyleManager实例
     */
    setStyleManager(styleManager) {
        this.styleManager = styleManager;
        console.log('[ScrollDetector] StyleManager引用已设置');
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus() {
        return {
            isScrolling: this.isScrolling,
            isDetectionActive: this.isDetectionActive,
            scrollEndDelay: this.scrollEndDelay,
            hasStyleManager: !!this.styleManager,
            timestamp: Date.now()
        };
    }

    /**
     * 手动触发滚动开始（用于测试或特殊情况）
     */
    triggerScrollStart() {
        if (!this.isDetectionActive) {
            console.warn('[ScrollDetector] 检测未激活，无法手动触发滚动开始');
            return false;
        }

        try {
            this.onScrollStart();
            console.log('[ScrollDetector] 手动触发滚动开始');
            return true;
        } catch (error) {
            console.error('[ScrollDetector] 手动触发滚动开始失败:', error);
            return false;
        }
    }

    /**
     * 手动触发滚动结束（用于测试或特殊情况）
     */
    triggerScrollEnd() {
        if (!this.isDetectionActive) {
            console.warn('[ScrollDetector] 检测未激活，无法手动触发滚动结束');
            return false;
        }

        try {
            this.onScrollEnd();
            console.log('[ScrollDetector] 手动触发滚动结束');
            return true;
        } catch (error) {
            console.error('[ScrollDetector] 手动触发滚动结束失败:', error);
            return false;
        }
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            // 停止检测
            this.stopDetection();

            // 清理引用
            this.styleManager = null;

            // 发送清理完成事件
            this.eventBus.emit('scroll-detector:cleanup', {
                timestamp: Date.now()
            });

            console.log('[ScrollDetector] 资源清理完成');
        } catch (error) {
            console.error('[ScrollDetector] 清理过程中发生错误:', error);
            this.eventBus.emit('scroll-detector:error', { error, phase: 'cleanup' });
        }
    }
}
