import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setAuthToken } from '../api/client';

export default function DashboardScreen({ navigation }) {
    return (
        <View style={styles.container}>
            <Ionicons name="scan-circle-outline" size={72} color="#4F46E5" />
            <Text style={styles.title}>Attendance scanner</Text>
            <Text style={styles.message}>A network connection is required. Your photo is checked by the attendance server and is not saved as an offline attendance record.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Camera')}>
                <Text style={styles.buttonText}>Open camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOut} onPress={() => { setAuthToken(null); navigation.getParent()?.replace('Login'); }}>
                <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' },
    title: { fontSize: 26, fontWeight: '700', color: '#1E293B', marginTop: 16 },
    message: { fontSize: 16, color: '#475569', textAlign: 'center', marginTop: 12, lineHeight: 24 },
    button: { backgroundColor: '#4F46E5', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 14, marginTop: 28 },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
    signOut: { marginTop: 22, padding: 10 },
    signOutText: { color: '#475569', fontSize: 15 }
});
