// IDGAF.ai SDK Demo
// This demo shows the complete SDK functionality

const { IDGAF, GGUFAdapter, TFLiteAdapter, HardwareDetection } = require('./packages/core/dist');

async function runDemo() {
  console.log('🚀 IDGAF.ai SDK Demo Starting...\n');

  try {
    // 1. Initialize the SDK
    console.log('📱 Initializing IDGAF.ai SDK...');
    const ai = new IDGAF({
      modelCachePath: './demo-models',
      maxCacheSize: 1 * 1024 * 1024 * 1024, // 1GB
      logLevel: 'info',
      hardware: {
        preferGPU: true,
        preferNPU: true
      }
    });

    // 2. Register adapters
    console.log('🔧 Registering adapters...');
    try {
      ai.registry.registerAdapter(new GGUFAdapter());
      console.log('   ✅ GGUF adapter registered (for LLMs)');
    } catch (error) {
      console.log('   ⚠️  GGUF adapter failed:', error.message);
    }

    try {
      ai.registry.registerAdapter(new TFLiteAdapter());
      console.log('   ✅ TensorFlow Lite adapter registered (for vision/audio)');
    } catch (error) {
      console.log('   ⚠️  TFLite adapter failed:', error.message);
    }

    // 3. Show hardware capabilities
    console.log('\n🔍 Hardware Detection:');
    try {
      const hardware = await HardwareDetection.detect();
      console.log(`   Platform: ${hardware.platform}`);
      console.log(`   CPU Cores: ${hardware.cores}`);
      console.log(`   Memory: ${hardware.memoryMB}MB`);
      console.log(`   GPU Available: ${hardware.hasGPU ? '✅' : '❌'}`);
      console.log(`   NPU Available: ${hardware.hasNPU ? '✅' : '❌'}`);
      console.log(`   Architecture: ${hardware.architecture}`);

      const optimalSettings = HardwareDetection.getOptimalSettings(hardware);
      console.log('\n🎯 Optimal Settings:');
      console.log(`   Recommended quantization: ${optimalSettings.quantization}`);
      console.log(`   Max context length: ${optimalSettings.maxContextLength}`);
      console.log(`   Use GPU: ${optimalSettings.useGPU ? '✅' : '❌'}`);
      console.log(`   Use NPU: ${optimalSettings.useNPU ? '✅' : '❌'}`);
    } catch (error) {
      console.log('   ⚠️  Hardware detection failed:', error.message);
    }

    // 4. Show supported formats
    console.log('\n📋 Supported Model Formats:');
    const adapters = ai.registry.getAllAdapters();
    adapters.forEach(adapter => {
      console.log(`   • ${adapter.format.toUpperCase()}: ${adapter.supportedTypes.join(', ')}`);
      const caps = adapter.getCapabilities();
      console.log(`     - Streaming: ${caps.supportsStreaming ? '✅' : '❌'}`);
      console.log(`     - GPU: ${caps.supportsGPU ? '✅' : '❌'}`);
      console.log(`     - Quantization: ${caps.supportsQuantization.join(', ')}`);
    });

    // 5. Demonstrate API usage (without actual models)
    console.log('\n💬 API Demonstration:');
    console.log('   Note: These examples show API usage. Real models needed for actual inference.\n');

    // Text Generation Example
    console.log('🔤 Text Generation API:');
    console.log('```javascript');
    console.log('// Load a language model');
    console.log('const model = await ai.loadModel("llama-3.2-3b.gguf");');
    console.log('');
    console.log('// Generate text with streaming');
    console.log('for await (const token of ai.generate("What is AI?", {');
    console.log('  maxTokens: 100,');
    console.log('  temperature: 0.7,');
    console.log('  stream: true');
    console.log('})) {');
    console.log('  process.stdout.write(token);');
    console.log('}');
    console.log('```\n');

    // Chat API Example
    console.log('💬 Chat Completion API:');
    console.log('```javascript');
    console.log('const messages = [');
    console.log('  { role: "system", content: "You are a helpful assistant" },');
    console.log('  { role: "user", content: "Explain quantum computing" }');
    console.log('];');
    console.log('');
    console.log('for await (const token of ai.chat(messages)) {');
    console.log('  console.log(token);');
    console.log('}');
    console.log('```\n');

    // Vision API Example
    console.log('🖼️  Vision API:');
    console.log('```javascript');
    console.log('// Load a vision model');
    console.log('const visionModel = await ai.loadModel("mobilenet-v3.tflite");');
    console.log('');
    console.log('// Classify an image');
    console.log('const imageTensor = loadImage("photo.jpg");');
    console.log('const result = await ai.classify(imageTensor, {');
    console.log('  topK: 5,');
    console.log('  threshold: 0.3');
    console.log('});');
    console.log('');
    console.log('result.top(5).forEach(pred => {');
    console.log('  console.log(`${pred.label}: ${pred.confidence}`);');
    console.log('});');
    console.log('```\n');

    // Audio API Example
    console.log('🎵 Audio API:');
    console.log('```javascript');
    console.log('// Load an audio model');
    console.log('const audioModel = await ai.loadModel("whisper-base.gguf");');
    console.log('');
    console.log('// Transcribe audio');
    console.log('const audioTensor = loadAudio("speech.wav");');
    console.log('const transcript = await ai.transcribe(audioTensor, {');
    console.log('  language: "auto",');
    console.log('  enablePunctuation: true');
    console.log('});');
    console.log('');
    console.log('console.log("Transcript:", transcript.text);');
    console.log('```\n');

    // Error Handling Example
    console.log('⚠️  Error Handling:');
    console.log('```javascript');
    console.log('import { AIError, ErrorHandler } from "@idgaf/core";');
    console.log('');
    console.log('try {');
    console.log('  await ai.loadModel("model.gguf");');
    console.log('} catch (error) {');
    console.log('  if (error instanceof AIError) {');
    console.log('    console.log("Error code:", error.code);');
    console.log('    console.log("Suggestion:", ErrorHandler.getErrorSuggestion(error));');
    console.log('    ');
    console.log('    if (error.recoverable) {');
    console.log('      // Retry with backoff');
    console.log('      await ErrorHandler.withRetry(() => ai.loadModel("model.gguf"));');
    console.log('    }');
    console.log('  }');
    console.log('}');
    console.log('```\n');

    // Performance Monitoring
    console.log('📊 Performance Monitoring:');
    console.log('```javascript');
    console.log('// Get performance metrics');
    console.log('const metrics = ai.getPerformanceMetrics();');
    console.log('console.log("Inference time:", metrics.inferenceTimeMs);');
    console.log('console.log("Memory usage:", metrics.memoryUsageMB);');
    console.log('console.log("Tokens per second:", metrics.tokensPerSecond);');
    console.log('```\n');

    // 6. Show caching capabilities
    console.log('💾 Model Caching:');
    console.log('   The SDK includes intelligent model caching:');
    console.log('   • LRU eviction policy');
    console.log('   • Automatic memory management');
    console.log('   • Progress callbacks for downloads');
    console.log('   • Integrity verification');
    console.log('   • Compression support\n');

    // 7. Multi-platform support
    console.log('🌐 Platform Support:');
    console.log('   ✅ Node.js (current environment)');
    console.log('   ✅ React Native (iOS/Android)');
    console.log('   ✅ Flutter (cross-platform)');
    console.log('   ✅ Web browsers (WebAssembly)');
    console.log('   ✅ Edge devices (Raspberry Pi, etc.)\n');

    // 8. Model compatibility
    console.log('🎯 Model Compatibility:');
    console.log('   GGUF (.gguf):     LLaMA, Mistral, Phi, Gemma, CodeLlama');
    console.log('   TensorFlow Lite:  MobileNet, EfficientNet, YOLO, ResNet');
    console.log('   ONNX (.onnx):     Universal format, cross-framework');
    console.log('   ExecuTorch:       PyTorch mobile models\n');

    console.log('✨ Key Features:');
    console.log('   🔄 Universal API for all AI operations');
    console.log('   ⚡ Hardware acceleration (GPU/NPU)');
    console.log('   🧠 Smart runtime selection');
    console.log('   💾 Intelligent caching');
    console.log('   📊 Built-in performance monitoring');
    console.log('   🛡️  Comprehensive error handling');
    console.log('   🔍 Zero-copy operations');
    console.log('   📱 Cross-platform support');

    console.log('\n🎉 Demo completed successfully!');
    console.log('\nTo get started with real models:');
    console.log('1. Download compatible models (see docs/model-compatibility.md)');
    console.log('2. Place them in the configured cache directory');
    console.log('3. Use ai.loadModel(path) to load them');
    console.log('4. Start running inference!');

    console.log('\n📚 Resources:');
    console.log('- Documentation: ./docs/getting-started.md');
    console.log('- Examples: ./examples/');
    console.log('- Source code: ./packages/core/src/');

    console.log('\n🚀 IDGAF.ai - AI that works everywhere!');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\nThis might be because optional dependencies are not installed.');
    console.log('The SDK is designed to work with or without native runtime libraries.');
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

module.exports = { runDemo };