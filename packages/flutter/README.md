# idgaf_ai

Flutter plugin for IDGAF.ai - Unified On-Device AI SDK

## Installation

Add this to your `pubspec.yaml`:

```yaml
dependencies:
  idgaf_ai: ^0.1.0
```

Then run:

```bash
flutter pub get
```

## Usage

```dart
import 'package:idgaf_ai/idgaf_ai.dart';

class MyApp extends StatefulWidget {
  @override
  _MyAppState createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  late IdgafAi _idgaf;

  @override
  void initState() {
    super.initState();
    _initializeIDGAF();
  }

  Future<void> _initializeIDGAF() async {
    _idgaf = IdgafAi(
      modelCachePath: './models',
      hardware: IdgafHardwareConfig(
        preferGPU: true,
        preferNPU: true,
      ),
    );

    await _idgaf.registerAdapter(IdgafAdapterType.gguf);
    await _idgaf.registerAdapter(IdgafAdapterType.tflite);
  }

  Future<void> _generateText() async {
    await _idgaf.loadModel('model.gguf');

    await for (final token in _idgaf.generate('Hello world')) {
      print(token);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('IDGAF.ai Flutter Demo'),
        ),
        body: Center(
          child: ElevatedButton(
            onPressed: _generateText,
            child: const Text('Generate Text'),
          ),
        ),
      ),
    );
  }
}
```

## Platform Support

- **iOS**: Metal Performance Shaders, Neural Engine
- **Android**: Vulkan, NNAPI, GPU delegates
- **Web**: WebAssembly with WebGPU (coming soon)

## Features

- Cross-platform AI inference
- Hardware acceleration
- Streaming text generation
- Image classification
- Audio transcription
- Real-time performance

## Documentation

See the [main IDGAF.ai documentation](../../README.md) for complete API reference.

## License

MIT