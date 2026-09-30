import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { scanAndLogAttendance } from '../services/faceRecognitionService';
import apiClient from '../api/client';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export default function CameraScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const isFocused = useIsFocused();
    
    useEffect(() => {
        if (!isFocused) setIsCameraReady(false);
    }, [isFocused]);

    useEffect(() => {
        if (!isFocused || isProcessing) return;
        const timeout = setTimeout(() => navigation.navigate('Dashboard'), 45000);
        return () => clearTimeout(timeout);
    }, [isFocused, isProcessing, navigation]);

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
        if (!cameraRef.current || !isCameraReady || isProcessing) return;
        
        setIsProcessing(true);
        try {
            const settings = await apiClient.get('/attendance/settings');
            let location = {};
            if (settings.data.geofencing_enabled) {
                const permission = await Location.requestForegroundPermissionsAsync();
                if (!permission.granted) throw new Error('Location permission is required for attendance at this site.');
                const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
                location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            }
            const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
            const maxDimension = Math.max(photo.width, photo.height);
            const context = ImageManipulator.ImageManipulator.manipulate(photo.uri);
            if (maxDimension > 1280) {
                const ratio = 1280 / maxDimension;
                context.resize({ width: Math.round(photo.width * ratio), height: Math.round(photo.height * ratio) });
            }
            const image = await context.renderAsync();
            const jpeg = await image.saveAsync({ compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
            const result = await scanAndLogAttendance(jpeg.base64, location);
            Alert.alert('Success', `${result.status} attendance recorded.`);
            navigation.navigate('Dashboard');
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
                <CameraView style={styles.camera} ref={cameraRef} facing="front" onCameraReady={() => setIsCameraReady(true)}>
                    <View style={styles.overlay}>
                        <Text style={styles.instructionText}>Position your face in the frame</Text>
                        
                        <View style={styles.scannerFrame}>
                            <View style={styles.cornerTL} />
                            <View style={styles.cornerTR} />
                            <View style={styles.cornerBL} />
                            <View style={styles.cornerBR} />
                            
                        </View>

                        <View style={styles.bottomControls}>
                            <TouchableOpacity 
                                style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
                                onPress={handleCapture}
                                disabled={isProcessing || !isCameraReady}
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
