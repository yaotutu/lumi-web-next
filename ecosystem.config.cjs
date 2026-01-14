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
      autorestart: true, // 自动重启
      watch: false, // 生产环境不需要文件监听
      max_memory_restart: '1G', // 内存超过 1G 自动重启
      merge_logs: true, // 合并日志

      // 重启策略优化 - 解决端口占用问题
      kill_timeout: 5000, // 等待进程优雅关闭的时间（毫秒）
      wait_ready: true, // 等待应用准备就绪
      min_uptime: '10s', // 最小运行时间，如果进程在这时间内崩溃，不标记为稳定运行
      max_restarts: 10, // 1分钟内最大重启次数
      restart_delay: 4000, // 重启延迟时间（毫秒），给旧进程足够时间释放端口
      exp_backoff_restart_delay: 100, // 退避重启延迟：每次重启后延迟增加
    },
  ],
};
