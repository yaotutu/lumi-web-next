import { LocalStorage } from '../lib/storage';

async function testStorage() {
  console.log('🧪 Testing LocalStorage class...\n');

  const testTaskId = 'test_task_123';

  try {
    // 测试 1: 保存 Mock 图片
    console.log('Test 1: Saving mock images...');
    const imageUrls: string[] = [];
    for (let i = 0; i < 4; i++) {
      const url = await LocalStorage.saveMockImage(testTaskId, i);
      imageUrls.push(url);
      console.log(`  ✅ Image ${i}: ${url}`);
    }

    // 测试 2: 检查文件是否存在
    console.log('\nTest 2: Checking file existence...');
    imageUrls.forEach((url, i) => {
      const exists = LocalStorage.fileExists(url);
      console.log(`  ${exists ? '✅' : '❌'} Image ${i}: ${exists}`);
    });

    // 测试 3: 获取文件大小
    console.log('\nTest 3: Getting file sizes...');
    imageUrls.forEach((url, i) => {
      const size = LocalStorage.getFileSize(url);
      console.log(`  ✅ Image ${i}: ${size} bytes`);
    });

    // 测试 4: 保存 Mock 模型
    console.log('\nTest 4: Saving mock model...');
    const modelUrl = await LocalStorage.saveMockModel(testTaskId);
    console.log(`  ✅ Model: ${modelUrl}`);
    const modelSize = LocalStorage.getFileSize(modelUrl);
    console.log(`  ✅ Model size: ${modelSize} bytes`);

    // 测试 5: 删除资源
    console.log('\nTest 5: Deleting resources...');
    await LocalStorage.deleteTaskResources(testTaskId);
    const stillExists = LocalStorage.fileExists(imageUrls[0]);
    console.log(`  ${stillExists ? '❌' : '✅'} Resources deleted: ${!stillExists}`);

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testStorage();
