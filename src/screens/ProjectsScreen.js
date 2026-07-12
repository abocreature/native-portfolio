import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Linking } from 'react-native';

const REPOS = [
    { id: '1', title: 'Entangled Philosophies', tech: 'MySQL • PHP • React • Node.js', link: 'https://github.com/mitchswise/Entangled-Philosophies' },
    { id: '2', title: 'MyRecipeBook', tech: 'MongoDB • Express • React • Node.js', link: 'https://github.com/COP4331C-SUMMER2020/ProjectTwo' },
    { id: '3', title: 'Contact Manager', tech: 'Linux • Apache • MySQL • PHP', link: 'https://github.com/COP4331C-SUMMER2020/ProjectOne' }
];

export default function ProjectsScreen() {
    return (
        <View style={styles.container}>
            <FlatList
                data={REPOS}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={styles.projectCard}>
                        <Text style={styles.projectTitle}>{item.title}</Text>
                        <Text style={styles.projectTech}>{item.tech}</Text>
                        <TouchableOpacity style={styles.btn} onPress={() => Linking.openURL(item.link)}>
                            <Text style={styles.btnText}>Open GitHub Repository</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 20 },
    projectCard: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15 },
    projectTitle: { fontSize: 20, fontWeight: 'bold' },
    projectTech: { fontSize: 14, color: '#888', marginVertical: 6 },
    btn: { backgroundColor: '#007AFF', padding: 12, borderRadius:8, alignItems: 'center', marginTop: 5 },
    btnText: { color: '#fff', fontWeight: '600' }
});