import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { getUnsyncedAttendance, syncOfflineData } from '../database/queries';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, withSequence, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
    const [unsyncedRecords, setUnsyncedRecords] = useState([]);
    const [isSyncing, setIsSyncing] = useState(false);
    
    // Animation values
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    const animatedSyncStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${rotation.value}deg` }],
        };
    });

    const animatedCardStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    const fetchUnsynced = async () => {
        try {
            const records = await getUnsyncedAttendance();
            setUnsyncedRecords(records);
            
            // Pulse the card if there are records
            if (records.length > 0) {
                scale.value = withRepeat(
                    withSequence(
                        withTiming(1.02, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
                    ),
                    -1,
                    true
                );
            } else {
                scale.value = withSpring(1);
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchUnsynced);
        return unsubscribe;
    }, [navigation]);

    const handleSync = async () => {
        setIsSyncing(true);
        rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
        
        try {
            const result = await syncOfflineData();
            Alert.alert('Sync Complete', result.message);
            await fetchUnsynced();
        } catch (error) {
            Alert.alert('Sync Failed', 'Could not sync data. Ensure you have an internet connection and the server is reachable.');
        } finally {
            setIsSyncing(false);
            rotation.value = 0;
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Dashboard</Text>
                <Text style={styles.subtitle}>Welcome back, Admin</Text>
            </View>

            <Animated.View style={[styles.statsCard, animatedCardStyle, unsyncedRecords.length === 0 ? styles.statsCardSuccess : styles.statsCardWarning]}>
                <View style={styles.statsHeader}>
                    <Ionicons name={unsyncedRecords.length === 0 ? "checkmark-circle" : "warning"} size={24} color={unsyncedRecords.length === 0 ? "#10B981" : "#F59E0B"} />
                    <Text style={styles.statsTitle}>Unsynced Records</Text>
                </View>
                
                <Text style={styles.statsNumber}>{unsyncedRecords.length}</Text>
                
                <TouchableOpacity 
                    style={[styles.syncButton, unsyncedRecords.length === 0 ? styles.syncButtonDisabled : null]} 
                    onPress={handleSync} 
                    disabled={unsyncedRecords.length === 0 || isSyncing}
                >
                    {isSyncing ? (
                        <Animated.View style={animatedSyncStyle}>
                            <Ionicons name="sync" size={20} color="#fff" />
                        </Animated.View>
                    ) : (
                        <View style={styles.syncButtonContent}>
                            <Ionicons name="cloud-upload" size={18} color="#fff" style={{marginRight: 8}} />
                            <Text style={styles.syncButtonText}>Sync Now</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>

            <View style={styles.listContainer}>
                <Text style={styles.listTitle}>Recent Offline Logs</Text>
                <FlatList
                    data={unsyncedRecords}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInUp.delay(index * 100).duration(400)} style={styles.listItem}>
                            <View style={styles.listIconContainer}>
                                <Ionicons name="person" size={20} color="#4F46E5" />
                            </View>
                            <View style={styles.listInfo}>
                                <Text style={styles.listEmpText}>Employee ID: {item.employeeId}</Text>
                                <Text style={styles.listTimeText}>{new Date(item.timestamp).toLocaleString()}</Text>
                            </View>
                            <Ionicons name="cloud-offline-outline" size={20} color="#94A3B8" />
                        </Animated.View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-done-circle-outline" size={60} color="#CBD5E1" />
                            <Text style={styles.emptyText}>All records are synced.</Text>
                        </View>
                    }
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 20,
        paddingTop: 60, // for notch
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#1E293B',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 16,
        color: '#64748B',
        marginTop: 4,
    },
    statsCard: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(79, 70, 229, 0.1)',
    },
    statsCardSuccess: {
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    statsCardWarning: {
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statsTitle: {
        fontSize: 16,
        color: '#475569',
        marginLeft: 8,
        fontWeight: '600',
    },
    statsNumber: {
        fontSize: 48,
        fontWeight: '900',
        color: '#1E293B',
        marginVertical: 10,
    },
    syncButton: {
        backgroundColor: '#10B981',
        paddingVertical: 14,
        paddingHorizontal: 30,
        borderRadius: 12,
        width: '80%',
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    syncButtonDisabled: {
        backgroundColor: '#94A3B8',
        shadowOpacity: 0,
        elevation: 0,
    },
    syncButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    syncButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    listContainer: {
        flex: 1,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
        color: '#334155',
    },
    listItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    listIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(79, 70, 229, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    listInfo: {
        flex: 1,
    },
    listEmpText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
        marginBottom: 4,
    },
    listTimeText: {
        fontSize: 13,
        color: '#64748B',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
    },
    emptyText: {
        marginTop: 15,
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '500',
    }
});
