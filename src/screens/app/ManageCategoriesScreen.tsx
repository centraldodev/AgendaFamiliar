import { CreateCategoryModal } from '@components/CreateCategoryModal';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { useCategoryStore } from '@store/categoryStore';
import { useUserStore } from '@store/userStore';
import type { Category } from '@types';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageCategoriesScreen({ navigation }: any) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const user = useUserStore((state) => state.user);
    const { categories, customCategories, deleteCategory, updateCategory } = useCategoryStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    const handleDeleteCategory = (category: Category) => {
        if (category.isDefault) {
            Alert.alert(
                t('categories.cannot_delete'),
                t('categories.cannot_delete_default')
            );
            return;
        }

        Alert.alert(
            t('categories.delete_category'),
            `${t('categories.delete_confirm')} "${t(`categories.${category.id}`, { defaultValue: category.label })}"?`,
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(category.id);
                        } catch (error) {
                            Alert.alert(t('common.error'), t('categories.delete_error'));
                        }
                    },
                },
            ]
        );
    };

    const handleEditCategory = (category: Category) => {
        if (category.isDefault) {
            Alert.alert(
                t('categories.cannot_edit'),
                t('categories.cannot_edit_default')
            );
            return;
        }

        setEditingCategory(category);
        setShowCreateModal(true);
    };

    const handleSaveCategory = async (name: string, icon: string, color: string) => {
        try {
            if (editingCategory) {
                // Edit mode
                await updateCategory(editingCategory.id, name, icon, color);
            } else {
                // Create mode
                if (user?.familyId) {
                    const { addCategory } = useCategoryStore.getState();
                    await addCategory(name, icon, color, user.familyId);
                }
            }
            setShowCreateModal(false);
            setEditingCategory(null);
        } catch (error) {
            Alert.alert(t('common.error'), t('categories.save_error'));
        }
    };

    const handleCloseModal = () => {
        setShowCreateModal(false);
        setEditingCategory(null);
    };

    const isAdmin = user?.role === 'admin';

    const renderCategory = ({ item }: { item: Category }) => {
        const isCustom = !item.isDefault;

        return (
            <View style={[styles.categoryItem, { backgroundColor: colors.surface }]}>
                <View style={styles.categoryInfo}>
                    <View
                        style={[
                            styles.categoryDot,
                            { backgroundColor: item.color },
                        ]}
                    />
                    <Ionicons
                        name={item.icon as any}
                        size={24}
                        color={item.color}
                        style={styles.categoryIcon}
                    />
                    <View style={styles.categoryText}>
                        <Text style={[styles.categoryLabel, { color: colors.text }]}>
                            {t(`categories.${item.id}`, { defaultValue: item.label })}
                        </Text>
                        <Text style={[styles.categoryType, { color: colors.textSecondary }]}>
                            {isCustom ? t('categories.custom') : t('categories.default')}
                        </Text>
                    </View>
                </View>

                {isCustom && isAdmin && (
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            onPress={() => handleEditCategory(item)}
                            style={styles.actionButton}
                        >
                            <Ionicons name="pencil-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleDeleteCategory(item)}
                            style={styles.actionButton}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                    {t('settings.manage_categories')}
                </Text>
                <TouchableOpacity
                    onPress={() => {
                        setEditingCategory(null);
                        setShowCreateModal(true);
                    }}
                    style={styles.headerButton}
                >
                    <Ionicons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={categories}
                keyExtractor={(item) => item.id}
                renderItem={renderCategory}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="folder-open-outline" size={64} color={colors.textSecondary} />
                        <Text style={[styles.emptyText, { color: colors.text }]}>
                            {t('categories.no_categories')}
                        </Text>
                    </View>
                }
            />

            <CreateCategoryModal
                visible={showCreateModal}
                onClose={handleCloseModal}
                onSave={handleSaveCategory}
                categoryId={editingCategory?.id}
                initialName={editingCategory?.label}
                initialIcon={editingCategory?.icon}
                initialColor={editingCategory?.color}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    headerButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    listContent: {
        padding: 16,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    categoryIcon: {
        marginRight: 12,
    },
    categoryText: {
        flex: 1,
    },
    categoryLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    categoryType: {
        fontSize: 12,
    },
    categoryActions: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 8,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        marginTop: 16,
    },
});
