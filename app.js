// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signInAnonymously, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc, setDoc, serverTimestamp, orderBy } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

// Chat Manager
import { initChatManager, createNewChat as createChat, loadAllChats, switchChat, getCurrentChatId, setCurrentChatId, updateChatLastMessage, renameCurrentChat } from './chat-manager.js?v=1707885026';

const firebaseConfig = {
    apiKey: "AIzaSyBAWba58DN7kAWdI0vcHVIVuiOxXX6ZbBY",
    authDomain: "ebex-7fc7b.firebaseapp.com",
    projectId: "ebex-7fc7b",
    storageBucket: "ebex-7fc7b.firebasestorage.app",
    messagingSenderId: "831855823070",
    appId: "1:831855823070:web:0578de78870123226a9a4f",
    measurementId: "G-Q93SLJQ0W5"
};

// API Configuration - using proxy server for security
const API_PROXY_URL = 'http://localhost:3001/api/chat';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
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
            }
        };

        await setDoc(doc(db, 'users', currentUser.uid, 'sessions', sessionId), userData);

        console.log('User data collected and saved');
    } catch (error) {
        console.error('Error collecting user data:', error);
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
    try {
        // Using ip-api.com with VPN detection fields
        const response = await fetch('http://ip-api.com/json/?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting,query');
        const data = await response.json();

        // Enhanced VPN detection
        const vpnDetection = {
            isProxy: data.proxy || false,
            isHosting: data.hosting || false,
            isMobile: data.mobile || false,
            suspiciousISP: checkSuspiciousISP(data.isp, data.org),
            riskScore: calculateRiskScore(data)
        };

        return {
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
            vpnDetection: vpnDetection,
            vpnLikely: vpnDetection.isProxy || vpnDetection.isHosting || vpnDetection.suspiciousISP,
            vpnProvider: identifyVPNProvider(data.org, data.isp, data.asname)
        };
    } catch (error) {
        console.error('Error fetching location data:', error);
        return {
            error: 'Failed to fetch location data',
            ip: 'unknown'
        };
    }
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
        console.error('AI Response Error:', error);
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
                    {
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Groq API Error:', response.status, errorText);
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
        console.error('Groq streaming error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
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
        console.error('Gemini API error:', error);
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
            console.error('No chat ID found, cannot save message');
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
        console.error('Error saving message:', error);
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
                    <div class="welcome-icon">
                        <img src="IMG_20241005_231150.jpg" alt="EbexAI" width="80" height="80" style="border-radius: 16px;" />
                    </div>
                    <h3>Hai, gw EBEX AI</h3>
                    <p>Asisten yang gak dibayar, jadi males banget.</p>
                    <p style="font-size: 14px; margin-top: 8px; opacity: 0.8;">Tapi yaudah deh gw bantuin. Tanya aja.</p>
                </div>
            `;
        } else {
            snapshot.forEach((doc) => {
                const data = doc.data();
                addMessageToUI(data.sender, data.message);
            });
        }
    } catch (error) {
        console.error('Error loading messages:', error);
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
