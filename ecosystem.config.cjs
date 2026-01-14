// PM2 配置文件 - 前端 Next.js 应用
module.exports = {
  apps: [
    {
      name: 'lumi-web', // 进程名称
      script: 'npm', // 使用 npm 启动
      args: 'start', // 对应 package.json 中的 "start": "next start -p 4000"
      instances: 1, // 实例数量
      exec_mode: 'fork', // 执行模式
      env: {
        NODE_ENV: 'production', // 环境变量：生产模式
        PORT: 4000, // 前端端口
      },
      error_file: './logs/web-error.log', // 错误日志文件
      out_file: './logs/web-out.log', // 输出日志文件
      log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志时间格式
      autorestart: false, // 关闭自动重启
      watch: false, // 生产环境不需要文件监听
      merge_logs: true, // 合并日志
    },
  ],
};
