import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { logOfflineAttendance } from '../database/queries';
import { identifyEmployeeOffline } from '../services/faceRecognitionService';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence } from 'react-native-reanimated';
import { useIsFocused } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const isFocused = useIsFocused();
    
    // Scanner Line Animation
    const scanLinePosition = useSharedValue(0);

    useEffect(() => {
        scanLinePosition.value = withRepeat(
            withSequence(
                withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ),
            -1, // infinite
            true // reverse
        );
    }, []);

    const animatedScanLineStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: scanLinePosition.value }],
        };
    });

    if (!permission) {
        return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={60} color="#4F46E5" />
                <Text style={styles.permissionTitle}>Camera Access Required</Text>
                <Text style={styles.permissionMessage}>We need your permission to use the camera for face recognition.</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleCapture = async () => {
        if (!cameraRef.current) return;
        
        setIsProcessing(true);
        try {
            const photo = await cameraRef.current.takePictureAsync({ base64: true });
            
            // Pass the captured image to the face recognition service
            const matchedEmployeeId = await identifyEmployeeOffline(photo.base64);
            
            if (!matchedEmployeeId) {
                Alert.alert("Match Failed", "Face not recognized. Please try again.");
                return;
            }
            
            const timestamp = new Date().toISOString();
            await logOfflineAttendance(matchedEmployeeId, timestamp);
            
            Alert.alert("Success", "Attendance logged successfully!");
            // Remove navigation.goBack() because we are in a tab navigator now
        } catch (error) {
            console.error(error);
            Alert.alert("Error", error.message || "Failed to capture attendance.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            {isFocused && (
                <CameraView style={styles.camera} ref={cameraRef} facing="front">
                    <View style={styles.overlay}>
                        <Text style={styles.instructionText}>Position your face in the frame</Text>
                        
                        <View style={styles.scannerFrame}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                            
                            {isProcessing && (
                                <Animated.View style={[styles.scanLine, animatedScanLineStyle]} />
                            )}
                        </View>

                        <View style={styles.bottomControls}>
                            <TouchableOpacity 
                                style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
                                onPress={handleCapture}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <Text style={styles.captureButtonText}>Scanning...</Text>
                                ) : (
                                    <View style={styles.captureButtonContent}>
                                        <Ionicons name="scan" size={24} color="#fff" style={{marginRight: 10}} />
                                        <Text style={styles.captureButtonText}>Clock In / Out</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </CameraView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)', // Darkened overlay
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 80,
    },
    instructionText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    scannerFrame: {
        width: 250,
        height: 250,
        position: 'relative',
        backgroundColor: 'transparent',
    },
    // Scanner Corners
    cornerTL: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderColor: '#10B981', borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 20 },
    cornerTR: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderColor: '#10B981', borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 20 },
    cornerBL: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderColor: '#10B981', borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 20 },
    cornerBR: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderColor: '#10B981', borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 20 },
    
    scanLine: {
        width: '100%',
        height: 2,
        backgroundColor: '#10B981',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 10,
    },
    bottomControls: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 60, // Leave room for tab bar
    },
    captureButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 18,
        paddingHorizontal: 40,
        borderRadius: 30,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    captureButtonDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
        elevation: 0,
    },
    captureButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    captureButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    // Permission styles
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 20,
    },
    permissionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1E293B',
        marginTop: 20,
        marginBottom: 10,
    },
    permissionMessage: {
        textAlign: 'center',
        color: '#64748B',
        fontSize: 16,
        marginBottom: 30,
        paddingHorizontal: 20,
    },
    permissionButton: {
        backgroundColor: '#4F46E5',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 12,
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
