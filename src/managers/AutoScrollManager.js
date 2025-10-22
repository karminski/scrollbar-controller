/**
 * AutoScrollManager - 负责管理自动滚动的核心逻辑，包括速度控制和平滑滚动
 *
 * 提供自动滚动功能，支持：
 * - 可配置的滚动速度（1-10级）
 * - 平滑滚动动画
 * - 页面边界检测
 * - 事件系统集成
 */
export class AutoScrollManager {
    constructor(eventBus) {
        this.eventBus = eventBus;

        // 自动滚动状态
        this.isEnabled = false;
        this.isScrolling = false;
        this.animationId = null;

        // 滚动速度配置
        this.speed = 3; // 默认速度 (1-10)
        this.minSpeed = 1;
        this.maxSpeed = 10;

        // 滚动动画配置
        this.frameRate = 60; // 目标帧率
        this.scrollStep = 1; // 基础滚动步长

        // 页面边界检测
        this.lastScrollPosition = 0;
        this.stuckCounter = 0;
        this.maxStuckFrames = 10; // 连续10帧位置不变则认为到达底部

        console.log('[AutoScrollManager] 自动滚动管理器已创建');
    }

    /**
     * 启用自动滚动功能
     * @returns {boolean} 是否成功启用
     */
    enable() {
        try {
            if (this.isEnabled) {
                console.log('[AutoScrollManager] 自动滚动功能已启用');
                return true;
            }

            this.isEnabled = true;
            console.log('[AutoScrollManager] 自动滚动功能已启用');

            // 发送启用事件
            this.eventBus.emit('auto-scroll:enabled', {
                timestamp: Date.now(),
                speed: this.speed
            });

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 启用自动滚动功能失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'enable' });
            return false;
        }
    }

    /**
     * 禁用自动滚动功能
     * @returns {boolean} 是否成功禁用
     */
    disable() {
        try {
            if (!this.isEnabled) {
                console.log('[AutoScrollManager] 自动滚动功能已禁用');
                return true;
            }

            // 如果正在滚动，先停止滚动
            if (this.isScrolling) {
                this.stopAutoScroll();
            }

            this.isEnabled = false;
            console.log('[AutoScrollManager] 自动滚动功能已禁用');

            // 发送禁用事件
            this.eventBus.emit('auto-scroll:disabled', {
                timestamp: Date.now()
            });

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 禁用自动滚动功能失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'disable' });
            return false;
        }
    }

    /**
     * 检查自动滚动功能是否启用
     * @returns {boolean} 是否启用
     */
    isAutoScrollEnabled() {
        return this.isEnabled;
    }

    /**
     * 检查是否正在自动滚动
     * @returns {boolean} 是否正在滚动
     */
    isAutoScrolling() {
        return this.isScrolling;
    }

    /**
     * 获取当前滚动状态信息
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            scrolling: this.isScrolling,
            speed: this.speed,
            currentPosition: window.scrollY,
            maxPosition: Math.max(0, document.body.scrollHeight - window.innerHeight)
        };
    }

    /**
     * 开始自动滚动
     * @returns {boolean} 是否成功开始滚动
     */
    startAutoScroll() {
        try {
            // 检查是否启用了自动滚动功能
            if (!this.isEnabled) {
                console.warn('[AutoScrollManager] 自动滚动功能未启用，无法开始滚动');
                return false;
            }

            // 检查是否已经在滚动
            if (this.isScrolling) {
                console.log('[AutoScrollManager] 自动滚动已在进行中');
                return true;
            }

            // 检查是否已到达页面底部
            if (this.isAtBottom()) {
                console.log('[AutoScrollManager] 已到达页面底部，无法开始滚动');
                this.eventBus.emit('auto-scroll:reached-bottom', {
                    timestamp: Date.now(),
                    position: window.scrollY
                });
                return false;
            }

            // 开始滚动
            this.isScrolling = true;
            this.lastScrollPosition = window.scrollY;
            this.stuckCounter = 0;

            // 启动滚动动画
            this.startScrollAnimation();

            console.log('[AutoScrollManager] 自动滚动已开始，速度:', this.speed);

            // 发送开始滚动事件
            this.eventBus.emit('auto-scroll:started', {
                timestamp: Date.now(),
                speed: this.speed,
                startPosition: this.lastScrollPosition
            });

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 开始自动滚动失败:', error);
            this.isScrolling = false;
            this.eventBus.emit('auto-scroll:error', { error, phase: 'start' });
            return false;
        }
    }

    /**
     * 停止自动滚动
     * @returns {boolean} 是否成功停止滚动
     */
    stopAutoScroll() {
        try {
            if (!this.isScrolling) {
                console.log('[AutoScrollManager] 自动滚动未在进行中');
                return true;
            }

            // 停止动画
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }

            // 重置状态
            const finalPosition = window.scrollY;
            this.isScrolling = false;
            this.stuckCounter = 0;

            console.log('[AutoScrollManager] 自动滚动已停止');

            // 发送停止滚动事件
            this.eventBus.emit('auto-scroll:stopped', {
                timestamp: Date.now(),
                finalPosition,
                reason: 'manual'
            });

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 停止自动滚动失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'stop' });
            return false;
        }
    }

    /**
     * 启动滚动动画循环
     */
    startScrollAnimation() {
        const animate = () => {
            try {
                // 检查是否应该继续滚动
                if (!this.isScrolling || !this.isEnabled) {
                    return;
                }

                // 执行滚动步骤
                const shouldContinue = this.performScrollStep();

                // 如果应该继续滚动，请求下一帧
                if (shouldContinue) {
                    this.animationId = requestAnimationFrame(animate);
                } else {
                    // 自动停止滚动
                    this.stopAutoScrollWithReason('reached-end');
                }
            } catch (error) {
                console.error('[AutoScrollManager] 滚动动画异常:', error);
                this.eventBus.emit('auto-scroll:error', { error, phase: 'animation' });
                this.stopAutoScrollWithReason('error');
            }
        };

        // 开始动画循环
        this.animationId = requestAnimationFrame(animate);
    }

    /**
     * 停止自动滚动并指定原因
     * @param {string} reason - 停止原因
     */
    stopAutoScrollWithReason(reason) {
        if (!this.isScrolling) {
            return;
        }

        // 停止动画
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // 重置状态
        const finalPosition = window.scrollY;
        this.isScrolling = false;
        this.stuckCounter = 0;

        console.log('[AutoScrollManager] 自动滚动已停止，原因:', reason);

        // 发送停止滚动事件
        this.eventBus.emit('auto-scroll:stopped', {
            timestamp: Date.now(),
            finalPosition,
            reason
        });
    }

    /**
     * 执行单次滚动步骤
     * @returns {boolean} 是否应该继续滚动
     */
    performScrollStep() {
        try {
            // 计算当前滚动位置
            const currentPosition = window.scrollY;

            // 计算滚动距离
            const scrollDistance = this.calculateScrollDistance();

            // 执行滚动
            window.scrollBy(0, scrollDistance);

            // 检查是否到达底部或卡住
            const newPosition = window.scrollY;

            // 检查是否卡住（位置没有变化）
            if (Math.abs(newPosition - this.lastScrollPosition) < 1) {
                this.stuckCounter++;
                if (this.stuckCounter >= this.maxStuckFrames) {
                    console.log('[AutoScrollManager] 检测到滚动卡住，可能已到达页面底部');
                    this.eventBus.emit('auto-scroll:stuck', {
                        timestamp: Date.now(),
                        position: newPosition,
                        stuckFrames: this.stuckCounter
                    });
                    return false;
                }
            } else {
                this.stuckCounter = 0;
            }

            // 更新最后位置
            this.lastScrollPosition = newPosition;

            // 发送滚动进度事件
            this.eventBus.emit('auto-scroll:progress', {
                timestamp: Date.now(),
                position: newPosition,
                distance: scrollDistance,
                speed: this.speed
            });

            // 检查是否到达页面底部
            if (this.isAtBottom()) {
                console.log('[AutoScrollManager] 已到达页面底部，停止滚动');
                this.eventBus.emit('auto-scroll:reached-bottom', {
                    timestamp: Date.now(),
                    position: newPosition
                });
                return false;
            }

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 执行滚动步骤失败:', error);
            return false;
        }
    }

    /**
     * 计算滚动距离
     * @returns {number} 滚动距离（像素）
     */
    calculateScrollDistance() {
        try {
            // 基于速度和帧率计算滚动距离
            // 速度1-10映射到每帧1-10像素
            const baseDistance = this.speed * this.scrollStep;

            // 可以根据需要添加更复杂的计算逻辑
            // 例如：根据页面高度、当前位置等调整滚动距离

            return baseDistance;
        } catch (error) {
            console.error('[AutoScrollManager] 计算滚动距离失败:', error);
            return this.scrollStep; // 返回默认值
        }
    }

    /**
     * 检查是否到达页面底部
     * @returns {boolean} 是否到达底部
     */
    isAtBottom() {
        try {
            const windowHeight = window.innerHeight;
            const documentHeight = Math.max(
                document.body.scrollHeight,
                document.body.offsetHeight,
                document.documentElement.clientHeight,
                document.documentElement.scrollHeight,
                document.documentElement.offsetHeight
            );
            const scrollTop = window.scrollY;

            // 允许一些误差（5像素）
            const tolerance = 5;
            return scrollTop + windowHeight >= documentHeight - tolerance;
        } catch (error) {
            console.error('[AutoScrollManager] 检查页面底部失败:', error);
            return false;
        }
    }

    /**
     * 设置滚动速度
     * @param {number} speed - 滚动速度 (1-10)
     * @returns {boolean} 是否成功设置速度
     */
    setSpeed(speed) {
        try {
            // 验证速度范围
            if (!this.validateSpeed(speed)) {
                console.warn('[AutoScrollManager] 无效的滚动速度:', speed);
                return false;
            }

            const oldSpeed = this.speed;
            this.speed = speed;

            console.log(`[AutoScrollManager] 滚动速度已更新: ${oldSpeed} -> ${speed}`);

            // 发送速度变更事件
            this.eventBus.emit('auto-scroll:speed-changed', {
                timestamp: Date.now(),
                previousSpeed: oldSpeed,
                newSpeed: speed,
                isScrolling: this.isScrolling
            });

            // 如果正在滚动，速度变化会在下一帧生效
            if (this.isScrolling) {
                console.log('[AutoScrollManager] 滚动速度将在下一帧生效');
            }

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 设置滚动速度失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'set-speed', speed });
            return false;
        }
    }

    /**
     * 获取当前滚动速度
     * @returns {number} 当前滚动速度
     */
    getSpeed() {
        return this.speed;
    }

    /**
     * 获取速度范围
     * @returns {Object} 速度范围信息
     */
    getSpeedRange() {
        return {
            min: this.minSpeed,
            max: this.maxSpeed,
            current: this.speed,
            default: 3
        };
    }

    /**
     * 验证速度值是否有效
     * @param {number} speed - 要验证的速度值
     * @returns {boolean} 速度值是否有效
     */
    validateSpeed(speed) {
        try {
            // 检查是否为数字
            if (typeof speed !== 'number' || isNaN(speed)) {
                return false;
            }

            // 检查是否为有限数
            if (!isFinite(speed)) {
                return false;
            }

            // 检查是否在有效范围内
            if (speed < this.minSpeed || speed > this.maxSpeed) {
                return false;
            }

            return true;
        } catch (error) {
            console.error('[AutoScrollManager] 验证速度值失败:', error);
            return false;
        }
    }

    /**
     * 增加滚动速度
     * @param {number} increment - 增加的速度值，默认为1
     * @returns {boolean} 是否成功增加速度
     */
    increaseSpeed(increment = 1) {
        try {
            const newSpeed = Math.min(this.speed + increment, this.maxSpeed);
            return this.setSpeed(newSpeed);
        } catch (error) {
            console.error('[AutoScrollManager] 增加滚动速度失败:', error);
            return false;
        }
    }

    /**
     * 减少滚动速度
     * @param {number} decrement - 减少的速度值，默认为1
     * @returns {boolean} 是否成功减少速度
     */
    decreaseSpeed(decrement = 1) {
        try {
            const newSpeed = Math.max(this.speed - decrement, this.minSpeed);
            return this.setSpeed(newSpeed);
        } catch (error) {
            console.error('[AutoScrollManager] 减少滚动速度失败:', error);
            return false;
        }
    }

    /**
     * 重置速度到默认值
     * @returns {boolean} 是否成功重置速度
     */
    resetSpeed() {
        try {
            return this.setSpeed(3); // 默认速度为3
        } catch (error) {
            console.error('[AutoScrollManager] 重置滚动速度失败:', error);
            return false;
        }
    }

    /**
     * 批量设置滚动配置
     * @param {Object} config - 配置对象
     * @param {number} config.speed - 滚动速度
     * @param {number} config.scrollStep - 滚动步长
     * @param {number} config.maxStuckFrames - 最大卡住帧数
     * @returns {boolean} 是否成功设置配置
     */
    setConfig(config) {
        try {
            let hasChanges = false;
            const changes = {};

            // 设置速度
            if (config.speed !== undefined && this.validateSpeed(config.speed)) {
                changes.speed = { old: this.speed, new: config.speed };
                this.speed = config.speed;
                hasChanges = true;
            }

            // 设置滚动步长
            if (
                config.scrollStep !== undefined &&
                typeof config.scrollStep === 'number' &&
                config.scrollStep > 0
            ) {
                changes.scrollStep = { old: this.scrollStep, new: config.scrollStep };
                this.scrollStep = config.scrollStep;
                hasChanges = true;
            }

            // 设置最大卡住帧数
            if (
                config.maxStuckFrames !== undefined &&
                typeof config.maxStuckFrames === 'number' &&
                config.maxStuckFrames > 0
            ) {
                changes.maxStuckFrames = { old: this.maxStuckFrames, new: config.maxStuckFrames };
                this.maxStuckFrames = config.maxStuckFrames;
                hasChanges = true;
            }

            if (hasChanges) {
                console.log('[AutoScrollManager] 配置已更新:', config);
                this.eventBus.emit('auto-scroll:config-changed', {
                    timestamp: Date.now(),
                    changes
                });
            }

            return hasChanges;
        } catch (error) {
            console.error('[AutoScrollManager] 设置配置失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'set-config', config });
            return false;
        }
    }

    /**
     * 获取当前配置
     * @returns {Object} 当前配置信息
     */
    getConfig() {
        return {
            speed: this.speed,
            minSpeed: this.minSpeed,
            maxSpeed: this.maxSpeed,
            scrollStep: this.scrollStep,
            frameRate: this.frameRate,
            maxStuckFrames: this.maxStuckFrames,
            enabled: this.isEnabled,
            scrolling: this.isScrolling
        };
    }

    /**
     * 清理资源
     */
    cleanup() {
        try {
            console.log('[AutoScrollManager] 开始清理资源...');

            // 停止自动滚动
            this.stopAutoScroll();

            // 重置状态
            this.isEnabled = false;
            this.isScrolling = false;
            this.animationId = null;
            this.lastScrollPosition = 0;
            this.stuckCounter = 0;

            // 发送清理完成事件
            this.eventBus.emit('auto-scroll:cleanup', {
                timestamp: Date.now()
            });

            console.log('[AutoScrollManager] 资源清理完成');
        } catch (error) {
            console.error('[AutoScrollManager] 清理资源失败:', error);
            this.eventBus.emit('auto-scroll:error', { error, phase: 'cleanup' });
        }
    }
}
