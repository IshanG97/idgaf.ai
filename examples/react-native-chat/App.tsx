import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { IDGAF, ChatMessage, GGUFAdapter } from '@idgaf/core';

interface ChatComponentState {
  messages: ChatMessage[];
  currentMessage: string;
  isLoading: boolean;
  modelLoaded: boolean;
  streamingResponse: string;
}

const ChatApp: React.FC = () => {
  const [state, setState] = useState<ChatComponentState>({
    messages: [],
    currentMessage: '',
    isLoading: false,
    modelLoaded: false,
    streamingResponse: '',
  });

  const [ai, setAi] = useState<IDGAF | null>(null);

  useEffect(() => {
    initializeAI();
  }, []);

  const initializeAI = async () => {
    try {
      const aiInstance = new IDGAF({
        modelCachePath: './models',
        logLevel: 'info',
        hardware: {
          preferGPU: true,
          preferNPU: true,
        }
      });

      // Register adapters
      aiInstance.registry?.registerAdapter?.(new GGUFAdapter());

      setAi(aiInstance);

      // Add welcome message
      setState(prev => ({
        ...prev,
        messages: [{
          role: 'system',
          content: 'Welcome to IDGAF.ai Chat! Load a model to get started.',
          timestamp: new Date(),
        }],
      }));

    } catch (error) {
      console.error('Failed to initialize AI:', error);
      Alert.alert('Error', 'Failed to initialize AI SDK');
    }
  };

  const loadModel = async () => {
    if (!ai) return;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // In a real app, you would load an actual model
      // const model = await ai.loadModel('path/to/your/model.gguf');

      setState(prev => ({
        ...prev,
        modelLoaded: true,
        isLoading: false,
        messages: [
          ...prev.messages,
          {
            role: 'system',
            content: 'Model loaded successfully! You can now start chatting.',
            timestamp: new Date(),
          }
        ],
      }));

    } catch (error) {
      console.error('Failed to load model:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      Alert.alert('Error', 'Failed to load model. Please check the model path.');
    }
  };

  const sendMessage = async () => {
    if (!ai || !state.currentMessage.trim() || state.isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: state.currentMessage.trim(),
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      currentMessage: '',
      isLoading: true,
      streamingResponse: '',
    }));

    try {
      if (!state.modelLoaded) {
        // Simulate response when no model is loaded
        const simulatedResponse = `I received your message: "${userMessage.content}". However, no AI model is currently loaded. Please load a model first to get actual AI responses.`;

        setState(prev => ({
          ...prev,
          isLoading: false,
          messages: [
            ...prev.messages,
            {
              role: 'assistant',
              content: simulatedResponse,
              timestamp: new Date(),
            }
          ],
        }));
        return;
      }

      // Real AI chat when model is loaded
      const chatHistory = [...state.messages, userMessage];
      let fullResponse = '';

      for await (const token of ai.chat(chatHistory, {
        maxTokens: 200,
        temperature: 0.7,
        stream: true,
      })) {
        fullResponse += token;
        setState(prev => ({
          ...prev,
          streamingResponse: fullResponse,
        }));
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        streamingResponse: '',
        messages: [
          ...prev.messages,
          {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date(),
          }
        ],
      }));

    } catch (error) {
      console.error('Chat error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        streamingResponse: '',
        messages: [
          ...prev.messages,
          {
            role: 'assistant',
            content: 'Sorry, I encountered an error processing your message.',
            timestamp: new Date(),
          }
        ],
      }));
    }
  };

  const clearChat = () => {
    setState(prev => ({
      ...prev,
      messages: [{
        role: 'system',
        content: 'Chat cleared. Ready for new conversation!',
        timestamp: new Date(),
      }],
    }));
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';

    return (
      <View
        key={index}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessage : isSystem ? styles.systemMessage : styles.assistantMessage,
        ]}
      >
        <Text style={styles.messageRole}>
          {message.role.charAt(0).toUpperCase() + message.role.slice(1)}
        </Text>
        <Text style={styles.messageContent}>{message.content}</Text>
        {message.timestamp && (
          <Text style={styles.messageTime}>
            {message.timestamp.toLocaleTimeString()}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>IDGAF.ai Chat</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.button, styles.loadButton]}
            onPress={loadModel}
            disabled={state.isLoading}
          >
            <Text style={styles.buttonText}>
              {state.modelLoaded ? '✅ Model Loaded' : '📥 Load Model'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearChat}
          >
            <Text style={styles.buttonText}>🗑️ Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {state.messages.map(renderMessage)}

        {state.streamingResponse && (
          <View style={[styles.messageContainer, styles.assistantMessage]}>
            <Text style={styles.messageRole}>Assistant</Text>
            <Text style={styles.messageContent}>{state.streamingResponse}</Text>
            <Text style={styles.streamingIndicator}>✍️ typing...</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={state.currentMessage}
          onChangeText={(text) => setState(prev => ({ ...prev, currentMessage: text }))}
          placeholder="Type your message..."
          multiline
          maxLength={1000}
          editable={!state.isLoading}
        />
        <TouchableOpacity
          style={[styles.sendButton, state.isLoading && styles.disabledButton]}
          onPress={sendMessage}
          disabled={state.isLoading || !state.currentMessage.trim()}
        >
          <Text style={styles.sendButtonText}>
            {state.isLoading ? '⏳' : '📤'}
          </Text>
        </TouchableOpacity>
      </View>

      {state.isLoading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>
            {state.modelLoaded ? 'Generating response...' : 'Loading model...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  loadButton: {
    backgroundColor: '#4CAF50',
  },
  clearButton: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#2196F3',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  systemMessage: {
    backgroundColor: '#fff3e0',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    opacity: 0.8,
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.6,
  },
  streamingIndicator: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#2196F3',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    fontSize: 18,
  },
  loadingOverlay: {
    position: 'absolute',
    bottom: 80,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 14,
  },
});

export default ChatApp;