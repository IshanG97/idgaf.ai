const { IDGAF, GGUFAdapter, TFLiteAdapter } = require('@idgaf/core');

async function main() {
  console.log('🚀 Starting IDGAF.ai Node.js Example');

  const ai = new IDGAF({
    modelCachePath: './models',
    maxCacheSize: 4 * 1024 * 1024 * 1024, // 4GB
    logLevel: 'info'
  });

  // Register adapters
  ai.registry.registerAdapter(new GGUFAdapter());
  ai.registry.registerAdapter(new TFLiteAdapter());

  console.log('🔧 Hardware Info:', await ai.getHardwareInfo());

  try {
    // Example 1: Load and use a text generation model
    console.log('\n📝 Loading LLM model...');

    // In a real scenario, you would download or provide a real model
    // const model = await ai.loadModel('https://huggingface.co/microsoft/DialoGPT-medium/resolve/main/pytorch_model.bin');
    console.log('Note: This example shows the API usage. In production, provide a real model URL or file path.');

    // Example 2: Text Generation
    console.log('\n💬 Text Generation Example:');
    const prompt = "Tell me about artificial intelligence";

    try {
      console.log(`Prompt: ${prompt}`);
      console.log('Response:');

      let fullResponse = '';
      for await (const token of ai.generate(prompt, {
        maxTokens: 100,
        temperature: 0.7,
        stream: true
      })) {
        process.stdout.write(token);
        fullResponse += token;
      }
      console.log('\n');

    } catch (error) {
      console.log('💡 To use text generation, load a compatible GGUF model first');
      console.log('   Example: await ai.loadModel("path/to/llama-model.gguf")');
    }

    // Example 3: Chat Completion
    console.log('\n💬 Chat Completion Example:');
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'What is machine learning?' }
    ];

    try {
      console.log('Messages:', JSON.stringify(messages, null, 2));
      console.log('Response:');

      for await (const token of ai.chat(messages, {
        maxTokens: 100,
        temperature: 0.7
      })) {
        process.stdout.write(token);
      }
      console.log('\n');

    } catch (error) {
      console.log('💡 To use chat completion, load a compatible GGUF model first');
    }

    // Example 4: Image Classification (would need a TFLite model)
    console.log('\n🖼️  Image Classification Example:');
    try {
      // Create a dummy tensor for demonstration
      const imageTensor = {
        data: new Float32Array(224 * 224 * 3), // Example image data
        shape: [1, 224, 224, 3],
        dtype: 'float32'
      };

      // Fill with random data for demo
      for (let i = 0; i < imageTensor.data.length; i++) {
        imageTensor.data[i] = Math.random();
      }

      const result = await ai.classify(imageTensor, {
        topK: 5,
        threshold: 0.1
      });

      console.log('Top 5 predictions:');
      result.top(5).forEach((pred, i) => {
        console.log(`${i + 1}. ${pred.label}: ${(pred.confidence * 100).toFixed(2)}%`);
      });

    } catch (error) {
      console.log('💡 To use image classification, load a compatible TFLite vision model first');
      console.log('   Example: await ai.loadModel("path/to/mobilenet.tflite")');
    }

    // Example 5: Embeddings
    console.log('\n🔢 Embeddings Example:');
    try {
      const text = "This is a sample text for embedding generation";
      const embeddings = await ai.embed(text, {
        normalize: true
      });

      console.log(`Text: "${text}"`);
      console.log(`Embedding dimensions: ${embeddings.length}`);
      console.log(`First 10 dimensions: [${Array.from(embeddings.slice(0, 10)).map(x => x.toFixed(4)).join(', ')}...]`);

    } catch (error) {
      console.log('💡 To use embeddings, load a compatible embedding model first');
      console.log('   Example: await ai.loadModel("path/to/sentence-transformer.gguf")');
    }

    // Example 6: Performance Metrics
    console.log('\n📊 Performance Metrics:');
    const allMetrics = ai.getPerformanceMetrics();
    if (allMetrics instanceof Map && allMetrics.size > 0) {
      for (const [modelId, metrics] of allMetrics.entries()) {
        console.log(`Model ${modelId}:`);
        console.log(`  - Inference time: ${metrics.inferenceTimeMs}ms`);
        console.log(`  - Memory usage: ${metrics.memoryUsageMB?.toFixed(2)}MB`);
        if (metrics.tokensPerSecond) {
          console.log(`  - Tokens/second: ${metrics.tokensPerSecond.toFixed(2)}`);
        }
      }
    } else {
      console.log('No models loaded - no metrics available');
    }

    // Example 7: Model Management
    console.log('\n🔧 Model Management:');
    const loadedModels = ai.getLoadedModels();
    console.log(`Loaded models: ${loadedModels.length}`);

    loadedModels.forEach(model => {
      console.log(`- ${model.id} (${model.info.format})`);
      console.log(`  Type: ${model.info.type}`);
      console.log(`  Size: ${(model.info.size / (1024 * 1024)).toFixed(2)}MB`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 This example demonstrates the IDGAF.ai API structure.');
    console.log('   To run actual inference, provide real model files.');
    console.log('\nSupported model formats:');
    console.log('- .gguf files (LLaMA, Mistral, etc.)');
    console.log('- .tflite files (MobileNet, EfficientNet, etc.)');
    console.log('- .onnx files (various models)');
    console.log('- .pte files (PyTorch ExecuTorch)');
  }

  console.log('\n✅ Example completed!');
}

if (require.main === module) {
  main().catch(console.error);
}