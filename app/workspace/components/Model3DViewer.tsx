"use client";

import { Suspense, useRef, useImperativeHandle, forwardRef } from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import * as THREE from "three";

// GLB 模型组件
function GLBModel({ url }: { url: string }) {
  // 加载 GLB 模型
  const { scene } = useGLTF(url);

  return (
    // 渲染加载的场景
    <primitive object={scene} />
  );
}

// OBJ 模型组件
function OBJModel({ url }: { url: string }) {
  // 加载 OBJ 模型
  const obj = useLoader(OBJLoader, url);

  // 为 OBJ 模型的所有子网格添加默认材质和处理几何体
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geometry = child.geometry;

      // 检查顶点位置数据是否有效
      const positionAttribute = geometry.getAttribute('position');
      if (!positionAttribute) {
        console.error('OBJ 模型缺少顶点位置数据');
        return;
      }

      // 检查是否有 NaN 值
      let hasNaN = false;
      const positions = positionAttribute.array;
      for (let i = 0; i < positions.length; i++) {
        if (isNaN(positions[i])) {
          hasNaN = true;
          break;
        }
      }

      if (hasNaN) {
        console.error('OBJ 模型包含无效的顶点数据 (NaN)');
        return;
      }

      // 数据有效，继续处理
      try {
        // 计算几何体的法线（提升渲染质量）
        geometry.computeVertexNormals();

        // 居中几何体（避免模型偏离视野）
        geometry.center();
      } catch (error) {
        console.error('处理 OBJ 几何体时出错:', error);
      }

      // 为所有网格设置标准材质（OBJ 文件通常不包含材质信息）
      child.material = new THREE.MeshStandardMaterial({
        color: 0xffffff, // 白色
        metalness: 0.2,
        roughness: 0.8,
        side: THREE.DoubleSide, // 双面渲染
      });

      // 启用阴影
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  return (
    // 渲染加载的 OBJ 对象
    <primitive object={obj} scale={1} />
  );
}

// 通用模型加载组件（根据文件扩展名选择加载器）
function Model({ url }: { url: string }) {
  // 从 URL 提取文件扩展名
  const extension = url.split('.').pop()?.toLowerCase() || '';

  // 根据扩展名选择合适的加载器
  if (extension === 'obj') {
    return <OBJModel url={url} />;
  }

  // 默认使用 GLB 加载器（支持 .glb 和 .gltf）
  return <GLBModel url={url} />;
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
          position: [1, 1, 1], // 相机初始位置(更靠近模型,使模型看起来更大)
          fov: 60, // 视野角度(增大视野角度,模型显示更大)
        }}
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {/* 环境光照 */}
        <ambientLight intensity={0.5} />

        {/* 方向光 */}
        <directionalLight position={[10, 10, 5]} intensity={1} castShadow />

        {/* 聚光灯 */}
        <spotLight
          position={[-10, 10, -10]}
          intensity={0.3}
          angle={0.3}
          penumbra={1}
        />

        {/* Suspense 用于异步加载模型 */}
        <Suspense fallback={<LoadingFallback />}>
          {/* 加载 3D 模型（自动识别格式：OBJ/GLB/GLTF） */}
          <Model url={modelUrl} />

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
          minDistance={0.5} // 最小缩放距离(允许更近距离查看)
          maxDistance={10} // 最大缩放距离(调整最大距离限制)
          maxPolarAngle={Math.PI / 2} // 限制垂直旋转角度
        />
      </Canvas>
    );
  },
);

// 设置显示名称,便于调试
Model3DViewer.displayName = "Model3DViewer";

export default Model3DViewer;
