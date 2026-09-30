import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import apiClient, { setAuthToken } from '../api/client';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isSigningIn, setIsSigningIn] = useState(false);

    const handleLogin = async () => {
        if (!username || !password || isSigningIn) return;
        setIsSigningIn(true);
        try {
            const response = await apiClient.post('/admin/login', { username, password });
            const session = await apiClient.post('/face/session', {}, {
                headers: { Authorization: `Bearer ${response.data.token}` }
            });
            setAuthToken(session.data.token);
            navigation.replace('MainTabs');
        } catch (error) {
            Alert.alert('Sign in failed', error.response?.data?.error || 'Check your connection and credentials.');
        } finally {
            setIsSigningIn(false);
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4F46E5', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.background}
            />
            
            <BlurView intensity={80} style={styles.glassCard} tint="light">
                <Text style={styles.title}>Welcome Back</Text>
                
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Admin Username"
                        placeholderTextColor="#666"
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                    />
                </View>
                
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isSigningIn || !username || !password}>
                    <Text style={styles.buttonText}>{isSigningIn ? 'Signing in...' : 'Login'}</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: height,
    },
    glassCard: {
        width: width * 0.85,
        padding: 30,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 30,
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    inputContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.9)',
    },
    input: {
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    button: {
        width: '100%',
        backgroundColor: '#4F46E5',
        padding: 15,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
