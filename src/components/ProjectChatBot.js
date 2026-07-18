import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';

export default function ProjectChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    const [messages, setMessages] = useState([
        { id: 'welcome', role: 'assistant', content: 'Hi! Ask me anything about the tech stacks behind my featured projects!'}
    ]);

    const flatListRef = useRef(null);

    const sendMessage = async () => {
        if (!input.trim() || loading) return;

        const userText = input;
        setInput('');

        // Attach user text to the local state viewport
        const updatedMessages = [
            ...messages,
            { id: String(Date.now()), role: 'user', content: userText }
        ];
        setMessages(updatedMessages);
        setLoading(true);

        try {
            // formatting payload
            const apiPayload = updatedMessages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // dispatch full chat log to Vercel execution route
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: apiPayload }),
            });

            const data = await response.json();

            if (data.response) {
                setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: data.response }]);
            } else {
                setMessages(prev => [...prev, { id: String(Date.now() + 1), role: 'assistant', content: 'Sorry, I lost my connection to the server.'}]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
    };

    if (!isOpen) {
        return (
            <TouchableOpacity style={styles.floatingButton} onPress={() => setIsOpen(true)} activeOpacity={0.7}>
                <Text style={styles.buttonText}>Ask an AI!</Text>
            </TouchableOpacity>
        )
    }

    return (
        <View style={styles.chatWindow}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>System Architecture Bot</Text>
                <TouchableOpacity onPress={() => setIsOpen(false)}>
                    <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messageList}
                renderItem={({ item }) => (
                    <View style={[styles.bubbleContainer, item.role === 'user' ? styles.userAlign : styles.aiAlign]}>
                        <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                            <Markdown style={item.role === 'user' ? userMarkdownStyles : aiMarkdownStyles}>
                                {item.content}
                            </Markdown>
                        </View>
                    </View>
                )}
                ListFooterComponent={loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#4B5563" />
                    </View>
                )}
            />

            <View style={styles.inputTray}>
                <TextInput
                    style={styles.inputField}
                    value={input}
                    onChangeText={setInput}
                    placeholder="Ask about my database structures..."
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={sendMessage}
                />
                <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                    <Text style={styles.sendButtonText}>Send</Text>
                </TouchableOpacity>
            </View>
        </View>        
    );
}

const userMarkdownStyles = {
  body: { color: '#FFF', fontSize: 13, lineHeight: 18 },
  strong: { fontWeight: 'bold', color: '#FFF' }
};

const aiMarkdownStyles = {
  body: { color: '#1F2937', fontSize: 13, lineHeight: 18 },
  strong: { fontWeight: 'bold', color: '#000' }
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 32,
    right: 32,
    backgroundColor: '#238636',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2ea44f',
    width: 140,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 9999,
  },
  buttonText: { 
    color: '#FFF', 
    fontWeight: '600', 
    fontSize: 14,
    fontFamily: 'monospace',
    letterSpacing: 0.5,
    textAlign: 'center'
  },
  chatWindow: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 330,
    height: 440,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    zIndex: 9999,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#111827',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  closeButton: { color: '#9CA3AF', fontSize: 16 },
  messageList: { padding: 16 },
  bubbleContainer: { width: '100%', marginBottom: 12, flexDirection: 'row' },
  userAlign: { justifyContent: 'flex-end' },
  aiAlign: { justifyContent: 'flex-start' },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#3B82F6' },
  aiBubble: { backgroundColor: '#F3F4F6' },
  userText: { color: '#FFF', fontSize: 13, lineHeight: 18 },
  aiText: { color: '#1F2937', fontSize: 13, lineHeight: 18 },
  loadingContainer: { paddingVertical: 8, alignItems: 'flex-start', paddingLeft: 12 },
  inputTray: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  inputField: {
    flex: 1,
    height: 38,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#000',
  },
  sendButton: { marginLeft: 8, backgroundColor: '#111827', borderRadius: 8, justifyContent: 'center', paddingHorizontal: 14 },
  sendButtonText: { color: '#FFF', fontWeight: '600', fontSize: 12 },
});