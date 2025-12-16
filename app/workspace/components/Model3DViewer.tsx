"use client";

import { Environment, Grid, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useLoader } from "@react-three/fiber";
import {
  forwardRef,
  Suspense,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import * as THREE from "three";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";

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

// OBJ 模型组件（带 MTL 材质）
function OBJModelWithMTL({
  objUrl,
  mtlUrl,
  onSceneLoad,
}: {
  objUrl: string;
  mtlUrl: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  console.log("OBJ 模型加载（带 MTL）:", { objUrl, mtlUrl });

  // 加载 MTL 材质
  const materials = useLoader(MTLLoader, mtlUrl);
  materials.preload();

  // 加载 OBJ 模型并设置材质
  const obj = useLoader(OBJLoader, objUrl, (loader) => {
    loader.setMaterials(materials);
  });

  // 优化材质和纹理
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // 优化材质设置
      if (child.material) {
        const materials = Array.isArray(child.material)
          ? child.material
          : [child.material];

        for (const material of materials) {
          // 设置纹理过滤和色彩空间
          if (material.map) {
            material.map.colorSpace = THREE.SRGBColorSpace;
            material.map.minFilter = THREE.LinearMipmapLinearFilter;
            material.map.magFilter = THREE.LinearFilter;
            material.map.anisotropy = 16;
            material.map.needsUpdate = true;
          }

          // 调整材质属性
          if (material.type === "MeshPhongMaterial") {
            material.shininess = 30;
            material.specular = new THREE.Color(0x111111);
          }

          material.needsUpdate = true;
        }
      }
    }
  });

  // 场景加载后通知父组件
  useEffect(() => {
    if (obj && onSceneLoad) {
      onSceneLoad(obj as THREE.Group);
    }
  }, [obj, onSceneLoad]);

  return <primitive object={obj} />;
}

// OBJ 模型组件（不带 MTL 材质）
function OBJModelWithoutMTL({
  objUrl,
  onSceneLoad,
}: {
  objUrl: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  console.log("OBJ 模型加载（无 MTL）:", { objUrl });

  // 直接加载 OBJ 模型，不设置材质
  const obj = useLoader(OBJLoader, objUrl);

  // 为没有材质的模型添加默认材质
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      // 如果没有材质，添加默认材质
      if (!child.material) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0xcccccc,
          roughness: 0.7,
          metalness: 0.3,
        });
      }
    }
  });

  // 场景加载后通知父组件
  useEffect(() => {
    if (obj && onSceneLoad) {
      onSceneLoad(obj as THREE.Group);
    }
  }, [obj, onSceneLoad]);

  return <primitive object={obj} />;
}

// 通用模型加载组件（根据 format 选择加载器）
function Model({
  modelUrl,
  mtlUrl,
  format,
  onSceneLoad,
}: {
  modelUrl?: string;
  mtlUrl?: string;
  format?: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  // 必须有 modelUrl
  if (!modelUrl) {
    console.error("Model: 没有提供 modelUrl", { modelUrl, mtlUrl, format });
    return null;
  }

  // ✅ 根据 format 字段选择加载器（清晰明确，无需猜测）
  const normalizedFormat = format?.toUpperCase();

  if (normalizedFormat === "OBJ") {
    // OBJ 格式：根据是否有 MTL 选择加载器
    if (mtlUrl) {
      console.log("使用 OBJModelWithMTL", { modelUrl, mtlUrl, format });
      return (
        <OBJModelWithMTL
          objUrl={modelUrl}
          mtlUrl={mtlUrl}
          onSceneLoad={onSceneLoad}
        />
      );
    }
    console.log("使用 OBJModelWithoutMTL", { modelUrl, format });
    return <OBJModelWithoutMTL objUrl={modelUrl} onSceneLoad={onSceneLoad} />;
  }

  // 默认使用 GLB 加载器（包括 format === "GLB" 或未指定的情况）
  console.log("使用 GLBModel", { modelUrl, format });
  return <GLBModel url={modelUrl} onSceneLoad={onSceneLoad} />;
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
  // 主模型文件 URL（统一字段，OBJ 或 GLB）
  modelUrl?: string;
  // MTL 材质文件 URL（OBJ 格式专用）
  mtlUrl?: string;
  // 纹理图片 URL（OBJ 格式专用，预留）
  textureUrl?: string;
  // 模型格式标识（"OBJ" 或 "GLB"）
  format?: string;
  // 是否显示网格
  showGrid?: boolean;
}

// 暴露给父组件的方法接口
export interface Model3DViewerRef {
  resetCamera: () => void;
  applyMaterial: (color: string | null) => void;
}

const Model3DViewer = forwardRef<Model3DViewerRef, Model3DViewerProps>(
  ({ modelUrl, mtlUrl, textureUrl, format, showGrid = false }, ref) => {
    // OrbitControls 的引用,用于控制相机
    const controlsRef = useRef<OrbitControlsType>(null);
    // 场景引用,用于材质切换
    const sceneRef = useRef<THREE.Group | null>(null);
    // 保存原始材质
    const originalMaterialsRef = useRef<
      Map<string, THREE.Material | THREE.Material[]>
    >(new Map());

    // ✅ 调试日志：查看传入的所有 URL 和 format
    console.log("Model3DViewer 接收到的数据:", {
      modelUrl,
      mtlUrl,
      textureUrl,
      format,
      note: "使用 format 字段决定加载器类型",
    });

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
      console.error("Model3DViewer: 没有提供 modelUrl");
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
          {/* ✅ 直接传递所有字段，由 Model 组件根据 format 自动选择加载器 */}
          <Model
            modelUrl={modelUrl}
            mtlUrl={mtlUrl}
            format={format}
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
