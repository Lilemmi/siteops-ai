import React, {useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useTranslation} from 'react-i18next';
import {HardHat, LockKeyhole, UserPlus} from 'lucide-react-native';
import {AppUser, loginUser, registerUser, roleLabelKey, testAccounts, UserRole} from '../services/authService';
import {colors, radii} from '../theme';

const roles: UserRole[] = ['owner', 'manager', 'foreman', 'accountant', 'worker'];

export function AuthScreen({onAuthenticated}: {onAuthenticated: (user: AppUser) => void}) {
  const {t} = useTranslation();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('owner@siteops.ai');
  const [password, setPassword] = useState('demo123');
  const [name, setName] = useState('Alex');
  const [companyName, setCompanyName] = useState('SiteOps Demo');
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.trim() || !password.trim() || (mode === 'register' && !name.trim())) {
      Alert.alert(t('auth.validationTitle'), t('auth.validationMessage'));
      return;
    }
    setLoading(true);
    try {
      const user = mode === 'login'
        ? await loginUser(email, password)
        : await registerUser({email, password, name, role, companyName});
      onAuthenticated(user);
    } catch {
      Alert.alert(t('auth.failedTitle'), t(mode === 'login' ? 'auth.failedLogin' : 'auth.failedRegister'));
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(account: typeof testAccounts[number]) {
    setMode('login');
    setEmail(account.email);
    setPassword(account.password);
  }

  return (
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logo}>
          <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.logoMark}>
            <HardHat color={colors.text} size={30} />
          </LinearGradient>
          <Text style={styles.title}>SiteOps <Text style={styles.ai}>AI</Text></Text>
          <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
        </View>

        <View style={styles.switchRow}>
          {(['login', 'register'] as const).map(item => (
            <Pressable key={item} onPress={() => setMode(item)} style={[styles.switchChip, mode === item && styles.switchChipActive]}>
              <Text style={[styles.switchText, mode === item && styles.switchTextActive]}>{t(`auth.${item}`)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.card}>
          {mode === 'register' ? (
            <>
              <Text style={styles.label}>{t('auth.name')}</Text>
              <TextInput value={name} onChangeText={setName} placeholder="Alex" placeholderTextColor={colors.faint} style={styles.input} />
              <Text style={styles.label}>{t('auth.company')}</Text>
              <TextInput value={companyName} onChangeText={setCompanyName} placeholder="SiteOps Demo" placeholderTextColor={colors.faint} style={styles.input} />
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
          <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="owner@siteops.ai" placeholderTextColor={colors.faint} style={styles.input} />
          <Text style={styles.label}>{t('auth.password')}</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="demo123" placeholderTextColor={colors.faint} style={styles.input} />
          <Pressable onPress={submit} disabled={loading} style={styles.primary}>
            <LinearGradient colors={[colors.primary, colors.primary2]} style={styles.primaryFill}>
              {mode === 'login' ? <LockKeyhole color={colors.text} size={18} /> : <UserPlus color={colors.text} size={18} />}
              <Text style={styles.primaryText}>{loading ? t('auth.working') : t(`auth.${mode}`)}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.demoTitle}>{t('auth.judgeAccounts')}</Text>
          <Text style={styles.demoText}>{t('auth.judgeHint')}</Text>
          {testAccounts.map(account => (
            <Pressable key={account.email} onPress={() => fillDemoAccount(account)} style={styles.demoRow}>
              <View>
                <Text style={styles.demoEmail}>{account.email}</Text>
                <Text style={styles.demoRole}>{t(roleLabelKey(account.role))} • demo123</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: colors.background},
  content: {gap: 16, padding: 22, paddingBottom: 42},
  logo: {alignItems: 'center', paddingTop: 28},
  logoMark: {alignItems: 'center', borderRadius: 22, height: 64, justifyContent: 'center', width: 64},
  title: {color: colors.text, fontSize: 34, fontWeight: '900', marginTop: 14},
  ai: {color: colors.primary2},
  subtitle: {color: colors.muted, fontSize: 14, marginTop: 6, textAlign: 'center'},
  switchRow: {alignSelf: 'center', backgroundColor: colors.surface, borderRadius: 14, flexDirection: 'row', padding: 4},
  switchChip: {borderRadius: 11, paddingHorizontal: 22, paddingVertical: 10},
  switchChipActive: {backgroundColor: colors.surface3},
  switchText: {color: colors.faint, fontSize: 13, fontWeight: '900'},
  switchTextActive: {color: colors.text},
  card: {backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.xl, borderWidth: 1, padding: 16},
  label: {color: colors.muted, fontSize: 11, fontWeight: '900', marginBottom: 7, marginTop: 10},
  input: {backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 13, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 14},
  roleGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  roleChip: {backgroundColor: colors.surface2, borderColor: colors.border, borderRadius: 11, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9},
  roleChipActive: {backgroundColor: colors.primarySoft, borderColor: colors.primary},
  roleText: {color: colors.muted, fontSize: 11, fontWeight: '800'},
  roleTextActive: {color: colors.text},
  primary: {marginTop: 16},
  primaryFill: {alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 52},
  primaryText: {color: colors.text, fontSize: 14, fontWeight: '900'},
  demoTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  demoText: {color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4},
  demoRow: {borderBottomColor: colors.border, borderBottomWidth: 1, paddingVertical: 11},
  demoEmail: {color: colors.text, fontSize: 13, fontWeight: '900'},
  demoRole: {color: colors.muted, fontSize: 11, marginTop: 3},
});
