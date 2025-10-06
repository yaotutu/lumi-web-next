import fs from "node:fs";
import path from "node:path";

const STORAGE_ROOT = path.join(process.cwd(), "public", "generated");

const dirs = [
  path.join(STORAGE_ROOT, "images"),
  path.join(STORAGE_ROOT, "models"),
];

console.log("📁 Initializing storage directories...");

dirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${path.relative(process.cwd(), dir)}`);
  } else {
    console.log(`⏭️  Exists: ${path.relative(process.cwd(), dir)}`);
  }
});

// 创建 .gitkeep 保持目录结构
const gitkeepPath = path.join(STORAGE_ROOT, ".gitkeep");
fs.writeFileSync(
  gitkeepPath,
  "# This file keeps the generated directory in git\n",
);
console.log(`✅ Created: ${path.relative(process.cwd(), gitkeepPath)}`);

console.log("✅ Storage initialization complete!");
