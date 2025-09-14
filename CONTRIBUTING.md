# Contributing to IDGAF.ai

Welcome! We're excited to have you contribute to IDGAF.ai. This guide will help you get started.

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git
- TypeScript knowledge
- Understanding of AI/ML concepts (helpful but not required)

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/idgaf.ai.git
   cd idgaf.ai
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Build Packages**
   ```bash
   npm run build
   ```

4. **Run Tests**
   ```bash
   npm test
   ```

## 🏗️ Project Structure

```
idgaf.ai/
├── packages/
│   ├── core/           # Core SDK functionality
│   ├── react-native/   # React Native bindings
│   ├── flutter/        # Flutter plugin
│   └── cli/           # Command-line tools
├── examples/          # Example applications
├── docs/             # Documentation
└── tests/            # Integration tests
```

## 🎯 How to Contribute

### 1. Choose Your Area

**Core SDK** (`packages/core/`)
- Model adapters (GGUF, TFLite, ONNX, ExecuTorch)
- Runtime optimizations
- Caching and memory management
- Streaming and performance

**Platform Bindings**
- React Native (`packages/react-native/`)
- Flutter (`packages/flutter/`)
- CLI tools (`packages/cli/`)

**Documentation & Examples**
- Getting started guides
- API documentation
- Tutorial applications
- Platform-specific examples

### 2. Development Workflow

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Write clean, well-documented code
   - Follow existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   npm test                    # Run all tests
   npm run test:core          # Test core package
   npm run test:integration   # Run integration tests
   ```

4. **Build and Validate**
   ```bash
   npm run build              # Build all packages
   npm run lint               # Check code style
   npm run typecheck          # Verify types
   ```

5. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "feat: add new model adapter for XYZ"
   ```

## 📝 Code Standards

### Commit Message Format

Use [Conventional Commits](https://conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with TypeScript rules
- **Naming**: camelCase for variables, PascalCase for classes

### Testing Guidelines

- **Unit Tests**: For individual functions and classes
- **Integration Tests**: For component interactions
- **End-to-End Tests**: For complete workflows
- **Performance Tests**: For benchmarking

Example test structure:
```typescript
describe('ModelAdapter', () => {
  describe('loadModel', () => {
    it('should load GGUF models correctly', async () => {
      // Test implementation
    });
  });
});
```

## 🔧 Adding New Features

### Model Adapters

To add a new model format adapter:

1. **Create the Adapter**
   ```typescript
   // packages/core/src/adapters/NewFormatAdapter.ts
   export class NewFormatAdapter implements ModelAdapter {
     readonly format = 'newformat' as const;
     readonly supportedTypes = ['llm'] as const;

     canHandle(modelPath: string): boolean {
       return modelPath.endsWith('.newformat');
     }

     async loadModel(modelPath: string): Promise<LoadedModel> {
       // Implementation
     }
   }
   ```

2. **Add Tests**
   ```typescript
   // packages/core/src/adapters/__tests__/NewFormatAdapter.test.ts
   describe('NewFormatAdapter', () => {
     // Test cases
   });
   ```

3. **Update Exports**
   ```typescript
   // packages/core/src/index.ts
   export { NewFormatAdapter } from './adapters/NewFormatAdapter';
   ```

### Platform Support

To add a new platform:

1. **Create Package Structure**
   ```
   packages/new-platform/
   ├── src/
   ├── package.json
   ├── README.md
   └── tsconfig.json
   ```

2. **Implement Platform Bindings**
3. **Add Platform-Specific Examples**
4. **Update Main Documentation**

## 🐛 Reporting Issues

When reporting bugs, please include:

- **Environment**: OS, Node.js version, package versions
- **Steps to Reproduce**: Clear, minimal example
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error logs
- **Code Sample**: Minimal reproduction case

## 📋 Pull Request Process

1. **Ensure CI Passes**
   - All tests pass
   - Code builds successfully
   - Linting passes
   - Type checking passes

2. **Update Documentation**
   - Update README if needed
   - Add/update API documentation
   - Include examples for new features

3. **Add Tests**
   - Unit tests for new functionality
   - Integration tests for interactions
   - Update existing tests if needed

4. **Request Review**
   - Provide clear PR description
   - Explain the changes made
   - Reference any related issues

## 🎉 Recognition

Contributors will be:
- Listed in our CONTRIBUTORS.md file
- Mentioned in release notes
- Invited to our contributor Discord channel
- Eligible for special contributor badges

## 📞 Getting Help

- **Discord**: Join our [contributor channel](https://discord.gg/idgaf-ai)
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and ideas
- **Email**: contributors@idgaf.ai

## 📜 Code of Conduct

We follow the [Contributor Covenant](https://www.contributor-covenant.org/). Please be respectful, inclusive, and constructive in all interactions.

## 🔒 Security

For security vulnerabilities, please email security@idgaf.ai instead of creating a public issue.

---

Thank you for contributing to IDGAF.ai! Every contribution, no matter how small, helps make AI more accessible to developers everywhere. 🚀