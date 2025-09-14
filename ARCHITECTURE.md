# IDGAF.ai Architecture

## Overview

IDGAF.ai is a production-ready, unified on-device AI SDK that provides a single API for running any AI model format on any platform. The architecture follows a modular, extensible design that separates concerns while maintaining optimal performance.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                     │ ← User Code
├─────────────────────────────────────────────────────────┤
│                    UnifiedAI API                        │ ← Single Interface
├─────────────────────────────────────────────────────────┤
│  Model Registry │  Cache Manager │  Hardware Detection  │ ← Core Services
├─────────────────┼────────────────┼────────────────────────┤
│  GGUF Adapter   │ TFLite Adapter │   ONNX Adapter        │ ← Format Adapters
├─────────────────┼────────────────┼────────────────────────┤
│   llama.cpp     │  TensorFlow    │   ONNX Runtime        │ ← Native Runtimes
│                 │     Lite       │                       │
└─────────────────────────────────────────────────────────┘
```

## Core Components

### 1. IDGAF Class (`src/IDGAF.ts`)

The main SDK interface that provides:
- **Model Loading**: Automatic format detection and adapter selection
- **Unified Operations**: generate(), chat(), classify(), detect(), transcribe(), etc.
- **Performance Monitoring**: Real-time metrics and telemetry
- **Error Handling**: Comprehensive error management with recovery suggestions

```typescript
class IDGAF {
  // Core operations
  async loadModel(pathOrUrl: string, options?: ModelOptions): Promise<LoadedModel>
  async *generate(prompt: string, options?: GenerateOptions): AsyncGenerator<string>
  async *chat(messages: ChatMessage[], options?: ChatOptions): AsyncGenerator<string>
  async classify(image: Tensor, options?: ClassifyOptions): Promise<ClassificationResult>
  // ... more operations
}
```

### 2. Model Registry (`src/runtime/ModelRegistry.ts`)

Central registry for managing adapters and loaded models:
- **Adapter Management**: Registration and selection of format handlers
- **Model Tracking**: Keep track of loaded models and memory usage
- **Smart Selection**: Choose best adapter based on format, hardware, capabilities

### 3. Model Adapters (`src/adapters/`)

Format-specific implementations that handle different model types:

#### GGUF Adapter (`GGUFAdapter.ts`)
- **Runtime**: llama.cpp
- **Models**: LLMs, embedding models
- **Features**: Streaming, quantization, context management
- **Hardware**: CPU, GPU acceleration

#### TensorFlow Lite Adapter (`TFLiteAdapter.ts`)
- **Runtime**: TensorFlow Lite
- **Models**: Vision, audio models
- **Features**: Hardware delegation, quantization
- **Hardware**: CPU, GPU, NPU acceleration

### 4. Runtime Services (`src/runtime/`)

#### ModelManager (`ModelManager.ts`)
- Model downloading with progress tracking
- Checksum verification
- Automatic format detection
- Local caching

#### HardwareDetection (`HardwareDetection.ts`)
- Platform detection (iOS, Android, Web, Node.js)
- Hardware capability assessment (GPU, NPU, memory)
- Optimal configuration recommendations

#### LRUCache (`LRUCache.ts`)
- Least Recently Used eviction policy
- Memory-aware caching
- Performance statistics
- Automatic cleanup

### 5. Streaming & Utilities (`src/utils/`)

#### StreamingUtils (`StreamingUtils.ts`)
- Backpressure handling
- Stream cancellation
- Timeout management
- Token buffering

#### ErrorHandler (`ErrorHandler.ts`)
- Typed error system with recovery suggestions
- Automatic retry logic
- Context-aware error messages

## Data Flow

### Model Loading Flow
```
1. User calls idgaf.loadModel(path)
2. ModelManager determines if download needed
3. ModelRegistry selects best adapter
4. Adapter loads model using native runtime
5. Model registered in cache and registry
6. LoadedModel returned to user
```

### Inference Flow
```
1. User calls idgaf.generate() or other operation
2. IDGAF finds compatible loaded model
3. Operation delegated to model's adapter
4. Adapter handles native runtime interaction
5. Results streamed back through async generator
6. Performance metrics updated
```

## Key Design Patterns

### 1. Adapter Pattern
Each model format has a dedicated adapter implementing the `ModelAdapter` interface:
- Consistent interface for different runtimes
- Easy to extend with new formats
- Runtime-specific optimizations

### 2. Strategy Pattern
Hardware detection determines optimal configuration:
- Different strategies for different platforms
- Automatic fallback mechanisms
- Performance-oriented decisions

### 3. Observer Pattern
Performance monitoring and error handling:
- Real-time metrics collection
- Event-driven error reporting
- Telemetry integration

### 4. Factory Pattern
Model and adapter creation:
- Automatic adapter selection
- Configuration-based instantiation
- Dependency injection support

## Memory Management

### Model Caching
- **LRU Eviction**: Automatically removes least recently used models
- **Size Limits**: Configurable maximum cache size
- **Reference Counting**: Tracks model usage
- **Memory Monitoring**: Real-time memory usage tracking

### Zero-Copy Operations
- **Tensor Sharing**: Direct memory mapping when possible
- **Stream Processing**: Minimal buffering for real-time operations
- **Native Integration**: Direct integration with runtime memory

## Performance Optimizations

### Hardware Acceleration
- **GPU Delegates**: Automatic GPU utilization when available
- **NPU Support**: Neural Processing Unit acceleration
- **Platform Optimization**: iOS Metal, Android NNAPI, etc.

### Model Optimizations
- **Quantization**: 2-bit to 32-bit precision options
- **Context Caching**: Reuse computation for similar inputs
- **Batch Processing**: Efficient multi-input handling

### Streaming Optimizations
- **Backpressure**: Prevents memory overflow
- **Token Buffering**: Smooth output delivery
- **Cancellation**: Clean resource cleanup

## Security Considerations

### Model Integrity
- **Checksum Verification**: SHA-256 validation
- **Secure Downloads**: HTTPS enforcement
- **Path Validation**: Prevent directory traversal

### Memory Safety
- **Bounds Checking**: Input validation
- **Resource Limits**: Memory and time constraints
- **Error Isolation**: Prevent crashes from propagating

## Extensibility

### Adding New Formats
1. Implement `ModelAdapter` interface
2. Add to supported formats list
3. Register with ModelRegistry
4. Add tests and documentation

### Platform Support
1. Implement platform-specific detection
2. Add hardware-specific optimizations
3. Create platform bindings
4. Test on target platform

### Custom Operations
1. Extend `LoadedModel` interface
2. Implement in relevant adapters
3. Add to IDGAF API
4. Update type definitions

## Testing Strategy

### Unit Tests
- Individual component testing
- Mock external dependencies
- Edge case handling
- Error condition testing

### Integration Tests
- Cross-component interaction
- Real model loading (small models)
- Platform-specific behavior
- Performance benchmarks

### End-to-End Tests
- Complete workflows
- Multiple model formats
- Cross-platform compatibility
- Real-world scenarios

## Deployment Considerations

### Bundle Size
- Core SDK: ~200KB (minified)
- Optional adapters loaded on demand
- Tree-shaking support for unused features
- Platform-specific builds

### Dependency Management
- Optional peer dependencies
- Graceful degradation without native runtimes
- Version compatibility checking
- Automatic fallbacks

### Performance Monitoring
- Built-in telemetry
- Performance metrics collection
- Memory usage tracking
- Error reporting

## Future Architecture Enhancements

### Planned Features
- **WebAssembly Runtime**: Full web compatibility
- **Distributed Inference**: Multi-device coordination
- **Model Conversion**: Automatic format conversion
- **Edge Optimization**: IoT device support

### Scalability
- **Model Sharding**: Large model distribution
- **Pipeline Parallelism**: Multi-stage processing
- **Dynamic Loading**: On-demand model loading
- **Cloud Integration**: Hybrid on-device/cloud inference

This architecture provides a solid foundation for unified AI inference while maintaining flexibility, performance, and ease of use across all supported platforms.