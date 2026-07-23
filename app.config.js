// Dynamic Expo configuration that embeds environment variables into builds
const IS_DEV = process.env.APP_VARIANT === 'development';
const REPOSITORY_NAME = process.env.GITHUB_REPOSITORY?.split('/')[1];
const WEB_BASE_PATH = process.env.EXPO_PUBLIC_BASE_PATH !== undefined
    ? process.env.EXPO_PUBLIC_BASE_PATH
    : (process.env.GITHUB_ACTIONS === 'true' && REPOSITORY_NAME ? `/${REPOSITORY_NAME}` : '');

export default {
    expo: {
        name: 'agenda-familiar',
        slug: 'agenda-familiar',
        version: '1.0.0',
        orientation: 'portrait',
        icon: 'assets/agendafamiliar.png',
        scheme: 'agendafamiliar',
        userInterfaceStyle: 'automatic',
        newArchEnabled: true,
        ios: {
            supportsTablet: true,
            bundleIdentifier: 'com.natanael.agendafamiliar',
            infoPlist: {
                UIBackgroundModes: ['remote-notification'],
            },
        },
        android: {
            package: 'com.natanael.agendafamiliar',
            adaptiveIcon: {
                backgroundColor: '#E6F4FE',
                foregroundImage: 'assets/agendafamiliar.png',
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false,
            permissions: [
                'android.permission.SCHEDULE_EXACT_ALARM',
                'android.permission.USE_EXACT_ALARM',
                'android.permission.RECEIVE_BOOT_COMPLETED',
                'android.permission.VIBRATE',
                'android.permission.POST_NOTIFICATIONS',
            ],
            googleServicesFile: process.env.GOOGLE_SERVICES_JSON || './google-services.json',
        },
        web: {
            output: 'static',
            favicon: 'assets/agendafamiliar.png',
        },
        plugins: [
            [
                'expo-splash-screen',
                {
                    image: 'assets/agendafamiliar.png',
                    imageWidth: 200,
                    resizeMode: 'contain',
                    backgroundColor: '#ffffff',
                    dark: {
                        backgroundColor: '#000000',
                    },
                },
            ],
            [
                'expo-notifications',
                {
                    icon: './assets/agendafamiliar.png',
                    color: '#5271FF',
                    defaultChannel: 'default',
                    sounds: [],
                },
            ],
            // Commented out for Expo Go compatibility - requires development build
            // '@react-native-google-signin/google-signin',
        ],
        experiments: {
            typedRoutes: false,
            reactCompiler: false,
            baseUrl: WEB_BASE_PATH,
        },
        extra: {
            eas: {
                projectId: 'd014eed9-1574-40c4-89ce-46ebf54f97c5',
            },
            // Firebase configuration - embedded at build time
            firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'AIzaSyBAMfd4iS6Ip2P9ePNk57DOgnCyGIMd_0U',
            firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'agendafamiliarkotlin.firebaseapp.com',
            firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'agendafamiliarkotlin',
            firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'agendafamiliarkotlin.firebasestorage.app',
            firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1038445694694',
            firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '1:1038445694694:web:e7f47a89ac4742d84e3527',
        },
    },
};
