/**
 * ControlDot - 控制圆点组件
 * 负责创建和管理页面右下角的控制圆点，处理用户点击交互
 */

export class ControlDot {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.element = null;
        this.isCreated = false;

        // 绑定事件处理器
        this.handleClick = this.handleClick.bind(this);
        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);

        console.log('[ControlDot] 已创建');
    }

    /**
     * 创建控制圆点元素
     */
    create() {
        if (this.isCreated || this.element) {
            console.warn('[ControlDot] 圆点已存在，跳过创建');
            return;
        }

        try {
            // 创建圆点元素
            this.element = document.createElement('div');
            this.element.id = 'scrollbar-control-dot';

            // 设置圆点的CSS样式
            this.element.style.cssText = `
                position: fixed !important;
                bottom: 20px !important;
                right: 20px !important;
                width: 20px !important;
                height: 20px !important;
                background: linear-gradient(135deg, #8b5cf6, #a855f7) !important;
                border-radius: 50% !important;
                cursor: pointer !important;
                z-index: 999999 !important;
                box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
                opacity: 0.8 !important;
                transform: scale(1) !important;
                user-select: none !important;
                -webkit-user-select: none !important;
                -moz-user-select: none !important;
                -ms-user-select: none !important;
                border: none !important;
                outline: none !important;
            `;

            // 添加事件监听器
            this.setupEventListeners();

            // 将圆点添加到页面
            document.body.appendChild(this.element);

            this.isCreated = true;
            console.log('[ControlDot] 控制圆点已创建');

            // 发送创建完成事件
            this.eventBus.emit('ui:dot-created');
        } catch (error) {
            console.error('[ControlDot] 创建控制圆点失败:', error);
            throw error;
        }
    }

    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        if (!this.element) {
            return;
        }

        try {
            // 点击事件
            this.element.addEventListener('click', this.handleClick);

            // 鼠标悬停效果
            this.element.addEventListener('mouseenter', this.handleMouseEnter);
            this.element.addEventListener('mouseleave', this.handleMouseLeave);

            console.log('[ControlDot] 事件监听器已设置');
        } catch (error) {
            console.error('[ControlDot] 设置事件监听器失败:', error);
        }
    }

    /**
     * 处理点击事件
     * @param {Event} event - 点击事件
     */
    handleClick(event) {
        try {
            event.preventDefault();
            event.stopPropagation();

            // 发送点击事件
            this.eventBus.emit('ui:dot-click');

            console.log('[ControlDot] 圆点被点击');
        } catch (error) {
            console.error('[ControlDot] 处理点击事件失败:', error);
        }
    }

    /**
     * 处理鼠标进入事件
     */
    handleMouseEnter() {
        if (!this.element) {
            return;
        }

        try {
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1.1)';
            this.element.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.5)';
        } catch (error) {
            console.error('[ControlDot] 处理鼠标进入事件失败:', error);
        }
    }

    /**
     * 处理鼠标离开事件
     */
    handleMouseLeave() {
        if (!this.element) {
            return;
        }

        try {
            this.element.style.opacity = '0.8';
            this.element.style.transform = 'scale(1)';
            this.element.style.boxShadow = '0 2px 8px rgba(139, 92, 246, 0.3)';
        } catch (error) {
            console.error('[ControlDot] 处理鼠标离开事件失败:', error);
        }
    }

    /**
     * 显示圆点
     */
    show() {
        if (!this.element) {
            console.warn('[ControlDot] 元素不存在，无法显示');
            return;
        }

        try {
            this.element.style.display = 'block';
            console.log('[ControlDot] 圆点已显示');
        } catch (error) {
            console.error('[ControlDot] 显示圆点失败:', error);
        }
    }

    /**
     * 隐藏圆点
     */
    hide() {
        if (!this.element) {
            console.warn('[ControlDot] 元素不存在，无法隐藏');
            return;
        }

        try {
            this.element.style.display = 'none';
            console.log('[ControlDot] 圆点已隐藏');
        } catch (error) {
            console.error('[ControlDot] 隐藏圆点失败:', error);
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
            console.error('[ControlDot] 检查包含关系失败:', error);
            return false;
        }
    }

    /**
     * 获取圆点元素
     * @returns {Element|null} 圆点DOM元素
     */
    getElement() {
        return this.element;
    }

    /**
     * 检查圆点是否已创建
     * @returns {boolean} 是否已创建
     */
    isElementCreated() {
        return this.isCreated && this.element !== null;
    }

    /**
     * 销毁控制圆点
     */
    destroy() {
        try {
            // 移除事件监听器
            if (this.element) {
                this.element.removeEventListener('click', this.handleClick);
                this.element.removeEventListener('mouseenter', this.handleMouseEnter);
                this.element.removeEventListener('mouseleave', this.handleMouseLeave);

                // 从DOM中移除元素
                if (this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }

            // 重置状态
            this.element = null;
            this.isCreated = false;

            console.log('[ControlDot] 控制圆点已销毁');

            // 发送销毁事件
            this.eventBus.emit('ui:dot-destroyed');
        } catch (error) {
            console.error('[ControlDot] 销毁控制圆点失败:', error);
        }
    }
}
