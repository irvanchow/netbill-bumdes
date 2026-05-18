module.exports = {
  apps: [
    {
      name: "bumdes-netbill",
      script: "npm",
      args: "start",
      cwd: "/var/www/bumdes-netbill",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/pm2/bumdes-netbill-error.log",
      out_file: "/var/log/pm2/bumdes-netbill-out.log",
    },
  ],
};
