const os = require('os');

const setupMonitoring = (app, logger) => {
  // System metrics collection
  const systemMetrics = {
    startTime: Date.now(),
    requestCount: 0,
    errorCount: 0,
    activeConnections: 0
  };

  // Middleware to track requests
  app.use((req, res, next) => {
    const startTime = Date.now();
    systemMetrics.requestCount++;
    systemMetrics.activeConnections++;

    // Log request details
    logger.info('REQUEST_START', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Override res.end to capture response details
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      systemMetrics.activeConnections--;

      if (res.statusCode >= 400) {
        systemMetrics.errorCount++;
      }

      logger.info('REQUEST_END', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });

      originalEnd.apply(this, args);
    };

    next();
  });

  // System health monitoring endpoint
  app.get('/api/monitoring/health', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        process: uptime,
        system: os.uptime()
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
        systemTotal: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
        systemFree: `${Math.round(os.freemem() / 1024 / 1024)} MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      },
      requests: {
        total: systemMetrics.requestCount,
        errors: systemMetrics.errorCount,
        active: systemMetrics.activeConnections,
        errorRate: systemMetrics.requestCount > 0 ? 
          (systemMetrics.errorCount / systemMetrics.requestCount * 100).toFixed(2) + '%' : '0%'
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        hostname: os.hostname()
      }
    };

    res.json(healthData);
  });

  // Performance metrics endpoint
  app.get('/api/monitoring/metrics', (req, res) => {
    const metrics = {
      timestamp: new Date().toISOString(),
      requests: {
        total: systemMetrics.requestCount,
        errors: systemMetrics.errorCount,
        active: systemMetrics.activeConnections,
        rps: calculateRPS(),
        errorRate: systemMetrics.requestCount > 0 ? 
          (systemMetrics.errorCount / systemMetrics.requestCount * 100).toFixed(2) : 0
      },
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime()
    };

    res.json(metrics);
  });

  // Calculate requests per second
  const calculateRPS = () => {
    const uptimeSeconds = (Date.now() - systemMetrics.startTime) / 1000;
    return uptimeSeconds > 0 ? (systemMetrics.requestCount / uptimeSeconds).toFixed(2) : 0;
  };

  // Memory monitoring
  const monitorMemory = () => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    if (memoryUsagePercent > 80) {
      logger.warn('HIGH_MEMORY_USAGE', {
        heapUsed: `${heapUsedMB.toFixed(2)} MB`,
        heapTotal: `${heapTotalMB.toFixed(2)} MB`,
        percentage: `${memoryUsagePercent.toFixed(2)}%`
      });
    }

    // Force garbage collection if memory usage is very high
    if (memoryUsagePercent > 90 && global.gc) {
      logger.warn('FORCING_GARBAGE_COLLECTION', {
        beforeGC: `${heapUsedMB.toFixed(2)} MB`
      });
      global.gc();
      const afterGC = process.memoryUsage().heapUsed / 1024 / 1024;
      logger.info('GARBAGE_COLLECTION_COMPLETED', {
        afterGC: `${afterGC.toFixed(2)} MB`,
        freed: `${(heapUsedMB - afterGC).toFixed(2)} MB`
      });
    }
  };

  // CPU monitoring
  const monitorCPU = () => {
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPercent = (loadAvg[0] / cpuCount) * 100;

    if (loadPercent > 80) {
      logger.warn('HIGH_CPU_USAGE', {
        loadAverage: loadAvg,
        cpuCount,
        loadPercent: `${loadPercent.toFixed(2)}%`
      });
    }
  };

  // Error rate monitoring
  const monitorErrorRate = () => {
    if (systemMetrics.requestCount > 100) {
      const errorRate = (systemMetrics.errorCount / systemMetrics.requestCount) * 100;
      if (errorRate > 5) {
        logger.warn('HIGH_ERROR_RATE', {
          errorRate: `${errorRate.toFixed(2)}%`,
          totalRequests: systemMetrics.requestCount,
          totalErrors: systemMetrics.errorCount
        });
      }
    }
  };

  // Start monitoring intervals
  setInterval(monitorMemory, 30000); // Every 30 seconds
  setInterval(monitorCPU, 60000);    // Every minute
  setInterval(monitorErrorRate, 300000); // Every 5 minutes

  // Database connection monitoring
  const monitorDatabase = async () => {
    try {
      const { getPool } = require('./database');
      const pool = await getPool();
      const startTime = Date.now();
      await pool.request().query('SELECT 1');
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        logger.warn('SLOW_DATABASE_QUERY', {
          duration: `${duration}ms`,
          query: 'SELECT 1'
        });
      }
    } catch (error) {
      logger.error('DATABASE_CONNECTION_ERROR', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Monitor database every 2 minutes
  setInterval(monitorDatabase, 120000);

  // Crash detection and recovery
  const setupCrashProtection = () => {
    process.on('uncaughtException', (error) => {
      logger.error('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      
      // Attempt graceful shutdown
      setTimeout(() => {
        process.exit(1);
      }, 5000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('UNHANDLED_REJECTION', {
        reason: reason?.message || reason,
        promise: promise.toString(),
        timestamp: new Date().toISOString()
      });
    });

    // Memory leak detection
    let lastMemoryUsage = process.memoryUsage().heapUsed;
    setInterval(() => {
      const currentMemoryUsage = process.memoryUsage().heapUsed;
      const memoryIncrease = currentMemoryUsage - lastMemoryUsage;
      
      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB increase
        logger.warn('POTENTIAL_MEMORY_LEAK', {
          increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
          current: `${(currentMemoryUsage / 1024 / 1024).toFixed(2)} MB`,
          timestamp: new Date().toISOString()
        });
      }
      
      lastMemoryUsage = currentMemoryUsage;
    }, 300000); // Check every 5 minutes
  };

  setupCrashProtection();

  logger.info('Monitoring system initialized');
  
  return systemMetrics;
};

module.exports = { setupMonitoring };
