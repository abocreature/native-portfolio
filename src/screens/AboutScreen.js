import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';

export default function AboutScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Abigail Sutrich</Text>
                <Text style={styles.subtitle}>Cross-Platform Software Engineer</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#fff', padding: 30, borderRadius: 15, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevatio: 5 },
    title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 5 }
});