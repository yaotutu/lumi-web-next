"use client";

import { useToastStore } from "@/stores/toast-store";
import { ToastContainer } from "@/components/ui/Toast";

/**
 * 全局 Toast 容器组件
 * 连接全局 Toast Store,自动显示所有 Toast 提示
 *
 * @usage 在 app/layout.tsx 中引入此组件
 */
export default function GlobalToast() {
	const toasts = useToastStore((state) => state.toasts);
	const removeToast = useToastStore((state) => state.removeToast);

	// 只有当有 Toast 时才渲染
	if (toasts.length === 0) {
		return null;
	}

	return (
		<ToastContainer
			toasts={toasts.map((toast) => ({
				...toast,
				onClose: () => removeToast(toast.id),
			}))}
			onRemove={removeToast}
		/>
	);
}
