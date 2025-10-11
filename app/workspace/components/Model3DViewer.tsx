"use client";

import { Suspense, useRef, useImperativeHandle, forwardRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

// GLB 模型组件
function GLBModel({ url }: { url: string }) {
  // 加载 GLB 模型
  const { scene } = useGLTF(url);

  return (
    // 渲染加载的场景
    <primitive object={scene} />
  );
}

// 加载中占位组件
function LoadingFallback() {
  return (
    // 加载中时显示的占位内容
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffd93d" wireframe />
    </mesh>
  );
}

interface Model3DViewerProps {
  // 模型文件 URL,相对于 public 文件夹
  modelUrl?: string;
  // 是否显示网格
  showGrid?: boolean;
}

// 暴露给父组件的方法接口
export interface Model3DViewerRef {
  resetCamera: () => void;
}

const Model3DViewer = forwardRef<Model3DViewerRef, Model3DViewerProps>(
  ({ modelUrl = "/demo.glb", showGrid = false }, ref) => {
    // OrbitControls 的引用,用于控制相机
    const controlsRef = useRef<OrbitControlsType>(null);

    // 暴露重置相机方法给父组件
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (controlsRef.current) {
          // 重置相机到初始位置
          controlsRef.current.reset();
        }
      },
    }));
  return (
    // Canvas 是 React Three Fiber 的根容器
    <Canvas
      camera={{
        position: [3, 3, 3], // 相机初始位置
        fov: 50, // 视野角度
      }}
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      {/* 环境光照 */}
      <ambientLight intensity={0.5} />

      {/* 方向光 */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
      />

      {/* 聚光灯 */}
      <spotLight
        position={[-10, 10, -10]}
        intensity={0.3}
        angle={0.3}
        penumbra={1}
      />

      {/* Suspense 用于异步加载模型 */}
      <Suspense fallback={<LoadingFallback />}>
        {/* 加载 GLB 模型 */}
        <GLBModel url={modelUrl} />

        {/* 环境贴图,提供更真实的反射效果 */}
        <Environment preset="studio" />
      </Suspense>

      {/* 网格辅助线(可选) */}
      {showGrid && (
        <Grid
          args={[10, 10]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#6b6b6b"
          sectionSize={1}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={25}
          fadeStrength={1}
          followCamera={false}
        />
      )}

      {/* 轨道控制器,允许用户旋转、缩放、平移视角 */}
      <OrbitControls
        ref={controlsRef}
        enableDamping // 启用阻尼效果,使旋转更平滑
        dampingFactor={0.05} // 阻尼系数
        minDistance={1} // 最小缩放距离
        maxDistance={20} // 最大缩放距离
        maxPolarAngle={Math.PI / 2} // 限制垂直旋转角度
      />
    </Canvas>
  );
});

// 设置显示名称,便于调试
Model3DViewer.displayName = "Model3DViewer";

export default Model3DViewer;
