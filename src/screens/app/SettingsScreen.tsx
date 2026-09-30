import IveConnection from '@components/IveConnection';
import PickerModal from '@components/PickerModal';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { authService, familyService, userService } from '@src/firebase';
import firebase from '@src/firebase/config/firebase.config';
import { useUserStore } from '@store/userStore';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import type { Family } from '@types';
import { GoogleSignin, statusCodes } from '@utils/googleSignin';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Alert,
    Modal,
    Platform,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';



export default function SettingsScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { user, preferences, setPreferences, logout, setUser } = useUserStore();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [family, setFamily] = useState<Family | null>(null);
  const [isGoogleLinked, setIsGoogleLinked] = useState(false);
  const [showChangeFamilyModal, setShowChangeFamilyModal] = useState(false);
  const [newFamilyCode, setNewFamilyCode] = useState('');
  const [isChangingFamily, setIsChangingFamily] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Check if Google provider is linked and if user has password
  useEffect(() => {
    const checkProviders = () => {
      const currentUser = firebase.auth().currentUser;
      if (currentUser) {
        const hasGoogle = currentUser.providerData.some(
          (provider) => provider?.providerId === 'google.com'
        );
        const hasPasswordProvider = currentUser.providerData.some(
          (provider) => provider?.providerId === 'password'
        );
        setIsGoogleLinked(hasGoogle);
        setHasPassword(hasPasswordProvider);
      }
    };
    checkProviders();
  }, [user]);

  useEffect(() => {
    const fetchFamily = async () => {
      if (user?.familyId) {
        const fetchedFamily = await familyService.getFamilyDetails(user.familyId);
        setFamily(fetchedFamily);
      }
    };
    fetchFamily();
  }, [user?.familyId]);

  const copyToClipboard = async () => {
    if (family?.code) {
      await Clipboard.setStringAsync(family.code);
      Alert.alert(t('common.success'), t('settings.copy_success'));
    }
  };

  /**
   * Main Google Link Handler
   */
  const handleGoogleLinkPress = async () => {
    setIsLinking(true);

    try {
      // Check for Play Services on Android
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      // Start Google Sign-In flow
      const { data } = await GoogleSignin.signIn();

      if (data?.idToken) {
        console.log('[SettingsScreen] Native Google auth success, linking...');
        await handleGoogleLink(data.idToken);
      } else {
        throw new Error('ID Token não recebido do Google');
      }

    } catch (error: any) {
      console.log('[SettingsScreen] Google Link Error:', error.code, error.message);

      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[SettingsScreen] Link Cancelado');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('[SettingsScreen] Operação já em progresso');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Erro', 'Google Play Services não disponível');
      } else {
        Alert.alert('Erro no Google', `Falha ao iniciar: ${error.message}`);
      }
      setIsLinking(false);
    }
  };

  const handleGoogleLink = async (idToken: string) => {
    if (!user) return;
    setIsLinking(true);
    try {
      const credential = firebase.auth.GoogleAuthProvider.credential(idToken);
      const currentUser = firebase.auth().currentUser;

      if (!currentUser) throw new Error("No authenticated user");

      // Link the Google credential to the existing account
      await currentUser.linkWithCredential(credential);

      // Current User should now have providerData including google.
      const googleProvider = currentUser.providerData.find(p => p?.providerId === 'google.com');

      if (googleProvider?.photoURL) {
        const updatedUser = { ...user, photoURL: googleProvider.photoURL };
        await userService.createUserProfile(updatedUser); // persist
        setUser(updatedUser); // Update local store
      }

      // Mark Google as linked
      setIsGoogleLinked(true);

      // Check if user has password
      const hasPasswordProvider = currentUser.providerData.some(
        (provider) => provider?.providerId === 'password'
      );

      if (hasPasswordProvider) {
        Alert.alert('Sucesso', 'Conta Google vinculada com sucesso! Agora você pode fazer login com email/senha ou com Google.');
      } else {
        Alert.alert(
          'Sucesso', 
          'Conta Google vinculada com sucesso!\n\nPara acessar com email e senha, você precisa definir uma senha usando o botão "Definir Senha" abaixo.'
        );
      }

    } catch (error: any) {
      console.error("Link error:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);

      if (error.code === 'auth/credential-already-in-use') {
        Alert.alert('Erro', 'Esta conta Google já está vinculada a outro usuário.');
      } else if (error.code === 'auth/provider-already-linked') {
        Alert.alert('Info', 'Esta conta Google já está vinculada à sua conta.');
        setIsGoogleLinked(true);
      } else if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Erro', 'O email desta conta Google já está em uso por outro usuário.');
      } else {
        Alert.alert('Erro', `Falha ao vincular conta Google: ${error.message || 'Erro desconhecido'}`);
      }
    } finally {
      setIsLinking(false);
    }
  };

  const themeOptions = [
    { label: t('settings.system'), value: 'system' },
    { label: t('settings.light'), value: 'light' },
    { label: t('settings.dark'), value: 'dark' },
  ];

  const languageOptions = [
    { label: 'Português (Brasil)', value: 'pt-BR' },
    { label: 'English', value: 'en' },
  ];

  const handleLogout = async () => {
    const confirmMessage = t('common.confirm_logout', 'Tem certeza que deseja sair da sua conta?');

    // Web doesn't support Alert.alert, use window.confirm instead
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        try {
          await authService.logout();
          logout();
        } catch (error) {
          alert(t('common.logout_error', 'Não foi possível fazer logout'));
        }
      }
    } else {
      // Mobile uses Alert.alert
      Alert.alert(t('settings.logout'), confirmMessage, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          onPress: async () => {
            try {
              await authService.logout();
              logout();
            } catch (error) {
              Alert.alert(t('common.error'), t('common.logout_error', 'Não foi possível fazer logout'));
            }
          },
          style: 'destructive',
        },
      ]);
    }
  };

  const getThemeLabel = () => {
    switch (preferences?.theme) {
      case 'dark': return t('settings.dark');
      case 'light': return t('settings.light');
      default: return t('settings.system');
    }
  };

  const getLanguageLabel = () => {
    return preferences?.language === 'pt-BR' ? 'Português (Brasil)' : 'English';
  };

  const handleChangeFamily = async () => {
    if (!newFamilyCode.trim()) {
      Alert.alert('Erro', 'Por favor, insira o código da família.');
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Usuário não encontrado.');
      return;
    }

    setIsChangingFamily(true);
    try {
      const newFamily = await familyService.joinFamily(newFamilyCode.trim(), user);
      
      // Update local user state with new family
      setUser({
        ...user,
        familyId: newFamily.id,
        role: 'dependent', // User becomes dependent when joining a new family
      });
      
      setFamily(newFamily);
      setShowChangeFamilyModal(false);
      setNewFamilyCode('');
      
      Alert.alert(
        'Sucesso', 
        `Você entrou na família "${newFamily.name}" com sucesso!`
      );
    } catch (error: any) {
      console.error('Error changing family:', error);
      Alert.alert(
        'Erro', 
        error.message || 'Não foi possível trocar de família. Verifique o código e tente novamente.'
      );
    } finally {
      setIsChangingFamily(false);
    }
  };

  const handleSetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Erro', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    setIsSettingPassword(true);
    try {
      await authService.setPassword(newPassword);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true);
      
      Alert.alert(
        'Sucesso',
        'Senha definida com sucesso! Agora você pode fazer login com email e senha.'
      );
    } catch (error: any) {
      console.error('Error setting password:', error);
      
      if (error.code === 'auth/requires-recent-login') {
        Alert.alert(
          'Erro',
          'Por segurança, você precisa fazer login novamente antes de definir uma senha. Faça logout e login novamente.'
        );
      } else {
        Alert.alert(
          'Erro',
          error.message || 'Não foi possível definir a senha. Tente novamente.'
        );
      }
    } finally {
      setIsSettingPassword(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.profile')}</Text>
        <View style={styles.profileBox}>
          {user?.photoURL ? (
            <RNImage
              source={{ uri: user.photoURL }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarContainer}>
              <Ionicons
                name="person-circle-outline"
                size={48}
                color={colors.primary}
              />
            </View>
          )}

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || t('common.user', 'Usuário')}
            </Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Account Linking Buttons Row */}
        <View style={styles.linkButtonsRow}>
          {/* Link Google Button - Only show if Google is not already linked */}
          {!isGoogleLinked && (
            <TouchableOpacity
              style={[styles.linkButton, { flex: 1 }]}
              onPress={handleGoogleLinkPress}
              disabled={isGoogleLinked || isLinking}
            >
              <Ionicons name="logo-google" size={20} color={colors.primary} />
              <Text style={styles.linkText}>{isLinking ? t('settings.linking') : t('settings.link_google')}</Text>
            </TouchableOpacity>
          )}
          {isGoogleLinked && (
            <View style={[styles.linkButton, { flex: 1, backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.linkText, { color: colors.success }]}>{t('settings.google_linked')}</Text>
            </View>
          )}

          {/* Set Password Button - Only show if user doesn't have password */}
          {!hasPassword && (
            <TouchableOpacity
              style={[styles.linkButton, { flex: 1 }]}
              onPress={() => setShowPasswordModal(true)}
            >
              <Ionicons name="key-outline" size={20} color={colors.primary} />
              <Text style={styles.linkText}>{t('settings.set_password')}</Text>
            </TouchableOpacity>
          )}
          {hasPassword && (
            <View style={[styles.linkButton, { flex: 1, backgroundColor: colors.success + '20', borderColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.linkText, { color: colors.success }]}>{t('settings.password_set')}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Admin Section */}
      {user?.role === 'admin' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('settings.administration')}</Text>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('Approvals')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.approvals')}</Text>
                <Text style={styles.settingValue}>{t('settings.manage_requests', 'Gerenciar solicitações')}</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBadge, { backgroundColor: colors.secondary }]}>
                <Ionicons name="people-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('common.family', 'Família')}: {family?.name || t('common.loading')}</Text>
                <Text style={styles.settingValue}>{t('common.code', 'Código')}: {family?.code || '...'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={copyToClipboard} style={{ padding: 8 }}>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('FamilyMembers')}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBadge, { backgroundColor: colors.primary }]}>
                <Ionicons name="people-circle-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.manage_members')}</Text>
                <Text style={styles.settingValue}>{t('settings.view_list', 'Ver lista e permissões')}</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Change Family */}
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setShowChangeFamilyModal(true)}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.settingIconBadge, { backgroundColor: colors.warning }]}>
                <Ionicons name="swap-horizontal-outline" size={18} color="#FFF" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>{t('settings.change_family')}</Text>
                <Text style={styles.settingValue}>{t('settings.change_family_desc')}</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

        {/* Theme */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowThemePicker(true)}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconBadge, { backgroundColor: colors.warning }]}>
              <Ionicons name="sunny" size={18} color="#FFF" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>{t('settings.theme')}</Text>
              <Text style={styles.settingValue}>{getThemeLabel()}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Language */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => setShowLanguagePicker(true)}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconBadge, { backgroundColor: colors.info }]}>
              <Ionicons name="language-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>{t('settings.language')}</Text>
              <Text style={styles.settingValue}>{getLanguageLabel()}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Notifications */}
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="notifications-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>{t('settings.notifications')}</Text>
              <Text style={styles.settingValue}>
                {preferences.notifications ? t('settings.active') : t('settings.inactive')}
              </Text>
            </View>
          </View>
          <Switch
            value={preferences.notifications}
            onValueChange={(value) => setPreferences({ notifications: value })}
            trackColor={{
              false: colors.border,
              true: colors.primary,
            }}
            thumbColor="#FFF"
          />
        </View>

        {/* Manage Categories */}
        <TouchableOpacity
          style={styles.settingRow}
          onPress={() => navigation.navigate('ManageCategories')}
        >
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="pricetags-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>{t('settings.manage_categories')}</Text>
              <Text style={styles.settingValue}>{t('settings.manage_categories_desc')}</Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Assistente Ive (controle por voz) */}
      <IveConnection />

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIconBadge, { backgroundColor: colors.textSecondary }]}>
              <Ionicons name="information-circle-outline" size={18} color="#FFF" />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingLabel}>{t('settings.version')}</Text>
              <Text style={styles.settingValue}>1.0.0</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FFF" />
          <Text style={styles.logoutText}>{t('settings.logout')}</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <PickerModal
        visible={showThemePicker}
        title={t('settings.theme')}
        options={themeOptions}
        onSelect={(value) =>
          setPreferences({ theme: value as 'light' | 'dark' | 'system' })
        }
        onClose={() => setShowThemePicker(false)}
      />

      <PickerModal
        visible={showLanguagePicker}
        title={t('settings.language')}
        options={languageOptions}
        onSelect={(value) =>
          setPreferences({ language: value as 'pt-BR' | 'en' })
        }
        onClose={() => setShowLanguagePicker(false)}
      />

      {/* Change Family Modal */}
      <Modal
        visible={showChangeFamilyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowChangeFamilyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.change_family_modal_title')}</Text>
            <Text style={styles.modalDescription}>
              {t('settings.change_family_modal_desc')}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={t('settings.change_family_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={newFamilyCode}
              onChangeText={setNewFamilyCode}
              autoCapitalize="characters"
              maxLength={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowChangeFamilyModal(false);
                  setNewFamilyCode('');
                }}
                disabled={isChangingFamily}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleChangeFamily}
                disabled={isChangingFamily}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {isChangingFamily ? t('settings.joining') : t('settings.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('settings.set_password_modal_title')}</Text>
            <Text style={styles.modalDescription}>
              {t('settings.set_password_modal_desc')}
            </Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder={t('settings.new_password_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TextInput
              style={styles.modalInput}
              placeholder={t('settings.confirm_password_placeholder')}
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={isSettingPassword}
              >
                <Text style={styles.modalButtonCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSetPassword}
                disabled={isSettingPassword}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {isSettingPassword ? t('settings.setting') : t('settings.confirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: spacing.md,
  },
  profileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    ...cardShadow,
  },
  avatarContainer: {
    marginRight: spacing.md,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    gap: 8,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: fontWeight.semibold,
  },
  linkButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingIconBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  settingValue: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    gap: spacing.md,
    ...cardShadow,
  },
  logoutText: {
    color: '#FFF',
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary,
  },
  modalButtonCancelText: {
    color: colors.text,
    fontWeight: fontWeight.semibold,
  },
  modalButtonConfirmText: {
    color: '#FFF',
    fontWeight: fontWeight.semibold,
  },
});
