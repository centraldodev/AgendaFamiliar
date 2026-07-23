import { useThemeColors } from '@hooks/useThemeColors';
import { authService, familyService } from '@src/firebase';
import { useUserStore } from '@store/userStore';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FamilySetupScreen() {
    const [mode, setMode] = useState<'create' | 'join'>('create');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);

    const user = useUserStore((state) => state.user);
    const themeColors = useThemeColors();
    const { t } = useTranslation();

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert(t('common.error'), t('family.name_required'));
            return;
        }
        if (!user) return;

        setLoading(true);
        try {
            await familyService.createFamily(name, user);
            await authService.reloadUserProfile();
        } catch (error) {
            Alert.alert(t('common.error'), t('family.create_error'));
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!code.trim() || code.length !== 6) {
            Alert.alert(t('common.error'), t('family.code_required'));
            return;
        }
        if (!user) return;

        setLoading(true);
        try {
            await familyService.joinFamily(code, user);
            await authService.reloadUserProfile();
        } catch (error) {
            Alert.alert(t('common.error'), t('family.join_error'));
        } finally {
            setLoading(false);
        }
    };

    const styles = makeStyles(themeColors);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <Text style={styles.title}>{t('family.welcome')}</Text>
                    <Text style={styles.subtitle}>
                        {t('family.setup_subtitle')}
                    </Text>

                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'create' && styles.activeTab]}
                            onPress={() => setMode('create')}
                        >
                            <Text style={[styles.tabText, mode === 'create' && styles.activeTabText]}>{t('family.create_family')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, mode === 'join' && styles.activeTab]}
                            onPress={() => setMode('join')}
                        >
                            <Text style={[styles.tabText, mode === 'join' && styles.activeTabText]}>{t('family.join_with_code')}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        {mode === 'create' ? (
                            <>
                                <Text style={styles.label}>{t('family.family_name')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('family.family_name_placeholder')}
                                    placeholderTextColor={themeColors.textSecondary}
                                    value={name}
                                    onChangeText={setName}
                                />
                                <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{t('family.create_family')}</Text>}
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.label}>{t('family.family_code')}</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('family.family_code_placeholder')}
                                    placeholderTextColor={themeColors.textSecondary}
                                    value={code}
                                    onChangeText={(t) => setCode(t.toUpperCase())}
                                    maxLength={6}
                                />
                                <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{t('family.enter_family')}</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const makeStyles = (colors: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: colors.surface,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    activeTabText: {
        color: '#FFF',
    },
    form: {
        backgroundColor: colors.surface,
        padding: 24,
        borderRadius: 16,
        elevation: 4,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: colors.background,
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: colors.text,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.primary,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
