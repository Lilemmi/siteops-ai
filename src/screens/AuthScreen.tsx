import React, {useMemo, useState} from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  HardHat,
  LockKeyhole,
  ShieldCheck,
  UserPlus,
} from 'lucide-react-native';
import {
  AppUser,
  AuthError,
  isValidEmail,
  loginDemoUser,
  loginUser,
  minPasswordLength,
  registerUser,
  roleLabelKey,
  testAccounts,
  UserRole,
} from '../services/authService';
import {AppLanguage, changeAppLanguage} from '../i18n';
import {colors, radii} from '../theme';

const roles: UserRole[] = ['owner', 'manager', 'foreman', 'accountant', 'worker'];
const languages: AppLanguage[] = ['en', 'ru', 'he'];

function authErrorKey(error: unknown) {
  if (error instanceof AuthError) {
    return `auth.errors.${error.code}`;
  }
  return 'auth.errors.unknown';
}

export function AuthScreen({onAuthenticated}: {onAuthenticated: (user: AppUser) => void}) {
  const {t, i18n} = useTranslation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  const passwordScore = useMemo(() => {
    let score = 0;
    if (password.length >= minPasswordLength()) score += 1;
    if (/[A-ZА-Я]/.test(password) || /\d/.test(password)) score += 1;
    if (password.length >= 12 || /[^a-zA-Zа-яА-Я0-9]/.test(password)) score += 1;
    return score;
  }, [password]);

  const canSubmit = useMemo(() => {
    if (!isValidEmail(email)) {
      return false;
    }
    if (mode === 'register') {
      return (
        password.length >= minPasswordLength() &&
        name.trim().length >= 2 &&
        companyName.trim().length >= 2 &&
        password === confirmPassword
      );
    }
    return password.length > 0;
  }, [companyName, confirmPassword, email, mode, name, password]);

  function resetError() {
    if (formError) {
      setFormError('');
    }
  }

  async function submit() {
    resetError();
    if (!isValidEmail(email)) {
      setFormError(t('auth.errors.invalid-email'));
      return;
    }
    if (mode === 'register' && password.length < minPasswordLength()) {
      setFormError(t('auth.errors.weak-password'));
      return;
    }
    if (mode === 'login' && password.length < 1) {
      setFormError(t('auth.errors.invalid-credentials'));
      return;
    }
    if (mode === 'register') {
      if (name.trim().length < 2) {
        setFormError(t('auth.errors.missing-name'));
        return;
      }
      if (companyName.trim().length < 2) {
        setFormError(t('auth.errors.missing-company'));
        return;
      }
      if (password !== confirmPassword) {
        setFormError(t('auth.errors.password-mismatch'));
        return;
      }
    }

    setLoading(true);
    try {
      const user = mode === 'login'
        ? await loginUser(email, password)
        : await registerUser({email, password, name, role, companyName});
      onAuthenticated(user);
    } catch (error) {
      setFormError(t(authErrorKey(error)));
    } finally {
      setLoading(false);
    }
  }

  async function enterDemo(account: typeof testAccounts[number]) {
    setMode('login');
    setEmail(account.email);
    setPassword('');
    setFormError('');
    setLoading(true);
    try {
      const user = await loginDemoUser(account.role);
      onAuthenticated(user);
    } catch (error) {
      setFormError(t(authErrorKey(error)));
    } finally {
      setLoading(false);
    }
  }

  async function selectLanguage(language: AppLanguage) {
    await changeAppLanguage(language);
  }

  function switchMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setFormError('');
    setPassword('');
    setConfirmPassword('');
    if (nextMode === 'register') {
      setEmail('');
      setName('');
      setCompanyName('');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}>
      <ScrollView
        contentContainerStyle={[styles.content, {paddingTop: Math.max(insets.top + 18, 54)}]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.languageRow}>
          {languages.map(language => (
            <Pressable
              key={language}
              onPress={() => selectLanguage(language)}
              style={[styles.languageChip, i18n.language === language && styles.languageChipActive]}>
              <Globe2 size={13} color={i18n.language === language ? colors.text : colors.muted} />
              <Text style={[styles.languageText, i18n.language === language && styles.languageTextActive]}>
                {t(language === 'en' ? 'common.english' : language === 'ru' ? 'common.russian' : 'common.hebrew')}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.logo}>
          <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.logoMark}>
            <HardHat color={colors.text} size={32} />
          </LinearGradient>
          <Text style={styles.title}>SiteOps <Text style={styles.ai}>AI</Text></Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        <View style={styles.valueCard}>
          {[
            ['auth.value.secure', ShieldCheck],
            ['auth.value.roles', Building2],
            ['auth.value.sync', CheckCircle2],
          ].map(([key, Icon]) => (
            <View key={key as string} style={styles.valueRow}>
              <View style={styles.valueIcon}>
                <Icon size={16} color={colors.primary} />
              </View>
              <Text style={styles.valueText}>{t(key as string)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.switchRow}>
          {(['login', 'register'] as const).map(item => (
            <Pressable key={item} onPress={() => switchMode(item)} style={[styles.switchChip, mode === item && styles.switchChipActive]}>
              <Text style={[styles.switchText, mode === item && styles.switchTextActive]}>{t(`auth.${item}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          {mode === 'register' ? (
            <>
              <Text style={styles.label}>{t('auth.name')}</Text>
              <TextInput
                value={name}
                onChangeText={value => {setName(value); resetError();}}
                autoCapitalize="words"
                placeholder={t('auth.namePlaceholder')}
                placeholderTextColor={colors.faint}
                style={styles.input}
              />
              <Text style={styles.label}>{t('auth.company')}</Text>
              <TextInput
                value={companyName}
                onChangeText={value => {setCompanyName(value); resetError();}}
                placeholder={t('auth.companyPlaceholder')}
                placeholderTextColor={colors.faint}
                style={styles.input}
              />
              <Text style={styles.label}>{t('auth.role')}</Text>
              <View style={styles.roleGrid}>
                {roles.map(item => (
                  <Pressable key={item} onPress={() => setRole(item)} style={[styles.roleChip, role === item && styles.roleChipActive]}>
                    <Text style={[styles.roleText, role === item && styles.roleTextActive]}>{t(roleLabelKey(item))}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>{t('auth.email')}</Text>
          <TextInput
            value={email}
            onChangeText={value => {setEmail(value); resetError();}}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="owner@siteops.ai"
            placeholderTextColor={colors.faint}
            style={[styles.input, email && !isValidEmail(email) && styles.inputError]}
          />

          <Text style={styles.label}>{t('auth.password')}</Text>
          <View style={[styles.passwordWrap, mode === 'register' && password && password.length < minPasswordLength() && styles.inputError]}>
            <TextInput
              value={password}
              onChangeText={value => {setPassword(value); resetError();}}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t('auth.passwordPlaceholder')}
              placeholderTextColor={colors.faint}
              style={styles.passwordInput}
            />
            <Pressable onPress={() => setShowPassword(current => !current)} style={styles.eyeButton}>
              {showPassword ? <EyeOff size={18} color={colors.muted} /> : <Eye size={18} color={colors.muted} />}
            </Pressable>
          </View>

          {mode === 'register' ? (
            <>
              <View style={styles.strengthTrack}>
                {[0, 1, 2].map(index => (
                  <View key={index} style={[styles.strengthBar, index < passwordScore && styles.strengthBarActive]} />
                ))}
              </View>
              <Text style={styles.hint}>{t('auth.passwordHint')}</Text>
              <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
              <TextInput
                value={confirmPassword}
                onChangeText={value => {setConfirmPassword(value); resetError();}}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={t('auth.confirmPassword')}
                placeholderTextColor={colors.faint}
                style={[styles.input, confirmPassword && confirmPassword !== password && styles.inputError]}
              />
            </>
          ) : null}

          {formError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          <Pressable onPress={submit} disabled={loading || !canSubmit} style={[styles.primary, (!canSubmit || loading) && styles.primaryDisabled]}>
            <LinearGradient colors={(!canSubmit || loading) ? ['#243049', '#1A2337'] : [colors.primary, colors.primary2]} style={styles.primaryFill}>
              {loading ? <ActivityIndicator color={colors.text} /> : mode === 'login' ? <LockKeyhole color={colors.text} size={18} /> : <UserPlus color={colors.text} size={18} />}
              <Text style={styles.primaryText}>{loading ? t('auth.working') : t(`auth.${mode}`)}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.demoTitle}>{t('auth.judgeAccounts')}</Text>
          <Text style={styles.demoText}>{t('auth.judgeHint')}</Text>
          <View style={styles.demoGrid}>
            {testAccounts.map(account => (
              <Pressable key={account.email} onPress={() => enterDemo(account)} style={styles.demoRow}>
                <Text style={styles.demoRole}>{t(roleLabelKey(account.role))}</Text>
                <Text numberOfLines={1} style={styles.demoEmail}>{account.email}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {gap: 16, padding: 22, paddingBottom: 42},
  languageRow: {alignSelf: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center'},
  languageChip: {alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 8},
  languageChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  languageText: {color: colors.muted, fontSize: 10, fontWeight: '900'},
  languageTextActive: {color: colors.text},
  logo: {alignItems: 'center', paddingTop: 10},
  logoMark: {alignItems: 'center', borderRadius: 24, height: 68, justifyContent: 'center', width: 68},
  title: {color: colors.text, fontSize: 36, fontWeight: '900', marginTop: 14},
  ai: {color: colors.primary2},
  subtitle: {color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 6, textAlign: 'center'},
  valueCard: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, gap: 10, padding: 14},
  valueRow: {alignItems: 'center', flexDirection: 'row', gap: 10},
  valueIcon: {alignItems: 'center', backgroundColor: colors.primarySoft, borderRadius: 10, height: 34, justifyContent: 'center', width: 34},
  valueText: {color: colors.text, flex: 1, fontSize: 12, fontWeight: '800', lineHeight: 17},
  switchRow: {alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 14, flexDirection: 'row', padding: 4},
  switchChip: {borderRadius: 11, minWidth: 124, paddingHorizontal: 22, paddingVertical: 10},
  switchChipActive: {backgroundColor: colors.surface3},
  switchText: {color: colors.faint, fontSize: 13, fontWeight: '900', textAlign: 'center'},
  switchTextActive: {color: colors.text},
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, padding: 16},
  label: {color: colors.muted, fontSize: 11, fontWeight: '900', marginBottom: 7, marginTop: 10},
  input: {backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 14},
  inputError: {borderColor: colors.danger},
  passwordWrap: {alignItems: 'center', backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 13, borderWidth: 1, flexDirection: 'row'},
  passwordInput: {color: colors.text, flex: 1, minHeight: 48, paddingHorizontal: 14},
  eyeButton: {alignItems: 'center', height: 48, justifyContent: 'center', width: 48},
  strengthTrack: {flexDirection: 'row', gap: 6, marginTop: 10},
  strengthBar: {backgroundColor: colors.surface3, borderRadius: 4, flex: 1, height: 5},
  strengthBarActive: {backgroundColor: colors.success},
  hint: {color: colors.faint, fontSize: 11, lineHeight: 16, marginTop: 7},
  roleGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  roleChip: {backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 11, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9},
  roleChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  roleText: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  roleTextActive: {color: colors.text},
  errorBox: {backgroundColor: colors.dangerSoft, borderColor: `${colors.danger}66`, borderRadius: 13, borderWidth: 1, marginTop: 12, padding: 11},
  errorText: {color: colors.text, fontSize: 12, fontWeight: '800', lineHeight: 18},
  primary: {marginTop: 16},
  primaryDisabled: {opacity: 0.75},
  primaryFill: {alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52},
  primaryText: {color: colors.text, fontSize: 14, fontWeight: '900'},
  demoTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  demoText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4},
  demoGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12},
  demoRow: {backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 13, borderWidth: 1, padding: 11, width: '48%'},
  demoEmail: {color: colors.muted, fontSize: 10, marginTop: 4},
  demoRole: {color: colors.text, fontSize: 12, fontWeight: '900'},
});
