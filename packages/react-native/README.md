# @idgaf/react-native

React Native bindings for IDGAF.ai - Unified On-Device AI SDK

## Installation

```bash
npm install @idgaf/react-native
```

## Usage

```typescript
import { IDGAF, GGUFAdapter } from '@idgaf/react-native';

const App = () => {
  const [ai] = useState(() => {
    const instance = new IDGAF({
      modelCachePath: './models',
      hardware: {
        preferGPU: true,
        preferNPU: true
      }
    });

    instance.registry.registerAdapter(new GGUFAdapter());
    return instance;
  });

  const handleGenerate = async () => {
    const model = await ai.loadModel('model.gguf');

    for await (const token of ai.generate("Hello world")) {
      console.log(token);
    }
  };

  return (
    <View>
      {/* Your React Native UI */}
    </View>
  );
};
```

## Platform Support

- **iOS**: Metal Performance Shaders, Neural Engine support
- **Android**: Vulkan, NNAPI, GPU delegates, Hexagon DSP

## Features

- Native iOS and Android optimizations
- Hardware acceleration support
- Real-time streaming capabilities
- Background processing
- Memory-efficient model loading

## Documentation

See the [main IDGAF.ai documentation](../../README.md) for complete API reference.

## License

MIT