"use client";

import { Environment, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

// 获取对应的 MTL 文件 URL
function getMTLUrl(objUrl: string): string {
  let actualUrl = objUrl;

  // 如果是代理 URL，提取原始 URL
  if (objUrl.includes('/api/proxy/model?url=')) {
    const urlObj = new URL(objUrl, window.location.origin);
    actualUrl = urlObj.searchParams.get("url") || "";
  }

  if (actualUrl.startsWith('/generated/models/')) {
    // 本地文件：在相同目录下查找 MTL 文件
    const basePath = actualUrl.substring(0, actualUrl.lastIndexOf('/'));
    const mtlUrl = `${basePath}/material.mtl`;
    const proxyMtlUrl = `/api/proxy/model?url=${encodeURIComponent(mtlUrl)}`;
    return proxyMtlUrl;
  }

  // 外部文件：尝试在同一目录下查找 material.mtl
  const objBaseUrl = actualUrl.substring(0, actualUrl.lastIndexOf('/'));
  return `${objBaseUrl}/material.mtl`;
}

// GLB 模型组件
function GLBModel({
  url,
  onSceneLoad,
}: {
  url: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  // 加载 GLB 模型
  const { scene } = useGLTF(url);

  // 场景加载后通知父组件
  useEffect(() => {
    if (scene && onSceneLoad) {
      onSceneLoad(scene);
    }
  }, [scene, onSceneLoad]);

  return (
    // 渲染加载的场景
    <primitive object={scene} />
  );
}

// OBJ 模型组件
function OBJModel({
  url,
  onSceneLoad,
}: {
  url: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  // 使用 useLoader 统一处理 OBJ 和 MTL 文件加载
  const materials = useLoader(MTLLoader, getMTLUrl(url));
  const obj = useLoader(OBJLoader, url, (loader) => {
    // 预加载材质
    if (materials) {
      materials.preload();
      loader.setMaterials(materials);
    }
  });

  // 场景加载后通知父组件
  useEffect(() => {
    if (obj && onSceneLoad) {
      onSceneLoad(obj);
    }
  }, [obj, onSceneLoad]);

  // 为模型设置默认材质（如果没有材质或材质加载失败）
  useEffect(() => {
    if (obj) {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 如果没有材质，使用默认材质
          if (!child.material) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xcccccc, // 浅灰色
              metalness: 0.3,
              roughness: 0.7,
            });
          }
          // 启用阴影
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [obj]);

  return <primitive object={obj} />;
}

// 通用模型加载组件（根据文件扩展名选择加载器）
function Model({
  url,
  onSceneLoad,
}: {
  url: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  // 从 URL 提取文件扩展名
  const extension = url.split(".").pop()?.toLowerCase() || "";

  // 根据扩展名选择合适的加载器
  if (extension === "obj") {
    return <OBJModel url={url} onSceneLoad={onSceneLoad} />;
  }

  // 默认使用 GLB 加载器（支持 .glb 和 .gltf）
  return <GLBModel url={url} onSceneLoad={onSceneLoad} />;
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
  applyMaterial: (color: string | null) => void;
}

const Model3DViewer = forwardRef<Model3DViewerRef, Model3DViewerProps>(
  ({ modelUrl, showGrid = false }, ref) => {
    // OrbitControls 的引用,用于控制相机
    const controlsRef = useRef<OrbitControlsType>(null);
    // 场景引用,用于材质切换
    const sceneRef = useRef<THREE.Group | null>(null);
    // 保存原始材质
    const originalMaterialsRef = useRef<
      Map<string, THREE.Material | THREE.Material[]>
    >(new Map());

    // 调试日志：查看传入的 modelUrl
    console.log("Model3DViewer 接收到的 modelUrl:", modelUrl);

    // 应用材质颜色（单色或恢复原始贴图）
    const applyMaterial = (color: string | null) => {
      if (!sceneRef.current) return;

      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // 如果是恢复原始贴图
          if (color === null) {
            const originalMaterial = originalMaterialsRef.current.get(
              child.uuid,
            );
            if (originalMaterial) {
              child.material = originalMaterial;
            }
          } else {
            // 首次切换到单色时，保存原始材质
            if (!originalMaterialsRef.current.has(child.uuid)) {
              originalMaterialsRef.current.set(child.uuid, child.material);
            }
            // 应用单色材质
            child.material = new THREE.MeshStandardMaterial({
              color: new THREE.Color(color),
              roughness: 0.5,
              metalness: 0.1,
            });
          }
        }
      });
    };

    // 暴露方法给父组件（必须在所有 return 之前调用）
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (controlsRef.current) {
          // 重置相机到初始位置
          controlsRef.current.reset();
        }
      },
      applyMaterial,
    }));

    // 如果没有 modelUrl，显示错误提示
    if (!modelUrl) {
      console.error("Model3DViewer: modelUrl 为空，无法加载模型");
      return (
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-4xl">⚠️</div>
            <p className="text-sm text-white/60">模型 URL 为空</p>
          </div>
        </div>
      );
    }
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
        <ambientLight intensity={0.8} />

        {/* 方向光 */}
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />

        {/* Suspense 用于异步加载模型 */}
        <Suspense fallback={<LoadingFallback />}>
          {/* 加载 3D 模型（自动识别格式：OBJ/GLB/GLTF） */}
          <Model
            url={modelUrl}
            onSceneLoad={(scene) => {
              sceneRef.current = scene;
            }}
          />

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