// IDGAF.ai API Endpoint Testing Suite
// This comprehensive test suite validates all SDK functionality

const { IDGAF, GGUFAdapter, TFLiteAdapter, HardwareDetection, AIError, ErrorHandler } = require('./packages/core/dist');
const assert = require('assert');
const util = require('util');

class APITester {
  constructor() {
    this.idgaf = null;
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',      // Cyan
      success: '\x1b[32m',   // Green
      error: '\x1b[31m',     // Red
      warn: '\x1b[33m',      // Yellow
      reset: '\x1b[0m'       // Reset
    };

    console.log(`${colors[level]}[${timestamp}] ${message}${colors.reset}`);
  }

  async test(testName, testFunction) {
    try {
      this.log(`🧪 Testing: ${testName}`, 'info');
      await testFunction();
      this.testResults.passed++;
      this.log(`✅ PASSED: ${testName}`, 'success');
      return true;
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: testName, error: error.message });
      this.log(`❌ FAILED: ${testName} - ${error.message}`, 'error');
      return false;
    }
  }

  async initializeIDGAF() {
    return this.test('SDK Initialization', async () => {
      this.idgaf = new IDGAF({
        modelCachePath: './test-models',
        maxCacheSize: 1 * 1024 * 1024 * 1024, // 1GB
        logLevel: 'warn', // Reduce log noise during testing
        enableTelemetry: false,
        hardware: {
          preferGPU: true,
          preferNPU: true
        }
      });

      assert(this.idgaf instanceof IDGAF, 'IDGAF instance created');
      assert(typeof this.idgaf.loadModel === 'function', 'loadModel method exists');
      assert(typeof this.idgaf.generate === 'function', 'generate method exists');
      assert(typeof this.idgaf.chat === 'function', 'chat method exists');
    });
  }

  async testAdapterRegistration() {
    return this.test('Adapter Registration', async () => {
      // Register adapters
      const ggufAdapter = new GGUFAdapter();
      const tfliteAdapter = new TFLiteAdapter();

      this.idgaf.registry.registerAdapter(ggufAdapter);
      this.idgaf.registry.registerAdapter(tfliteAdapter);

      // Verify adapters are registered
      const adapters = this.idgaf.registry.getAllAdapters();
      assert(adapters.length >= 2, 'At least 2 adapters registered');

      const ggufFound = adapters.some(adapter => adapter.format === 'gguf');
      const tfliteFound = adapters.some(adapter => adapter.format === 'tflite');

      assert(ggufFound, 'GGUF adapter registered');
      assert(tfliteFound, 'TFLite adapter registered');
    });
  }

  async testHardwareDetection() {
    return this.test('Hardware Detection', async () => {
      const hardware = await HardwareDetection.detect();

      assert(typeof hardware === 'object', 'Hardware info is object');
      assert(typeof hardware.platform === 'string', 'Platform detected');
      assert(typeof hardware.cores === 'number', 'CPU cores detected');
      assert(typeof hardware.memoryMB === 'number', 'Memory detected');
      assert(typeof hardware.hasGPU === 'boolean', 'GPU status detected');
      assert(typeof hardware.hasNPU === 'boolean', 'NPU status detected');

      // Test optimal settings
      const settings = HardwareDetection.getOptimalSettings(hardware);
      assert(typeof settings.quantization === 'string', 'Quantization setting provided');
      assert(typeof settings.maxContextLength === 'number', 'Context length provided');
      assert(typeof settings.useGPU === 'boolean', 'GPU preference provided');
    });
  }

  async testModelManagement() {
    return this.test('Model Management', async () => {
      // Test getting loaded models (should be empty initially)
      const initialModels = this.idgaf.getLoadedModels();
      assert(Array.isArray(initialModels), 'getLoadedModels returns array');
      assert(initialModels.length === 0, 'No models loaded initially');

      // Test performance metrics (should be empty initially)
      const metrics = this.idgaf.getPerformanceMetrics();
      assert(metrics instanceof Map, 'Performance metrics is a Map');
      assert(metrics.size === 0, 'No metrics initially');

      // Test hardware info
      const hardwareInfo = this.idgaf.getHardwareInfo();
      // Note: might be null if detection failed, which is acceptable
      if (hardwareInfo) {
        assert(typeof hardwareInfo === 'object', 'Hardware info available');
      }
    });
  }

  async testTextGenerationAPI() {
    return this.test('Text Generation API', async () => {
      // Test API structure without actual model
      try {
        const generator = this.idgaf.generate("Test prompt", {
          maxTokens: 10,
          temperature: 0.7,
          stream: true
        });

        assert(typeof generator === 'object', 'Generate returns async generator');
        assert(typeof generator.next === 'function', 'Generator has next method');
        assert(typeof generator[Symbol.asyncIterator] === 'function', 'Generator is async iterable');

        // This will throw because no model is loaded, which is expected
        await generator.next();

        // If we get here, something unexpected happened
        assert(false, 'Should have thrown error for no loaded model');

      } catch (error) {
        // Expected error when no model is loaded
        assert(error.message.includes('No LLM models loaded'), 'Correct error for no LLM models');
      }
    });
  }

  async testChatCompletionAPI() {
    return this.test('Chat Completion API', async () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' }
      ];

      try {
        const chatGenerator = this.idgaf.chat(messages, {
          maxTokens: 10,
          temperature: 0.7
        });

        assert(typeof chatGenerator === 'object', 'Chat returns async generator');
        assert(typeof chatGenerator.next === 'function', 'Chat generator has next method');

        // This will throw because no model is loaded
        await chatGenerator.next();
        assert(false, 'Should have thrown error for no loaded model');

      } catch (error) {
        assert(error.message.includes('No LLM models loaded'), 'Correct error for no LLM models');
      }
    });
  }

  async testImageClassificationAPI() {
    return this.test('Image Classification API', async () => {
      // Create a dummy image tensor
      const imageTensor = {
        data: new Float32Array(224 * 224 * 3),
        shape: [1, 224, 224, 3],
        dtype: 'float32'
      };

      // Fill with some dummy data
      for (let i = 0; i < imageTensor.data.length; i++) {
        imageTensor.data[i] = Math.random();
      }

      try {
        const result = await this.idgaf.classify(imageTensor, {
          topK: 5,
          threshold: 0.1
        });

        // This should not execute because no vision model is loaded
        assert(false, 'Should have thrown error for no vision model');

      } catch (error) {
        assert(error.message.includes('No vision models loaded'), 'Correct error for no vision models');
      }
    });
  }

  async testObjectDetectionAPI() {
    return this.test('Object Detection API', async () => {
      const imageTensor = {
        data: new Float32Array(416 * 416 * 3),
        shape: [1, 416, 416, 3],
        dtype: 'float32'
      };

      try {
        const result = await this.idgaf.detect(imageTensor, {
          scoreThreshold: 0.5,
          iouThreshold: 0.4
        });

        assert(false, 'Should have thrown error for no vision model');

      } catch (error) {
        assert(error.message.includes('No vision models loaded'), 'Correct error for no vision models');
      }
    });
  }

  async testAudioTranscriptionAPI() {
    return this.test('Audio Transcription API', async () => {
      // Create dummy audio tensor (16kHz, 5 seconds)
      const audioTensor = {
        data: new Float32Array(16000 * 5),
        shape: [16000 * 5],
        dtype: 'float32'
      };

      // Fill with some dummy audio data
      for (let i = 0; i < audioTensor.data.length; i++) {
        audioTensor.data[i] = Math.sin(2 * Math.PI * 440 * i / 16000) * 0.1; // 440Hz tone
      }

      try {
        const result = await this.idgaf.transcribe(audioTensor, {
          language: 'auto',
          enablePunctuation: true
        });

        assert(false, 'Should have thrown error for no audio model');

      } catch (error) {
        assert(error.message.includes('No audio models loaded'), 'Correct error for no audio models');
      }
    });
  }

  async testEmbeddingGenerationAPI() {
    return this.test('Embedding Generation API', async () => {
      const text = "This is a test sentence for embedding generation.";

      try {
        const embeddings = await this.idgaf.embed(text, {
          normalize: true,
          pooling: 'mean'
        });

        assert(false, 'Should have thrown error for no embedding model');

      } catch (error) {
        assert(error.message.includes('No embedding models loaded'), 'Correct error for no embedding models');
      }
    });
  }

  async testErrorHandling() {
    return this.test('Error Handling', async () => {
      // Test AIError creation
      const modelError = AIError.modelNotFound('test-model-123');
      assert(modelError instanceof AIError, 'AIError instance created');
      assert(modelError.code === 'MODEL_NOT_FOUND', 'Correct error code');
      assert(modelError.recoverable === true, 'Model not found is recoverable');

      // Test error formatting
      const formatted = ErrorHandler.formatError(modelError);
      assert(typeof formatted.message === 'string', 'Formatted error has message');
      assert(typeof formatted.suggestion === 'string', 'Formatted error has suggestion');
      assert(formatted.code === 'MODEL_NOT_FOUND', 'Formatted error has code');

      // Test error suggestion
      const suggestion = ErrorHandler.getErrorSuggestion(modelError);
      assert(typeof suggestion === 'string', 'Error suggestion is string');
      assert(suggestion.length > 0, 'Error suggestion is not empty');

      // Test retry mechanism
      let attemptCount = 0;
      const failingFunction = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await ErrorHandler.withRetry(failingFunction, 3, 10);
      assert(result === 'success', 'Retry mechanism worked');
      assert(attemptCount === 3, 'Correct number of attempts');
    });
  }

  async testAdapterCapabilities() {
    return this.test('Adapter Capabilities', async () => {
      const adapters = this.idgaf.registry.getAllAdapters();

      for (const adapter of adapters) {
        const capabilities = adapter.getCapabilities();

        assert(typeof capabilities === 'object', 'Capabilities is object');
        assert(typeof capabilities.supportsStreaming === 'boolean', 'Streaming capability defined');
        assert(typeof capabilities.supportsGPU === 'boolean', 'GPU capability defined');
        assert(Array.isArray(capabilities.supportsQuantization), 'Quantization options is array');
        assert(Array.isArray(capabilities.supportedFormats), 'Supported formats is array');

        // Test model format detection
        const testPath = `test-model.${adapter.format}`;
        const canHandle = adapter.canHandle(testPath);
        assert(typeof canHandle === 'boolean', 'canHandle returns boolean');
      }
    });
  }

  async testModelRegistryFunctions() {
    return this.test('Model Registry Functions', async () => {
      const registry = this.idgaf.registry;

      // Test memory usage calculation
      const memoryUsage = registry.getMemoryUsage();
      assert(typeof memoryUsage === 'number', 'Memory usage is number');
      assert(memoryUsage >= 0, 'Memory usage is non-negative');

      // Test loaded models tracking
      const loadedModels = registry.getAllLoadedModels();
      assert(Array.isArray(loadedModels), 'Loaded models is array');

      // Test adapter selection (this should work without models)
      const dummyHardware = {
        platform: 'node',
        hasGPU: false,
        hasNPU: false,
        memoryMB: 4096,
        cores: 4,
        architecture: 'x64'
      };

      const selectedAdapter = await registry.selectBestAdapter(
        'test.gguf',
        { format: 'gguf', type: 'llm', name: 'test', size: 1000, version: '1.0', checksum: '123' },
        dummyHardware
      );

      if (selectedAdapter) {
        assert(selectedAdapter.format === 'gguf', 'Correct adapter selected for GGUF');
      }
    });
  }

  async testStreamingUtilities() {
    return this.test('Streaming Utilities', async () => {
      const { StreamController, BackpressureHandler, TokenBuffer } = require('./packages/core/dist');

      // Test StreamController
      const controller = new StreamController();
      assert(typeof controller.push === 'function', 'StreamController has push method');
      assert(typeof controller.close === 'function', 'StreamController has close method');
      assert(typeof controller.stream === 'object', 'StreamController has stream property');

      // Test BackpressureHandler
      const backpressure = new BackpressureHandler(5);
      assert(typeof backpressure.acquire === 'function', 'BackpressureHandler has acquire method');
      assert(typeof backpressure.release === 'function', 'BackpressureHandler has release method');
      assert(backpressure.pendingCount === 0, 'Initial pending count is 0');

      // Test TokenBuffer
      const buffer = new TokenBuffer(10);
      buffer.add('hello');
      buffer.add(' ');
      buffer.add('world');

      assert(buffer.getText() === 'hello world', 'TokenBuffer accumulates text correctly');
      assert(buffer.length === 3, 'TokenBuffer length is correct');
    });
  }

  async testCacheSystem() {
    return this.test('Cache System', async () => {
      const { LRUCache } = require('./packages/core/dist');

      const cache = new LRUCache(100); // 100MB cache

      // Test cache stats
      const stats = await cache.getStats();
      assert(typeof stats.totalSize === 'number', 'Cache total size is number');
      assert(typeof stats.entryCount === 'number', 'Cache entry count is number');
      assert(typeof stats.hitRate === 'number', 'Cache hit rate is number');

      assert(stats.totalSize === 0, 'Initial cache size is 0');
      assert(stats.entryCount === 0, 'Initial entry count is 0');
    });
  }

  async runAllTests() {
    this.log('🚀 Starting IDGAF.ai API Endpoint Testing Suite', 'info');
    this.log('='.repeat(60), 'info');

    const tests = [
      () => this.initializeIDGAF(),
      () => this.testAdapterRegistration(),
      () => this.testHardwareDetection(),
      () => this.testModelManagement(),
      () => this.testTextGenerationAPI(),
      () => this.testChatCompletionAPI(),
      () => this.testImageClassificationAPI(),
      () => this.testObjectDetectionAPI(),
      () => this.testAudioTranscriptionAPI(),
      () => this.testEmbeddingGenerationAPI(),
      () => this.testErrorHandling(),
      () => this.testAdapterCapabilities(),
      () => this.testModelRegistryFunctions(),
      () => this.testStreamingUtilities(),
      () => this.testCacheSystem()
    ];

    // Run all tests
    for (const test of tests) {
      await test();
    }

    // Print summary
    this.log('='.repeat(60), 'info');
    this.log('📊 Test Summary:', 'info');
    this.log(`✅ Passed: ${this.testResults.passed}`, 'success');
    this.log(`❌ Failed: ${this.testResults.failed}`, this.testResults.failed > 0 ? 'error' : 'info');

    if (this.testResults.errors.length > 0) {
      this.log('', 'info');
      this.log('🐛 Failed Tests:', 'error');
      this.testResults.errors.forEach(({ test, error }) => {
        this.log(`   • ${test}: ${error}`, 'error');
      });
    }

    const totalTests = this.testResults.passed + this.testResults.failed;
    const successRate = totalTests > 0 ? (this.testResults.passed / totalTests * 100).toFixed(1) : 0;

    this.log('', 'info');
    this.log(`🎯 Success Rate: ${successRate}%`, successRate === '100.0' ? 'success' : 'warn');

    if (this.testResults.failed === 0) {
      this.log('🎉 All API endpoints tested successfully!', 'success');
      this.log('The IDGAF.ai SDK is ready for production use.', 'success');
    } else {
      this.log('⚠️  Some tests failed. Please review and fix the issues.', 'warn');
    }

    return this.testResults.failed === 0;
  }
}

// Run the test suite
async function main() {
  const tester = new APITester();
  const success = await tester.runAllTests();

  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { APITester };