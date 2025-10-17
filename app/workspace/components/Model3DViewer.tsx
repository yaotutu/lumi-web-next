"use client";

import {
  Suspense,
  useRef,
  useImperativeHandle,
  forwardRef,
  useMemo,
  useEffect,
} from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { OrbitControls, useGLTF, Environment, Grid } from "@react-three/drei";
import type { OrbitControls as OrbitControlsType } from "three-stdlib";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import * as THREE from "three";

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

// OBJ 模型组件（参考官方示例，使用统一的文件命名）
function OBJModel({
  url,
  onSceneLoad,
}: {
  url: string;
  onSceneLoad?: (scene: THREE.Group) => void;
}) {
  // 从代理 URL 中提取实际的 COS URL 和目录
  const urlObj = new URL(url, window.location.origin);
  const actualUrl = urlObj.searchParams.get("url") || "";
  const baseDir = actualUrl.substring(0, actualUrl.lastIndexOf("/"));

  // 🔑 从 baseDir 中提取唯一标识（通常是任务 ID）
  // 例如：https://xxx.cos.xxx.myqcloud.com/models/TASK_ID/model.obj
  // 提取 TASK_ID 作为唯一标识，既保证缓存独立，又保持相对路径形式
  const uniqueId = baseDir.split("/").pop() || Date.now().toString();
  const mtlKey = `${uniqueId}/material.mtl`; // 唯一的缓存 key
  const objKey = `${uniqueId}/model.obj`; // 唯一的缓存 key

  console.log("OBJ 解析:", {
    actualUrl,
    baseDir,
    uniqueId,
    mtlKey,
    objKey,
    note: "使用任务ID作为缓存key前缀，确保不同任务的模型独立缓存，同时保持相对路径形式以正确加载纹理",
  });

  // 创建统一的 LoadingManager，将文件名转换为代理 URL
  const manager = useMemo(() => {
    const mgr = new THREE.LoadingManager();

    mgr.setURLModifier((fileName) => {
      console.log("LoadingManager 拦截文件名:", fileName);

      // 如果已经是完整的代理 URL，直接返回
      if (fileName.startsWith("/api/proxy/model")) {
        return fileName;
      }

      // 移除唯一ID前缀，获取实际文件名
      const actualFileName = fileName.includes("/")
        ? fileName.split("/").pop() || fileName
        : fileName;

      // 构建完整的代理 URL
      const fullUrl = `${baseDir}/${actualFileName}`;
      const proxyUrl = `/api/proxy/model?url=${encodeURIComponent(fullUrl)}`;

      console.log("文件名转代理 URL:", {
        fileName,
        actualFileName,
        fullUrl,
        proxyUrl,
      });
      return proxyUrl;
    });

    return mgr;
  }, [baseDir]);

  // 🔑 加载 MTL 材质：使用带唯一ID的相对路径作为 key
  // 这样不同任务有不同的缓存，LoadingManager 还能正确转换路径
  const materials = useLoader(MTLLoader, mtlKey, (loader) => {
    loader.manager = manager;
  });
  materials.preload();

  // 🔑 加载 OBJ 模型：使用带唯一ID的相对路径作为 key
  const obj = useLoader(OBJLoader, objKey, (loader) => {
    loader.manager = manager;
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

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      resetCamera: () => {
        if (controlsRef.current) {
          // 重置相机到初始位置
          controlsRef.current.reset();
        }
      },
      applyMaterial,
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
