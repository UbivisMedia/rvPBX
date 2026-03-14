module.exports = {
  apps: [
    {
      name: 'asterisk-admin-api',
      script: './src/index.js',
      cwd: './backend',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
