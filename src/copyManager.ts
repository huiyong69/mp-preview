import { Notice } from 'obsidian';

export class CopyManager {
    private static cleanupHtml(element: HTMLElement): string {
        // 创建克隆以避免修改原始元素
        const clone = element.cloneNode(true) as HTMLElement;

        // 移除所有的 data-* 属性
        clone.querySelectorAll('*').forEach(el => {
            Array.from(el.attributes).forEach(attr => {
                if (attr.name.startsWith('data-')) {
                    el.removeAttribute(attr.name);
                }
            });
        });

        // 移除所有的 class 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('class');
        });

        // 移除所有的 id 属性
        clone.querySelectorAll('*').forEach(el => {
            el.removeAttribute('id');
        });

        // 使用 XMLSerializer 安全地转换为字符串
        const serializer = new XMLSerializer();
        return serializer.serializeToString(clone);
    }

    private static async processImages(container: HTMLElement): Promise<void> {
        const images = container.querySelectorAll('img');
        const imageArray = Array.from(images);
        
        for (const img of imageArray) {
            try {
                const response = await fetch(img.src);
                const blob = await response.blob();
                const reader = new FileReader();
                await new Promise((resolve, reject) => {
                    reader.onload = () => {
                        img.src = reader.result as string;
                        resolve(null);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.error('图片转换失败:', error);
            }
        }
    }

    static async copyToClipboard(element: HTMLElement) {
        try {
            const clone = element.cloneNode(true) as HTMLElement;
            await this.processImages(clone);

            // ========== 1. 代码块外层样式内联处理 ==========
            const originalCodeBlocks = element.querySelectorAll('pre');
            const cloneCodeBlocks = clone.querySelectorAll('pre');

            originalCodeBlocks.forEach((originalBlock, index) => {
                const cloneBlock = cloneCodeBlocks[index] as HTMLElement;
                if (!cloneBlock) return;

                const computedStyle = window.getComputedStyle(originalBlock);
                cloneBlock.style.backgroundColor = computedStyle.backgroundColor;
                cloneBlock.style.border = computedStyle.border;
                cloneBlock.style.borderRadius = computedStyle.borderRadius;
                cloneBlock.style.padding = computedStyle.padding;
                cloneBlock.style.fontSize = computedStyle.fontSize;
                cloneBlock.style.lineHeight = computedStyle.lineHeight;
                cloneBlock.style.whiteSpace = computedStyle.whiteSpace;
            });

            // ========== 2. 核心修复：把色块圆点变成彩色文字 ==========
            const allDots = clone.querySelectorAll('.mp-code-dot');
            allDots.forEach((dot) => {
                const dotEl = dot as HTMLElement;
                // 读取原本的背景色
                const bgColor = dotEl.style.backgroundColor || window.getComputedStyle(dotEl).backgroundColor;
                
                // 清空原有样式和类名（反正 cleanupHtml 也会删 class）
                dotEl.removeAttribute('class');
                dotEl.removeAttribute('style');
                
                // 用背景色作为文字颜色，用实心圆字符 ● 代替色块
                dotEl.style.color = bgColor; 
                dotEl.style.fontSize = '18px'; // 调整圆点大小，可微调
                dotEl.style.lineHeight = '1';
                dotEl.style.marginRight = '6px'; // 点与点之间的间距，可微调
                dotEl.innerText = '●'; // 塞入实心圆字符
            });
            // ========== 修复结束 ==========

            const contentSection = clone.querySelector(".mp-content-section") as HTMLElement;
            if (!contentSection) {
                throw new Error("找不到内容区域");
            }

            let cleanHtml = this.cleanupHtml(contentSection);

            const clipData = new ClipboardItem({
                "text/html": new Blob([cleanHtml], { type: "text/html" }),
                "text/plain": new Blob([clone.textContent || ""], { type: "text/plain" })
            });

            await navigator.clipboard.write([clipData]);
            new Notice("已复制到剪贴板");
        } catch (error) {
            new Notice("复制失败");
            console.error("复制失败:", error);
        }
    }


}