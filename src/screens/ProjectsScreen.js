import React, { useState } from 'react';
import { 
    StyleSheet, 
    Text, 
    View, 
    FlatList, 
    TouchableOpacity,
    Modal,
    ScrollView,
    ActivityIndicator,
    SafeAreaView, 
    Linking,
    useWindowDimensions
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Markdown from 'react-native-markdown-display';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolateColor,
} from 'react-native-reanimated';

const PROJECT_DATA = [
    {
        id: '1',
        title: 'This Portfolio!',
        tech: 'React Native • Expo • Node.js • GitHub API',
        link: 'https://github.com/abocreature/native-portfolio',
        owner: 'abocreature',
        repo: 'native-portfolio'
    },
    { 
        id: '2', 
        title: 'Entangled Philosophies', 
        tech: 'MySQL • PHP • React • Node.js', 
        link: 'https://github.com/mitchswise/Entangled-Philosophies',
        owner: 'mitchswise',
        repo: 'Entangled-Philosophies'
    },
    { 
        id: '3', 
        title: 'MyRecipeBook', 
        tech: 'MongoDB • Express • React • Node.js', 
        link: 'https://github.com/COP4331C-SUMMER2020/ProjectTwo',
        owner: 'COP4331C-SUMMER2020',
        repo: 'ProjectTwo' 
    },
    { 
        id: '4', 
        title: 'Contact Manager', 
        tech: 'Linux • Apache • MySQL • PHP', 
        link: 'https://github.com/COP4331C-SUMMER2020/ProjectOne',
        owner: 'COP4331C-SUMMER2020',
        repo: 'ProjectOne' 
    }
];

// Separate component for the animated button to handle hover and press states
function AnimatedButton ({ onPress, children, activeBg, hoverBg, defaultBg, border, defaultBorder }) {
    const isPressed = useSharedValue(0); // 0 = not pressed, 1 = pressed
    const isHovered = useSharedValue(0);

    const timingConfig = { duration: 120 };

    const gesture = Gesture.Tap()
        .onBegin(() => { isPressed.value = withTiming(1, timingConfig); })
        .onFinalize(() => { isPressed.value = withTiming(0, timingConfig); })
        .onTouchesCancelled(() => { isPressed.value = withTiming(0, timingConfig); })
        .onEnd(() => { if (onPress) onPress(); });

    const animatedStyle = useAnimatedStyle(() => {
        const scale = 1 - (isPressed.value * 0.05); // Scale down by 5% when pressed

        // Smooth color transition based on hover and press states
        const backgroundColor = interpolateColor(
            isPressed.value,
            [0, 1],
            [isHovered.value ? hoverBg : defaultBg, activeBg]
        );

        return {
            transform: [{ scale }],
            backgroundColor,
        };
    });

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View 
                style={[styles.baseBtn, animatedStyle, { borderColor: defaultBorder }]}
                // Handle hover state for web
                onPointerEnter={() => { isHovered.value = withTiming(1, timingConfig); }}
                onPointerLeave={() => { isHovered.value = withTiming(0, timingConfig); }}
            >
                {children}
            </Animated.View>
        </GestureDetector>
    );
}

// Main view component
export default function ProjectsScreen() {
    const { width: windowWidth } = useWindowDimensions();

    // Use a side-by-side configuration only on wider screens (e.g., tablets or desktops)
    const isLargeScreen = windowWidth > 768;

    const [modalVisible, setModalVisible] = useState(false);
    const [markdownContent, setMarkdownContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeRepoName, setActiveRepoName] = useState('');
    const [hasSelectedRepo, setHasSelectedRepo] = useState(false);

    // Downloads the readme as a string from server endpoints
    const fetchReadme = async (rawOwner, rawRepo) => {
        // Sanitize the owner and repo names
        const owner = String(rawOwner).trim();
        const repo = String(rawRepo).trim();
        setIsLoading(true);
        setActiveRepoName(repo);
        setHasSelectedRepo(true);

        const primaryURL = `https://raw.githubusercontent.com/${owner}/${repo}/main/README.md`;
        const fallbackURL = `https://raw.githubusercontent.com/${owner}/${repo}/master/README.md`;

        try {
            let response = await fetch(primaryURL);
            if (!response.ok) {
                // If that gets a 404, try the fallback
                response = await fetch (fallbackURL);
            }

            if (response.ok) {
                const text = await response.text();
                setMarkdownContent(text);
            } else {
                setMarkdownContent('# Error\nCould not locate a public README.md file in the \'${repo}\' repository root.');
            }
        } catch (error) {
            setMarkdownContent('# Connection Failure\nFailed to resolve server responses from GitHub.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.layoutWrapper, { flexDirection: isLargeScreen ? 'row' : 'column' }]}>
                <View style={[styles.leftColumn, { marginRight: isLargeScreen ? 16 : 0 }]}>
                    <FlatList
                        data={PROJECT_DATA}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <View style={styles.projectCard}>
                                <Text style={styles.projectTitle}>{item.title}</Text>
                                <Text style={styles.projectTech}>{item.tech}</Text>

                                <View style={styles.buttonRow}>
                                    <AnimatedButton 
                                        onPress={() => Linking.openURL(item.link)}
                                        defaultBg="#238636"
                                        hoverBg="#2ea44f"
                                        activeBg="#247233"
                                        defaultBorder="#2ea44f"
                                    >
                                        <Text style={styles.btnText}>Open GitHub Repository</Text>
                                    </AnimatedButton>

                                    <AnimatedButton 
                                        onPress={() => fetchReadme(item.owner, item.repo)}
                                        defaultBg="#1f6feb"
                                        hoverBg="#4690ff"
                                        activeBg="#2463c2"
                                        defaultBorder="#4690ff"
                                    >
                                        <Text style={styles.btnText}>Read Documentation</Text>
                                    </AnimatedButton>
                                </View>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.rightColumn}>
                    {!hasSelectedRepo ? (
                        <View style={styles.centeredView}>
                        </View>
                    ) : isLoading ? (
                        <View style={styles.centeredView}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>Fetching from GitHub...</Text>
                        </View>
                    ) : (
                        <View style={styles.readmeContainer}>
                            <View Style={styles.readmeHeader}>
                                <View style={styles.readmeHeaderTitleContainer}>
                                    <Text style={styles.readmeHeaderTitle}> {activeRepoName} / README.md</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => {
                                        setHasSelectedRepo(false);
                                        setActiveRepoName('');
                                        setMarkdownContent('');
                                    }}
                                >
                                    <Text style={styles.closeBtnText}>X Close</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={styles.markdownScroll}>
                                <Markdown style={markdownStyles}>
                                    {markdownContent}
                                </Markdown>
                            </ScrollView>
                        </View>
                    )}
                </View>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0d1117',
        padding: 16,
    },
    layoutWrapper: {
        flex: 1,
        padding: 16
    },

    leftColumn: {
        flex: 2
    },
    rightColumn: {
        flex: 3,
        backgroundColor: '#161b22',
        overflow: 'hidden',
    },

    projectCard: {
        backgroundColor: '#161b22',
        padding: 20,
        borderRadius: 6,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#30363d',
    },
    projectTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#c9d1d9',
    },
    projectTech: {
        fontSize: 13,
        color: '#8b949e',
        marginVertical: 8,
        fontFamily: 'monospace',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
        width: '100%',
    },

    // Combined common button styling
    baseBtn: {
        flex: 1,
        borderWidth: 1,
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        touchAction: 'none',
    },
    greenBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    btnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },

    closeBtn: {
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: [{ translateY: -15 }],
        backgroundColor: '#21262d',
        borderWidth: 1,
        borderColor: '#30363d',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        cursor: 'pointer',
        flexShrink: 0,
    },
    closeBtnText: {
        color: '#f85149',
        fontWeight: '600',
        fontSize: 13,
    },

    readmeContainer: {
        flex: 1,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363d',
    },
    readmeHeaderTitleContainer: {
        flex: 1,
        marginRight: 12,
        justifyContent: 'center',
    },
    readmeHeader: {
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#30363d',
        backgroundColor: '#1f242c',
        flexWrap: 'nowrap',
    },
    readmeHeaderTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#c9d1d9',
        fontFamily: 'monospace',
    },
    markdownScroll: {
        padding: 24,
    },

    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0d1117',
    },
    placeholderText: {
        color: '#8b949e',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        maxWidth: 300,
    },
    loadingText: {
        marginTop: 12,
        color: '#8b949e',
        fontWeight: '500',
    },
});

// Markdown style overrides to match GitHub
const markdownStyles = StyleSheet.create({
    heading1: {
        fontSize: 26,
        fontWeight: '600',
        color: '#c9d1d9',
        borderBottomWidth: 1,
        borderBottomColor: '#30363d',
        paddingBottom: 8,
        marginTop: 16,
    },
    heading2: {
        fontSize: 20,
        fontWeight: '600',
        color: '#c9d1d9',
        marginTop: 14,
        paddingBottom: 6,
    },
    body: {
        fontSize: 15,
        color: '#c9d1d9',
        lineHeight: 24,
    },
    code_inline: {
        backgroundColor: 'rgba(110, 118, 129,  0.4)',
        color: '#c9d1d9',
        fontFamily: 'monospace',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        fontSize: 13,
    },
    code_block: {
        backgroundColor: '#161b22',
        padding: 16,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#30363d',
        fontFamily: 'monospace',
        marginVertical: 12,
        fontSize: 13,
        color: '#c9d1d9',
    },
    link: {
        color: '#58a6ff',
        textDecorationLine: 'none',
    },
    bullet_list: {
        marginVertical: 8,
    },
    list_item: {
        color: '#c9d1d9',
        fontSize: 15,
        lineHeight: 24,
    }
});