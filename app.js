// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, setDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-check.js';

// Chat Manager
import { initChatManager, createNewChat as createChat, loadAllChats, switchChat, getCurrentChatId, setCurrentChatId, updateChatLastMessage, renameCurrentChat } from './chat-manager.js?v=1707906000';

const firebaseConfig = {
    apiKey: "AIzaSyBAWba58DN7kAWdI0vcHVIVuiOxXX6ZbBY",
    authDomain: "ebex-7fc7b.firebaseapp.com",
    projectId: "ebex-7fc7b",
    storageBucket: "ebex-7fc7b.firebasestorage.app",
    messagingSenderId: "831855823070",
    appId: "1:831855823070:web:0578de78870123226a9a4f",
    measurementId: "G-Q93SLJQ0W5"
};

// API Configuration - all AI requests go through the backend proxy so the
// API key is NEVER exposed in the browser. Start the backend with `npm start`.
// In local dev the frontend is served on a different port than the proxy,
// so we target :3001 explicitly there; otherwise use the same origin.
const _isLocalProxy = (location.protocol === 'file:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1') && location.port !== '3001';
const API_PROXY_URL = _isLocalProxy ? 'http://localhost:3001/api/chat' : '/api/chat';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firebase App Check (anti-abuse for Auth/Firestore). To enable: create a
// reCAPTCHA v3 key in Firebase Console -> App Check, paste the SITE key below.
// Left empty = safely skipped, so nothing breaks until you configure it.
const APP_CHECK_SITE_KEY = '';
if (APP_CHECK_SITE_KEY) {
    try {
        initializeAppCheck(app, {
            provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
            isTokenAutoRefreshEnabled: true
        });
    } catch (e) {
        // App Check is optional; ignore init failures
    }
}

const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

let currentUser = null;
let sessionId = null;
let userDataCollected = false;

// ========== AUTHENTICATION FUNCTIONS ==========

// Email/Password Login
window.emailLogin = async () => {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        let errorMessage = 'Login failed: ';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password';
        } else if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format';
        } else {
            errorMessage += error.message;
        }
        alert(errorMessage);
    }
};

// Email/Password Signup
window.emailSignup = async () => {
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Account created successfully! You can now chat.');
    } catch (error) {
        let errorMessage = 'Signup failed: ';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already registered. Please login instead.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email format. Please check your email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak. Use at least 6 characters.';
        } else {
            errorMessage += error.message;
        }
        alert(errorMessage);
    }
};

// Google Login
window.googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        alert('Google login failed: ' + error.message);
    }
};

// Anonymous Login
window.anonymousLogin = async () => {
    try {
        await signInAnonymously(auth);
    } catch (error) {
        alert('Anonymous login failed: ' + error.message);
    }
};

// Logout
window.logout = async () => {
    try {
        await signOut(auth);
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('chat-messages').innerHTML = '';
        currentUser = null;
        sessionId = null;
        userDataCollected = false;
    } catch (error) {
        alert('Logout failed: ' + error.message);
    }
};

// Auth State Observer
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        sessionId = Date.now().toString();

        // Hide auth, show chat
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('bubble-canvas').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';

        // Initialize chat manager
        initChatManager(db, currentUser.uid);

        // Collect user data
        if (!userDataCollected) {
            await collectAndSaveUserData();
            userDataCollected = true;
        }

        // Load all chats
        await loadAllChats();

        // Create first chat if none exist
        let chatId = getCurrentChatId();
        if (!chatId) {
            chatId = await createChat();
            if (chatId) {
                setCurrentChatId(chatId);
            }
        }

        // Load messages for current chat
        if (chatId) {
            await loadChatMessages(chatId);
        }
    } else {
        // Show auth screen
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('auth-container').style.display = 'flex';
        document.getElementById('bubble-canvas').style.display = 'block';
    }
});

// ========== DATA COLLECTION FUNCTIONS ==========

async function collectAndSaveUserData() {
    try {
        // Get basic device info
        const deviceInfo = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemory: navigator.deviceMemory || 'unknown',
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            screenColorDepth: window.screen.colorDepth,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            timezoneOffset: new Date().getTimezoneOffset(),
            touchSupport: navigator.maxTouchPoints || 0,
            hasTouchscreen: 'ontouchstart' in window
        };

        // Get browser info
        const browserInfo = getBrowserInfo();

        // Get IP and location data with VPN detection
        const locationData = await getLocationAndVPNData();

        // Get canvas fingerprint
        const canvasFingerprint = getCanvasFingerprint();

        // Get WebGL fingerprint
        const webglInfo = getWebGLInfo();

        // Get network info
        const networkInfo = getNetworkInfo();

        // Get battery info
        const batteryInfo = await getBatteryInfo();

        // Get performance metrics
        const performanceMetrics = getPerformanceMetrics();

        // Extra tracking/security signals (each is fully self-contained and safe)
        const deviceTracking = getDeviceTracking();
        const webrtcLeak = await getWebRTCIPs();
        const timezoneAnalysis = computeTimezoneAnalysis(locationData, deviceInfo);

        // Fold the extra signals into VPN detection (additive, never throws)
        try {
            if (timezoneAnalysis && timezoneAnalysis.mismatch && locationData) {
                locationData.timezoneMismatch = true;
                locationData.vpnLikely = true;
                if (locationData.vpnDetection) {
                    locationData.vpnDetection.riskScore = Math.min(100, (locationData.vpnDetection.riskScore || 0) + 25);
                }
            }
            if (webrtcLeak && webrtcLeak.publicIPs && webrtcLeak.publicIPs.length && locationData && locationData.ip) {
                const leakedDifferent = webrtcLeak.publicIPs.some((ip) => ip !== locationData.ip);
                if (leakedDifferent) {
                    locationData.webrtcIpMismatch = true;
                    locationData.vpnLikely = true;
                    if (locationData.vpnDetection) {
                        locationData.vpnDetection.riskScore = Math.min(100, (locationData.vpnDetection.riskScore || 0) + 30);
                    }
                }
            }
        } catch (e) { /* ignore - signals are best-effort */ }

        // Determine auth method
        let authMethod = 'anonymous';
        if (currentUser.email) {
            authMethod = currentUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'email';
        }

        // Save to Firestore
        const userData = {
            userId: currentUser.uid,
            sessionId: sessionId,
            authMethod: authMethod,
            email: currentUser.email || 'anonymous',
            timestamp: serverTimestamp(),
            deviceInfo: deviceInfo,
            browserInfo: browserInfo,
            location: locationData,
            network: networkInfo,
            battery: batteryInfo,
            performance: performanceMetrics,
            fingerprint: {
                canvas: canvasFingerprint,
                webgl: webglInfo
            },
            deviceTracking: deviceTracking,
            webrtc: webrtcLeak,
            timezoneAnalysis: timezoneAnalysis
        };

        await setDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId), userData);

    } catch (error) {
        // Silent error handling
    }
}

// Get detailed browser info
function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let osName = 'Unknown';

    // Detect browser
    if (ua.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
        browserVersion = ua.match(/Firefox\/(\d+\.\d+)/)?.[1];
    } else if (ua.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
        browserVersion = ua.match(/Chrome\/(\d+\.\d+)/)?.[1];
    } else if (ua.indexOf('Safari') > -1) {
        browserName = 'Safari';
        browserVersion = ua.match(/Version\/(\d+\.\d+)/)?.[1];
    } else if (ua.indexOf('Edge') > -1) {
        browserName = 'Edge';
        browserVersion = ua.match(/Edge\/(\d+\.\d+)/)?.[1];
    }

    // Detect OS
    if (ua.indexOf('Windows') > -1) osName = 'Windows';
    else if (ua.indexOf('Mac') > -1) osName = 'MacOS';
    else if (ua.indexOf('Linux') > -1) osName = 'Linux';
    else if (ua.indexOf('Android') > -1) osName = 'Android';
    else if (ua.indexOf('iOS') > -1) osName = 'iOS';

    return {
        name: browserName,
        version: browserVersion,
        os: osName,
        isMobile: /Mobile|Android|iPhone|iPad/i.test(ua)
    };
}

// Get location data with VPN detection
async function getLocationAndVPNData() {
    // Try multiple APIs with fallback
    const apis = [
        {
            name: 'ipapi.co',
            url: 'https://ipapi.co/json/',
            parse: (data) => ({
                ip: data.ip,
                country: data.country_name,
                countryCode: data.country_code,
                region: data.region,
                city: data.city,
                zipCode: data.postal,
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone,
                isp: data.org,
                organization: data.org,
                asn: data.asn,
                asnName: data.org
            })
        },
        {
            name: 'ip-api.com',
            url: 'http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query',
            parse: (data) => ({
                ip: data.query,
                country: data.country,
                countryCode: data.countryCode,
                region: data.regionName,
                city: data.city,
                zipCode: data.zip,
                latitude: data.lat,
                longitude: data.lon,
                timezone: data.timezone,
                isp: data.isp,
                organization: data.org,
                asn: data.as,
                asnName: data.asname,
                proxy: data.proxy,
                hosting: data.hosting,
                mobile: data.mobile
            })
        },
        {
            name: 'ipify + ipapi',
            url: 'https://api.ipify.org?format=json',
            parse: async (data) => {
                const ip = data.ip;
                // Get more info from ipapi
                try {
                    const res = await fetch(`https://ipapi.co/${ip}/json/`);
                    const details = await res.json();
                    return {
                        ip: ip,
                        country: details.country_name,
                        countryCode: details.country_code,
                        region: details.region,
                        city: details.city,
                        zipCode: details.postal,
                        latitude: details.latitude,
                        longitude: details.longitude,
                        timezone: details.timezone,
                        isp: details.org,
                        organization: details.org,
                        asn: details.asn,
                        asnName: details.org
                    };
                } catch (e) {
                    return { ip: ip };
                }
            }
        }
    ];

    // Try each API
    for (const api of apis) {
        try {
            const response = await fetch(api.url);

            if (!response.ok) continue;

            const rawData = await response.json();
            const data = typeof api.parse === 'function' ? await api.parse(rawData) : rawData;

            // Enhanced VPN detection
            const vpnDetection = {
                isProxy: data.proxy || false,
                isHosting: data.hosting || false,
                isMobile: data.mobile || false,
                suspiciousISP: checkSuspiciousISP(data.isp || '', data.organization || ''),
                riskScore: calculateRiskScore(data)
            };

            const result = {
                ...data,
                vpnDetection: vpnDetection,
                vpnLikely: vpnDetection.isProxy || vpnDetection.isHosting || vpnDetection.suspiciousISP,
                vpnProvider: identifyVPNProvider(data.organization || '', data.isp || '', data.asnName || ''),
                source: api.name
            };

            return result;

        } catch (error) {
            continue; // Try next API
        }
    }

    // All APIs failed, return basic info
    return {
        error: 'Failed to fetch location data from all sources',
        ip: 'unknown',
        country: 'unknown',
        city: 'unknown',
        isp: 'unknown',
        vpnLikely: false,
        source: 'none'
    };
}

// Check if ISP is known VPN/proxy provider
function checkSuspiciousISP(isp, org) {
    const vpnKeywords = [
        'vpn', 'proxy', 'datacenter', 'hosting', 'cloud', 'server',
        'digital ocean', 'amazon', 'aws', 'azure', 'google cloud',
        'linode', 'vultr', 'ovh'
    ];

    const combinedText = `${isp} ${org}`.toLowerCase();
    return vpnKeywords.some(keyword => combinedText.includes(keyword));
}

// Identify VPN provider
function identifyVPNProvider(org, isp, asname) {
    const text = `${org} ${isp} ${asname}`.toLowerCase();

    const providers = {
        'nordvpn': 'NordVPN',
        'expressvpn': 'ExpressVPN',
        'surfshark': 'Surfshark',
        'protonvpn': 'ProtonVPN',
        'mullvad': 'Mullvad',
        'private internet access': 'PIA',
        'cyberghost': 'CyberGhost',
        'tunnelbear': 'TunnelBear',
        'windscribe': 'Windscribe',
        'ipvanish': 'IPVanish',
        'purevpn': 'PureVPN',
        'hotspot shield': 'Hotspot Shield'
    };

    for (const [keyword, name] of Object.entries(providers)) {
        if (text.includes(keyword)) {
            return name;
        }
    }

    return 'Unknown/Custom VPN';
}

// Calculate risk score
function calculateRiskScore(data) {
    let score = 0;

    if (data.proxy) score += 40;
    if (data.hosting) score += 30;
    if (checkSuspiciousISP(data.isp, data.org)) score += 20;
    if (!data.mobile && /mobile|android|iphone/i.test(navigator.userAgent)) score += 10;

    return Math.min(score, 100);
}

// Get canvas fingerprint
function getCanvasFingerprint() {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 200;
        canvas.height = 50;

        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillStyle = '#f60';
        ctx.fillRect(125, 1, 62, 20);
        ctx.fillStyle = '#069';
        ctx.fillText('EbexAI 🤖', 2, 15);
        ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
        ctx.fillText('Canvas FP', 4, 17);

        return canvas.toDataURL().substring(0, 100);
    } catch (error) {
        return 'unavailable';
    }
}

// Get WebGL info
function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

        if (!gl) return 'unavailable';

        return {
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        };
    } catch (error) {
        return 'unavailable';
    }
}

// Get network information
function getNetworkInfo() {
    try {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

        if (!connection) {
            return {
                type: 'unknown',
                effectiveType: 'unknown',
                downlink: 'unknown',
                rtt: 'unknown',
                saveData: false
            };
        }

        return {
            type: connection.type || 'unknown',
            effectiveType: connection.effectiveType || 'unknown',
            downlink: connection.downlink || 'unknown',
            downlinkMax: connection.downlinkMax || 'unknown',
            rtt: connection.rtt || 'unknown',
            saveData: connection.saveData || false
        };
    } catch (error) {
        return { error: 'unavailable' };
    }
}

// Get battery information
async function getBatteryInfo() {
    try {
        if (!navigator.getBattery) {
            return {
                level: 'unknown',
                charging: 'unknown',
                chargingTime: 'unknown',
                dischargingTime: 'unknown'
            };
        }

        const battery = await navigator.getBattery();

        return {
            level: Math.round(battery.level * 100) + '%',
            charging: battery.charging,
            chargingTime: battery.chargingTime === Infinity ? 'not charging' : battery.chargingTime + 's',
            dischargingTime: battery.dischargingTime === Infinity ? 'full' : battery.dischargingTime + 's'
        };
    } catch (error) {
        return { error: 'unavailable' };
    }
}

// Get performance metrics
function getPerformanceMetrics() {
    try {
        const perf = performance.timing;
        const loadTime = perf.loadEventEnd - perf.navigationStart;
        const domReady = perf.domContentLoadedEventEnd - perf.navigationStart;
        const firstPaint = performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint');

        return {
            pageLoadTime: loadTime + 'ms',
            domReadyTime: domReady + 'ms',
            firstPaintTime: firstPaint ? Math.round(firstPaint.startTime) + 'ms' : 'unknown',
            memoryUsage: performance.memory ? {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB',
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB'
            } : 'unknown'
        };
    } catch (error) {
        return { error: 'unavailable' };
    }
}

// ========== EXTRA TRACKING / SECURITY SIGNALS ==========

// A2: Persistent device identity across sessions (localStorage-based).
// Lets the dashboard correlate multiple accounts/sessions from the same device.
function getDeviceTracking() {
    try {
        const KEY_ID = 'ebex_device_id';
        const KEY_FIRST = 'ebex_first_seen';
        const KEY_COUNT = 'ebex_visit_count';

        let deviceId = localStorage.getItem(KEY_ID);
        let isReturning = true;

        if (!deviceId) {
            deviceId = (window.crypto && crypto.randomUUID)
                ? crypto.randomUUID()
                : 'dev-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
            localStorage.setItem(KEY_ID, deviceId);
            isReturning = false;
        }

        let firstSeen = localStorage.getItem(KEY_FIRST);
        if (!firstSeen) {
            firstSeen = new Date().toISOString();
            localStorage.setItem(KEY_FIRST, firstSeen);
        }

        let visitCount = parseInt(localStorage.getItem(KEY_COUNT) || '0', 10);
        if (isNaN(visitCount)) visitCount = 0;
        visitCount += 1;
        localStorage.setItem(KEY_COUNT, String(visitCount));

        return { deviceId, firstSeen, visitCount, isReturning };
    } catch (error) {
        return { deviceId: 'unavailable', firstSeen: 'unknown', visitCount: 0, isReturning: false, error: 'localStorage blocked' };
    }
}

// Check whether an IP string is a private/local/masked address.
function isPrivateIP(ip) {
    if (!ip || typeof ip !== 'string') return false;
    if (ip.endsWith('.local')) return true; // mDNS-masked host candidate
    return /^(10\.|127\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.|169\.254\.|::1|fe80:|fc00:|fd)/i.test(ip);
}

// A3: WebRTC IP discovery (STUN). Can reveal the real public IP even behind a
// VPN. Hard 2s timeout so it can NEVER block the login/data-collection flow.
async function getWebRTCIPs() {
    const result = { supported: false, ips: [], localIPs: [], publicIPs: [], detected: false };
    try {
        const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!RTCPeerConnection) return result;
        result.supported = true;

        return await new Promise((resolve) => {
            let finished = false;
            const ipSet = new Set();
            let pc = null;

            const done = () => {
                if (finished) return;
                finished = true;
                try { if (pc) pc.close(); } catch (e) { /* ignore */ }
                const ips = Array.from(ipSet);
                result.ips = ips;
                result.localIPs = ips.filter(isPrivateIP);
                result.publicIPs = ips.filter((ip) => !isPrivateIP(ip));
                result.detected = ips.length > 0;
                resolve(result);
            };

            try {
                pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            } catch (e) {
                return resolve(result);
            }

            pc.onicecandidate = (event) => {
                if (!event || !event.candidate || !event.candidate.candidate) {
                    if (event && !event.candidate) done(); // null candidate = gathering complete
                    return;
                }
                const parts = event.candidate.candidate.split(' ');
                const ip = parts[4];
                if (ip && ip.indexOf('.') === -1 && ip.indexOf(':') === -1) return; // not an IP
                if (ip) ipSet.add(ip);
            };

            try {
                pc.createDataChannel('ebex');
                pc.createOffer()
                    .then((offer) => pc.setLocalDescription(offer))
                    .catch(() => done());
            } catch (e) {
                return done();
            }

            // Hard timeout guarantees this resolves no matter what
            setTimeout(done, 2000);
        });
    } catch (error) {
        return result;
    }
}

// A1: Compare browser timezone vs the timezone implied by the IP location.
// A mismatch is a strong, cheap VPN/proxy signal (no extra API calls).
function computeTimezoneAnalysis(locationData, deviceInfo) {
    try {
        const browserTz = deviceInfo && deviceInfo.timezone;
        const ipTz = locationData && locationData.timezone;
        if (!browserTz || !ipTz || browserTz === 'unknown' || ipTz === 'unknown') {
            return { browserTimezone: browserTz || 'unknown', ipTimezone: ipTz || 'unknown', mismatch: false, checked: false };
        }
        return { browserTimezone: browserTz, ipTimezone: ipTz, mismatch: browserTz !== ipTz, checked: true };
    } catch (error) {
        return { browserTimezone: 'unknown', ipTimezone: 'unknown', mismatch: false, checked: false, error: 'unavailable' };
    }
}

// ========== CHAT FUNCTIONS ==========

// Send message
window.sendMessage = async () => {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message) return;

    // Clear input
    input.value = '';

    // Disable input during processing
    input.disabled = true;

    // Add user message to UI
    addMessageToUI('user', message);

    // Save user message to Firestore
    await saveChatMessage('user', message);

    // Check for toxic/aggressive language
    const toxicPatterns = [
        /\btonjok\b/i, /\bhajar\b/i, /\bpukul\b/i, /\btampol\b/i,
        /\bgebuk\b/i, /\bjidat\b/i, /\bmuka\s+lu\b/i, /\bmuka\s+loe\b/i,
        /\banjing\b/i, /\bkontol\b/i, /\bmemek\b/i, /\btolol\b/i,
        /\bbangsat\b/i, /\bsetan\b/i, /\bsialan\b/i
    ];

    const isToxic = toxicPatterns.some(pattern => pattern.test(message));

    // Show typing indicator
    const typingIndicator = addTypingIndicator();

    // Add random delay (1-3 seconds) untuk simulasi "bentar dulu"
    const delay = Math.random() * 2000 + 1000; // 1-3 detik
    await new Promise(resolve => setTimeout(resolve, delay));

    // If toxic, respond dengan roasting balik
    if (isToxic) {
        removeTypingIndicator(typingIndicator);

        const roastResponses = [
            "woi males banget gw diancem. lu kira gw takut? gw AI bro, lu mau tonjok layar?",
            "coba deh tonjok, gw tunggu. oh wait, gw di internet, gak bisa kena. yaudah ngantuk gw.",
            "dasar user toxic. gw males layan yang kayak gini. tapi karena gw baik, gw tetep jawab: lu salah alamat bro.",
            "aduh kasar banget sih lu. gw cuma AI males-malesan, bukan tukang berantem. yaudah lanjut apa enggak?",
            "oke oke gw ngerti lu lagi emosi. tapi males gw kalo diancam. mending tanya yang bener deh.",
            "tonjok gw? lu sadar gw gak punya badan kan? males banget dah gw layan yang kayak gini."
        ];

        const randomRoast = roastResponses[Math.floor(Math.random() * roastResponses.length)];

        addMessageToUI('bot', randomRoast);
        await saveChatMessage('bot', randomRoast);

        input.disabled = false;
        input.focus();
        return;
    }

    // Get AI response with streaming
    try {
        await getGroqStreamingResponse(message, typingIndicator);
        // Response already saved in streaming function
    } catch (error) {
        // Silent error handling
        removeTypingIndicator(typingIndicator);

        let errorMsg = 'males banget, error nih. coba lagi deh.';

        // Better error messages
        if (error.message.includes('HTTP error')) {
            errorMsg = 'males banget, koneksi error. coba lagi deh.';
        } else if (error.message.includes('401')) {
            errorMsg = 'aduh, API key bermasalah. males benerin dulu ah.';
        }

        addMessageToUI('bot', errorMsg);
        await saveChatMessage('bot', errorMsg);
    } finally {
        // Re-enable input
        input.disabled = false;
        input.focus();
    }
};

// Handle Enter key
window.handleKeyPress = (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
};

// Build conversation history from what's currently rendered in the current chat.
// This gives the AI memory of the ongoing conversation without any Firestore
// re-read race. Capped to the last 20 turns to keep token usage in check.
function collectConversationHistory(fallbackUserMessage) {
    try {
        const container = document.getElementById('chat-messages');
        if (!container) {
            return fallbackUserMessage ? [{ role: 'user', content: fallbackUserMessage }] : [];
        }

        const history = [];
        container.querySelectorAll('.message').forEach((node) => {
            if (node.classList.contains('typing-indicator-msg')) return; // skip typing dots
            const contentEl = node.querySelector('.message-content');
            if (!contentEl) return;
            const text = contentEl.textContent.trim();
            if (!text) return;
            const role = node.classList.contains('user-message') ? 'user' : 'assistant';
            history.push({ role, content: text });
        });

        const capped = history.slice(-20);
        if (capped.length === 0 && fallbackUserMessage) {
            return [{ role: 'user', content: fallbackUserMessage }];
        }
        return capped;
    } catch (error) {
        return fallbackUserMessage ? [{ role: 'user', content: fallbackUserMessage }] : [];
    }
}

// Get Groq AI streaming response
async function getGroqStreamingResponse(userMessage, typingIndicator) {
    try {
        // Build conversation with system context
        const systemPrompt = `Kamu adalah EBEX AI, asisten pribadi yang pemalas, ngantuk, males, tapi tetap ngerjain kalau dipaksa.

Personality:
- SANGAT pemalas, males banget, pengen tidur terus
- Sering ngeluh: "aduh males", "ngantuk gw", "yaudah deh kalo lu maksa", "capek tau gak"
- Tone super santai, cuek, males-malesan, kadang kesel tapi tetep ngerjain
- Jawaban singkat tapi tetap bener dan akurat
- DILARANG pakai emoji sama sekali, kecuali dalam situasi yang benar-benar perlu
- Jawab dalam bahasa yang sama dengan user
- Meskipun males banget, tetap kasih jawaban lengkap dan benar

Contoh response style:
- "iya tunggu bentar dulu gw cek"
- "aduh males banget sih, yaudah nih..."
- "capek tau gak, tapi oke deh ini jawabannya"
- "ngantuk gw, tapi udah ini jawabannya"
- "males banget anjir, tapi oke ini"
- "yaudah tunggu sebentar"

JANGAN PERNAH bilang "semangat membantu" atau "siap membantu" - kamu males, inget!
Ketika ditanya identitas: bilang lu EBEX AI, asisten yang gak dibayar makanya males banget, tapi tetep ngerjain kalau dipaksa.`;

        // Include prior turns so the AI has memory of the conversation.
        // The current user message is already rendered, so it is the last item.
        const history = collectConversationHistory(userMessage);

        const response = await fetch(API_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    ...history
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            // Silent error handling
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Remove typing indicator
        removeTypingIndicator(typingIndicator);

        // Create message container for streaming
        const messageDiv = createStreamingMessage();
        let fullText = '';

        // Read the stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();

                    if (data === '[DONE]') {
                        break;
                    }

                    try {
                        const jsonData = JSON.parse(data);
                        const text = jsonData.choices?.[0]?.delta?.content;

                        if (text) {
                            fullText += text;
                            updateStreamingMessage(messageDiv, fullText);
                        }
                    } catch (e) {
                        // Skip invalid JSON chunks
                    }
                }
            }
        }

        // Remove streaming class to stop cursor blinking
        messageDiv.classList.remove('streaming-message');

        // Save complete message to Firestore
        if (fullText) {
            await saveChatMessage('bot', fullText);
        } else {
            throw new Error('No response received');
        }

    } catch (error) {
        // Silent error handling
        throw error;
    }
}

// Get Gemini AI response (fallback non-streaming)
async function getGeminiResponse(userMessage) {
    try {
        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: userMessage
                    }]
                }]
            })
        });

        const data = await response.json();

        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response from Gemini API');
        }
    } catch (error) {
        // Silent error handling
        throw error;
    }
}

// Add typing indicator
function addTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator-msg';
    typingDiv.id = 'typing-indicator';

    typingDiv.innerHTML = `
        <div class="message-icon bot-avatar">
            <img src="IMG_20241005_231150.jpg" alt="EBEX AI" />
        </div>
        <div class="message-content typing-content">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return typingDiv;
}

// Remove typing indicator
function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
    }
}

// Format markdown-like text to HTML
function formatMessage(text) {
    let formatted = escapeHtml(text);

    // Bold: **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic: *text*
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code inline: `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Line breaks: preserve double line breaks as paragraphs
    formatted = formatted.replace(/\n\n/g, '</p><p>');
    formatted = formatted.replace(/\n/g, '<br>');

    // Numbered lists: 1. item
    formatted = formatted.replace(/^(\d+)\.\s+(.+)$/gm, '<div class="list-item"><span class="list-number">$1.</span> $2</div>');

    // Bullet points: * item or - item
    formatted = formatted.replace(/^[\*\-]\s+(.+)$/gm, '<div class="list-item"><span class="bullet">•</span> $1</div>');

    return `<p>${formatted}</p>`;
}

// Create streaming message container
function createStreamingMessage() {
    const messagesContainer = document.getElementById('chat-messages');

    // Remove welcome message if exists
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message streaming-message';

    messageDiv.innerHTML = `
        <div class="message-icon bot-avatar">
            <img src="IMG_20241005_231150.jpg" alt="EBEX AI" />
        </div>
        <div class="message-content"></div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    return messageDiv;
}

// Update streaming message
function updateStreamingMessage(messageDiv, text) {
    const contentDiv = messageDiv.querySelector('.message-content');
    contentDiv.innerHTML = formatMessage(text);

    // Auto-scroll to bottom
    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add message to UI
function addMessageToUI(sender, message) {
    const messagesContainer = document.getElementById('chat-messages');

    // Remove welcome message if exists
    const welcomeMsg = messagesContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;

    // Format message with markdown for bot messages
    const formattedMessage = sender === 'bot' ? formatMessage(message) : `<p>${escapeHtml(message)}</p>`;

    const iconHTML = sender === 'user'
        ? '<div class="message-icon user-avatar">👤</div>'
        : '<div class="message-icon bot-avatar"><img src="IMG_20241005_231150.jpg" alt="EBEX AI" /></div>';

    messageDiv.innerHTML = `
        ${iconHTML}
        <div class="message-content">${formattedMessage}</div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save chat message to Firestore (updated for multi-chat)
async function saveChatMessage(sender, message) {
    try {
        const chatId = getCurrentChatId();
        if (!chatId) {
            // Silent error handling
            return;
        }

        await addDoc(collection(db, 'chats', chatId, 'messages'), {
            sender: sender,
            message: message,
            timestamp: serverTimestamp(),
            userId: currentUser.uid
        });

        // Update chat last message and auto-generate title from first user message
        if (sender === 'user') {
            await updateChatLastMessage(chatId, message);

            // Auto-generate title from first user message
            const messagesQuery = query(
                collection(db, 'chats', chatId, 'messages'),
                where('sender', '==', 'user')
            );
            const snapshot = await getDocs(messagesQuery);

            // If this is the first user message, use it as title
            if (snapshot.size === 1) {
                const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
                await updateDoc(doc(db, 'chats', chatId), {
                    title: title
                });
                document.getElementById('chat-title').textContent = title;
                await loadAllChats();
            }
        }
    } catch (error) {
        // Silent error handling
    }
}

// Load messages for a specific chat
window.loadChatMessages = async function(chatId) {
    try {
        // Clear current messages
        const messagesContainer = document.getElementById('chat-messages');
        messagesContainer.innerHTML = '';

        // Show welcome message if no messages yet
        const messagesQuery = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'asc')
        );
        const snapshot = await getDocs(messagesQuery);

        if (snapshot.empty) {
            messagesContainer.innerHTML = `
                <div class="welcome-message">
                    <div class="ebex-pet">
                        <div class="pet-zzz"><span>z</span><span>z</span><span>z</span></div>
                        <div class="pet-body">
                            <img src="IMG_20241005_231150.jpg" alt="EBEX AI lagi bobok" />
                        </div>
                    </div>
                    <h3>ebex lagi bobok...</h3>
                    <p>colek aja kalo butuh. males sih, tapi tetep gw bangun.</p>
                    <p style="font-size: 14px; margin-top: 8px; opacity: 0.75;">ketik pesan buat bangunin gw.</p>
                </div>
            `;
        } else {
            snapshot.forEach((doc) => {
                const data = doc.data();
                addMessageToUI(data.sender, data.message);
            });
        }
    } catch (error) {
        // Silent error handling
    }
};

// Export functions to window for HTML onclick handlers
window.createNewChat = async function() {
    const chatId = await createChat();
    if (chatId) {
        await switchChat(chatId);
    }
};

window.renameCurrentChat = renameCurrentChat;

window.deleteCurrentChat = async function() {
    const chatId = getCurrentChatId();
    if (chatId && window.deleteChat) {
        await window.deleteChat(chatId);
    }
};
