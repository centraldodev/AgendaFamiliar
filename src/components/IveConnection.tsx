// Configurações › Assistente Ive: gerar o token que a Ive usa (mostrado uma vez), listar e revogar.
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@hooks/useThemeColors';
import { IVE_FICHA, iveService, type IveToken } from '@src/firebase/services/iveService';
import { borderRadius, cardShadow, fontSize, fontWeight, spacing } from '@styles/spacing';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function IveConnection() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [tokens, setTokens] = useState<IveToken[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [novo, setNovo] = useState<string | null>(null);
  const [copiado, setCopiado] = useState('');
  const [erro, setErro] = useState('');
  const data = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'pt-BR') : '');

  const carregar = useCallback(async () => {
    try { setTokens(await iveService.tokens()); setErro(''); }
    catch { setErro(t('ive.error', 'Não foi possível falar com a Ive agora.')); }
  }, [t]);
  useEffect(() => { void carregar(); }, [carregar]);

  const conectar = async () => {
    setCarregando(true);
    try {
      const criado = await iveService.criar('Ive');
      setNovo(criado.token);
      await carregar();
    } catch (e) {
      Alert.alert(t('ive.title', 'Assistente Ive'), e instanceof Error && e.message !== 'ive-unavailable'
        ? e.message : t('ive.error', 'Não foi possível falar com a Ive agora.'));
    } finally { setCarregando(false); }
  };

  const revogar = (token: IveToken) => Alert.alert(
    t('ive.revoke_title', 'Desconectar a Ive'), t('ive.revoke_msg', { name: token.nome }),
    [{ text: t('common.cancel'), style: 'cancel' },
     { text: t('ive.revoke', 'Revogar'), style: 'destructive', onPress: async () => { await iveService.revogar(token.id); await carregar(); } }],
  );

  const copiar = async (texto: string, qual: string) => {
    await Clipboard.setStringAsync(texto);
    setCopiado(qual);
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('ive.title', 'Assistente Ive')}</Text>
      <View style={styles.settingRow}>
        <View style={styles.settingLeft}>
          <View style={[styles.settingIconBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="mic-outline" size={18} color="#FFF" />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>{t('ive.label', 'Controle por voz')}</Text>
            <Text style={styles.settingValue}>{t('ive.desc')}</Text>
          </View>
        </View>
      </View>
      {tokens.map((tk) => (
        <View key={tk.id} style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingLabel}>{tk.nome}</Text>
            <Text style={styles.settingValue}>
              {t('ive.connected', { date: data(tk.criadoEm) })} · {tk.usadoEm ? t('ive.last_use', { date: data(tk.usadoEm) }) : t('ive.never_used')}
            </Text>
          </View>
          <TouchableOpacity accessibilityRole="button" onPress={() => revogar(tk)}>
            <Text style={{ color: colors.danger, fontWeight: fontWeight.semibold, padding: spacing.sm }}>{t('ive.revoke', 'Revogar')}</Text>
          </TouchableOpacity>
        </View>
      ))}
      {erro ? <Text style={styles.settingValue}>{erro}</Text> : null}
      {carregando ? <ActivityIndicator color={colors.primary} /> : (
        <TouchableOpacity accessibilityRole="button" style={styles.linkButton} onPress={() => void conectar()}>
          <Ionicons name="link-outline" size={18} color={colors.primary} />
          <Text style={styles.linkText}>{tokens.length ? t('ive.connect_other') : t('ive.connect', 'Conectar à Ive')}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={novo !== null} transparent animationType="fade" onRequestClose={() => setNovo(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('ive.paste_title', 'Cole na Ive')}</Text>
            <Text style={styles.modalDescription}>{t('ive.paste_desc')}</Text>
            {[['address', IVE_FICHA], ['token', novo || '']].map(([qual, valor]) => (
              <View key={qual} style={{ marginBottom: spacing.md }}>
                <Text style={styles.settingLabel}>{t(`ive.${qual}`)}</Text>
                <Text selectable style={styles.code}>{valor}</Text>
                <TouchableOpacity onPress={() => void copiar(valor, qual)}>
                  <Text style={styles.linkText}>{copiado === qual ? t('ive.copied', 'Copiado') : t('ive.copy', 'Copiar')}</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.doneButton} onPress={() => { setNovo(null); setCopiado(''); }}>
              <Text style={styles.doneText}>{t('ive.done', 'Já copiei')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textSecondary,
                  textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: spacing.md },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface,
                borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.md, ...cardShadow },
  settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: spacing.md },
  settingIconBadge: { width: 36, height: 36, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center' },
  settingTextContainer: { flex: 1 },
  settingLabel: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text, marginBottom: spacing.xs },
  settingValue: { fontSize: fontSize.sm, color: colors.textSecondary },
  linkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: spacing.sm,
                backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.lg },
  linkText: { color: colors.primary, fontWeight: fontWeight.semibold },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xxl, padding: spacing.xl, width: '100%', maxWidth: 420 },
  modalTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: 'center' },
  modalDescription: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center', lineHeight: 20 },
  code: { fontFamily: 'monospace', fontSize: fontSize.sm, color: colors.text, backgroundColor: colors.backgroundSecondary,
          borderRadius: borderRadius.lg, padding: spacing.sm, marginVertical: spacing.xs },
  doneButton: { backgroundColor: colors.primary, paddingVertical: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center' },
  doneText: { color: '#FFF', fontWeight: fontWeight.semibold },
});
