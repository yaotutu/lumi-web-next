import { generateImageStream } from "@/lib/aliyun-image";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { prompt, count = 4, stream = true, taskId } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "请提供有效的prompt参数" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "prompt不能为空" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 流式返回 - 生成一张返回一张
    if (stream) {
      const encoder = new TextEncoder();

      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            // 如果是重新生成，先删除旧图片
            if (taskId) {
              await prisma.taskImage.deleteMany({
                where: { taskId },
              });
              await prisma.task.update({
                where: { id: taskId },
                data: {
                  status: "GENERATING_IMAGES",
                  imageGenerationStartedAt: new Date(),
                },
              });
            }

            let index = 0;

            // 使用生成器函数逐张生成图片
            for await (const imageUrl of generateImageStream(
              prompt.trim(),
              count,
            )) {
              // 保存到数据库（使用 upsert 避免唯一约束冲突）
              if (taskId) {
                await prisma.taskImage.upsert({
                  where: {
                    taskId_index: {
                      taskId,
                      index,
                    },
                  },
                  update: {
                    url: imageUrl,
                  },
                  create: {
                    taskId,
                    url: imageUrl,
                    index,
                  },
                });
              }

              const data = JSON.stringify({
                type: "image",
                index,
                url: imageUrl,
                total: count,
              });

              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              index++;
            }

            // 更新任务状态为图片就绪
            if (taskId) {
              await prisma.task.update({
                where: { id: taskId },
                data: {
                  status: "IMAGES_READY",
                  imageGenerationCompletedAt: new Date(),
                },
              });
            }

            // 发送完成事件
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", total: index })}\n\n`,
              ),
            );
            controller.close();
          } catch (error) {
            // 更新任务状态为失败
            if (taskId) {
              await prisma.task
                .update({
                  where: { id: taskId },
                  data: {
                    status: "FAILED",
                    failedAt: new Date(),
                    errorMessage:
                      error instanceof Error ? error.message : "Unknown error",
                  },
                })
                .catch((err) =>
                  console.error("Failed to update task status:", err),
                );
            }

            const errorData = JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "图片生成失败",
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(customReadable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 非流式 - 等待全部生成完成后返回(预留接口)
    if (taskId) {
      // 如果是重新生成，先删除旧图片
      await prisma.taskImage.deleteMany({
        where: { taskId },
      });
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "GENERATING_IMAGES",
          imageGenerationStartedAt: new Date(),
        },
      });
    }

    const images: string[] = [];
    let index = 0;
    for await (const imageUrl of generateImageStream(prompt.trim(), count)) {
      images.push(imageUrl);

      // 保存到数据库（使用 upsert 避免唯一约束冲突）
      if (taskId) {
        await prisma.taskImage.upsert({
          where: {
            taskId_index: {
              taskId,
              index,
            },
          },
          update: {
            url: imageUrl,
          },
          create: {
            taskId,
            url: imageUrl,
            index,
          },
        });
      }
      index++;
    }

    // 更新任务状态为图片就绪
    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "IMAGES_READY",
          imageGenerationCompletedAt: new Date(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        images,
        count: images.length,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("生成图片失败:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "图片生成失败",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
