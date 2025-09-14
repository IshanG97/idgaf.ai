# @idgaf/cli

Command-line tools for IDGAF.ai - Model management and testing utilities

## Installation

```bash
npm install -g @idgaf/cli
```

## Usage

### Model Management

```bash
# Download a model
idgaf download https://huggingface.co/model.gguf

# List downloaded models
idgaf models list

# Get model info
idgaf models info model.gguf

# Clean up cache
idgaf models clean
```

### Testing and Benchmarking

```bash
# Test a model
idgaf test model.gguf --prompt "Hello world"

# Benchmark performance
idgaf benchmark model.gguf

# Run comprehensive tests
idgaf test-suite
```

### Hardware Information

```bash
# Check hardware capabilities
idgaf hardware

# Get optimal settings for current hardware
idgaf optimize
```

### Development Tools

```bash
# Validate model compatibility
idgaf validate model.gguf

# Convert between formats (coming soon)
idgaf convert model.gguf --to tflite

# Generate model metadata
idgaf metadata model.gguf
```

## Commands Reference

| Command | Description |
|---------|-------------|
| `download <url>` | Download a model from URL |
| `models list` | List all cached models |
| `models info <path>` | Show model information |
| `models clean` | Clean model cache |
| `test <path>` | Test model inference |
| `benchmark <path>` | Run performance benchmark |
| `hardware` | Show hardware information |
| `optimize` | Get optimal settings |
| `validate <path>` | Validate model compatibility |

## Configuration

Create a `.idgafrc` file in your project or home directory:

```json
{
  "modelCachePath": "./models",
  "logLevel": "info",
  "hardware": {
    "preferGPU": true,
    "preferNPU": true
  }
}
```

## Documentation

See the [main IDGAF.ai documentation](../../README.md) for complete information.

## License

MIT