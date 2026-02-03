import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Helper to get OS, Browser, and Phone Model
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let deviceModel = "Desktop/Laptop";

    // Browser Detection
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("SamsungBrowser") > -1) browser = "Samsung Browser";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("MSIE") > -1 || !!document.documentMode) browser = "IE";

    // OS Detection
    if (ua.indexOf("Win") != -1) os = "Windows";
    else if (ua.indexOf("Mac") != -1) os = "MacOS";
    else if (ua.indexOf("Linux") != -1) os = "Linux";
    else if (ua.indexOf("Android") != -1) os = "Android";
    else if (ua.indexOf("iOS") != -1 || ua.indexOf("iPhone") != -1) os = "iOS";

    // Detailed Mobile Device Detection
    if (/android/i.test(ua)) {
        const match = ua.match(/Android.*;\s*([^;]+)\s*Build/);
        if (match) deviceModel = match[1].trim();
        else {
            const smMatch = ua.match(/SM-[A-Z0-9]+/);
            if (smMatch) deviceModel = "Samsung " + smMatch[0];
            else deviceModel = "Android Device";
        }
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
        if (/iPad/.test(ua)) deviceModel = "iPad";
        else if (/iPod/.test(ua)) deviceModel = "iPod";
        else deviceModel = "iPhone";

        const screenStr = `${window.screen.width}x${window.screen.height}`;
        const iphoneMap = {
            "430x932": "iPhone 14/15/16 Pro Max",
            "393x852": "iPhone 14/15/16 Pro",
            "428x926": "iPhone 13/14 Pro Max",
            "390x844": "iPhone 13/14 Pro",
            "375x812": "iPhone X/XS/11 Pro",
            "414x896": "iPhone XR/XS Max/11 Pro Max",
            "414x736": "iPhone 6s/7/8 Plus",
            "375x667": "iPhone 6/7/8/SE"
        };
        if (iphoneMap[screenStr]) deviceModel += ` (${iphoneMap[screenStr]})`;
    }

    return { browser, os, deviceModel, ua };
}

// Track visit
async function trackVisit() {
    try {
        const { browser, os, deviceModel, ua } = getDeviceInfo();

        // Get IP
        let ip = "Unknown IP";
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ip = data.ip;
        } catch (e) {
            console.warn("Could not fetch IP:", e);
        }

        // Visit Count
        let visitCount = localStorage.getItem('visitCount') || 0;
        visitCount = parseInt(visitCount) + 1;
        localStorage.setItem('visitCount', visitCount);

        const visitData = {
            time: new Date().toLocaleString(),
            clientTimestamp: new Date().toISOString(),
            timestamp: serverTimestamp(),
            os: os,
            browser: browser,
            device: deviceModel,
            ip: ip,
            visitNumber: visitCount,
            userAgent: ua,
            platform: navigator.platform
        };

        await addDoc(collection(db, "visitors"), visitData);
    } catch (error) {
        console.error("Error tracking visit:", error);
    }
}

// Global function for "manga" command
window.mangaCommand = async function () {
    try {
        console.log("Fetching all-time visitor data...");
        const q = query(collection(db, "visitors"), orderBy("clientTimestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const data = [];
        querySnapshot.forEach((doc) => {
            const docData = doc.data();
            if (docData.timestamp && typeof docData.timestamp.toDate === 'function') {
                docData.timestamp = docData.timestamp.toDate().toISOString();
            }
            data.push(docData);
        });

        if (data.length === 0) {
            return "No visitor data found yet.";
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors_all_time_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return `Found ${data.length} total records. Download started.`;
    } catch (error) {
        console.error("Error fetching data:", error);
        return "Error: Could not retrieve data.";
    }
};

trackVisit();
