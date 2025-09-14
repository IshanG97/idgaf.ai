# Getting Started with IDGAF.ai

Welcome to IDGAF.ai, the unified on-device AI SDK that makes it easy to run any AI model on any device with a single, consistent API.

## Installation

### Node.js / Web
```bash
npm install @idgaf/core
```

### React Native
```bash
npm install @idgaf/core @idgaf/react-native
```

### Flutter
```bash
flutter pub add idgaf_ai
```

## Basic Setup

### 1. Initialize the SDK

```typescript
import { IDGAF } from '@idgaf/core';

const ai = new IDGAF({
  modelCachePath: './models',     // Where to store models
  maxCacheSize: 2 * 1024 * 1024 * 1024, // 2GB cache limit
  logLevel: 'info',               // debug, info, warn, error
  enableTelemetry: false,         // Optional performance tracking
  hardware: {
    preferGPU: true,              // Use GPU acceleration when available
    preferNPU: true,              // Use Neural Processing Unit when available
    maxMemoryMB: 4096             // Maximum memory usage
  }
});
```

### 2. Register Adapters

IDGAF.ai uses adapters to support different model formats. Register the ones you need:

```typescript
import { GGUFAdapter, TFLiteAdapter, ONNXAdapter } from '@idgaf/core';

// For LLM models (.gguf format)
ai.registry.registerAdapter(new GGUFAdapter());

// For vision/audio models (.tflite format)
ai.registry.registerAdapter(new TFLiteAdapter());

// For general purpose models (.onnx format)
ai.registry.registerAdapter(new ONNXAdapter());
```

### 3. Load Your First Model

```typescript
// From a local file
const model = await ai.loadModel('./models/llama-3.2-3b.gguf');

// From a URL (will be downloaded and cached)
const model = await ai.loadModel('https://huggingface.co/model.gguf', {
  onProgress: (progress, status) => {
    console.log(`Download: ${progress}% - ${status}`);
  }
});

// With specific options
const model = await ai.loadModel('model.gguf', {
  quantization: '4bit',    // Reduce memory usage
  contextLength: 4096,     // Context window size
  temperature: 0.7         // Default sampling temperature
});
```

### 4. Start Using AI Operations

#### Text Generation
```typescript
// Simple generation
for await (const token of ai.generate("What is artificial intelligence?")) {
  process.stdout.write(token);
}

// With options
const fullResponse = '';
for await (const token of ai.generate("Tell me a story", {
  maxTokens: 200,
  temperature: 0.8,
  topP: 0.9,
  stopSequences: ['\n\n', 'THE END']
})) {
  fullResponse += token;
  console.log('Streaming:', token);
}
```

#### Chat Completion
```typescript
const messages = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Explain quantum computing simply.' }
];

for await (const token of ai.chat(messages, {
  maxTokens: 300,
  temperature: 0.7
})) {
  process.stdout.write(token);
}
```

#### Image Classification
```typescript
// Load an image as a tensor (you'll need to implement this based on your platform)
const imageTensor = {
  data: new Float32Array(224 * 224 * 3), // Your image data
  shape: [1, 224, 224, 3],               // Batch, Height, Width, Channels
  dtype: 'float32'
};

const result = await ai.classify(imageTensor, {
  topK: 5,          // Top 5 predictions
  threshold: 0.1    // Minimum confidence threshold
});

console.log('Top predictions:');
result.top(5).forEach((pred, i) => {
  console.log(`${i + 1}. ${pred.label}: ${(pred.confidence * 100).toFixed(2)}%`);
});
```

#### Speech Recognition
```typescript
// Audio tensor (16kHz, mono)
const audioTensor = {
  data: new Float32Array(audioSamples),
  shape: [audioSamples.length],
  dtype: 'float32'
};

const result = await ai.transcribe(audioTensor, {
  language: 'auto',           // Auto-detect language
  enablePunctuation: true,    // Add punctuation
  enableDiarization: false    // Speaker identification
});

console.log('Transcript:', result.text);
console.log('Confidence:', result.confidence);
```

#### Embeddings
```typescript
const embeddings = await ai.embed("This is a sample text for embedding", {
  normalize: true,    // L2 normalize the embeddings
  pooling: 'mean'     // Pooling strategy
});

console.log(`Embedding dimensions: ${embeddings.length}`);
console.log(`First few values: [${embeddings.slice(0, 5).join(', ')}]`);
```

## Working with Multiple Models

```typescript
// Load multiple models for different tasks
const llmModel = await ai.loadModel('llama-3.2-3b.gguf');
const visionModel = await ai.loadModel('mobilenet-v3.tflite');
const audioModel = await ai.loadModel('whisper-base.gguf');

// The SDK automatically routes operations to the appropriate model
const chatResponse = await ai.generate("Hello"); // Uses LLM model
const imageClass = await ai.classify(image);     // Uses vision model
const transcript = await ai.transcribe(audio);   // Uses audio model
```

## Model Management

```typescript
// Check loaded models
const models = ai.getLoadedModels();
console.log(`Loaded ${models.length} models`);

models.forEach(model => {
  console.log(`- ${model.id}: ${model.info.format} (${model.info.type})`);
});

// Unload a specific model to free memory
await ai.unloadModel('model-id');

// Get memory usage
const memoryMB = ai.registry.getMemoryUsage() / (1024 * 1024);
console.log(`Using ${memoryMB.toFixed(2)}MB memory`);
```

## Performance Monitoring

```typescript
// Get performance metrics
const metrics = ai.getPerformanceMetrics();

if (metrics instanceof Map) {
  for (const [modelId, perf] of metrics) {
    console.log(`Model ${modelId}:`);
    console.log(`  Inference: ${perf.inferenceTimeMs}ms`);
    console.log(`  Memory: ${perf.memoryUsageMB}MB`);
    if (perf.tokensPerSecond) {
      console.log(`  Speed: ${perf.tokensPerSecond.toFixed(1)} tokens/sec`);
    }
  }
}

// Hardware information
const hardware = ai.getHardwareInfo();
console.log('Hardware:', hardware);
```

## Error Handling

```typescript
import { AIError, ErrorHandler } from '@idgaf/core';

try {
  const model = await ai.loadModel('nonexistent-model.gguf');
} catch (error) {
  if (error instanceof AIError) {
    console.log('Error code:', error.code);
    console.log('Suggestion:', ErrorHandler.getErrorSuggestion(error));

    // Retry if the error is recoverable
    if (error.recoverable) {
      const model = await ErrorHandler.withRetry(
        () => ai.loadModel('backup-model.gguf'),
        3,    // Max 3 retries
        1000  // 1 second backoff
      );
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Platform-Specific Notes

### iOS
- Automatically uses Metal Performance Shaders for GPU acceleration
- Neural Engine (NPU) support for compatible models
- Optimized for iOS 13+

### Android
- Supports GPU delegates (Vulkan, OpenGL)
- NNAPI for hardware acceleration
- Hexagon DSP support on Qualcomm devices
- Minimum API level 24

### Web
- WebAssembly runtime for compatibility
- WebGPU acceleration where supported
- Service Worker caching for models

### React Native
- Native module with JavaScript bindings
- Platform-specific optimizations
- Automatic memory management

## Next Steps

- [Model Compatibility Guide](./model-compatibility.md) - Learn which models work with which adapters
- [Performance Tuning](./performance-tuning.md) - Optimize for your specific use case
- [Platform Integration](./platform-integration.md) - Platform-specific integration guides
- [Examples](../examples/) - Complete example applications
- [API Reference](./api-reference.md) - Detailed API documentation

## Common Issues

### Model Loading Fails
- Verify the model file exists and is accessible
- Check that you have sufficient memory
- Ensure the correct adapter is registered for the model format

### Poor Performance
- Enable hardware acceleration (`preferGPU: true`)
- Use quantized models for lower memory usage
- Adjust context length and batch size
- Check hardware capabilities with `ai.getHardwareInfo()`

### Out of Memory
- Reduce model size through quantization
- Decrease context length
- Unload unused models
- Increase cache limits if needed

## Support

- 📚 [Full Documentation](https://docs.idgaf.ai)
- 💬 [Discord Community](https://discord.gg/idgaf-ai)
- 🐛 [Report Issues](https://github.com/your-org/idgaf.ai/issues)
- 📧 [Email Support](mailto:support@idgaf.ai)