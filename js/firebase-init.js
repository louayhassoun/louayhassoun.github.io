import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Helper to get OS and Browser
function getDeviceButtons() {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";

    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("MSIE") > -1 || !!document.documentMode) browser = "IE";

    if (ua.indexOf("Win") != -1) os = "Windows";
    else if (ua.indexOf("Mac") != -1) os = "MacOS";
    else if (ua.indexOf("Linux") != -1) os = "Linux";
    else if (ua.indexOf("Android") != -1) os = "Android";
    else if (ua.indexOf("iOS") != -1 || ua.indexOf("iPhone") != -1) os = "iOS";

    return { browser, os };
}

// Track visit
async function trackVisit() {
    try {
        const { browser, os } = getDeviceButtons();

        // Get IP if possible
        let ip = "Unknown";
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            ip = data.ip;
        } catch (e) {
            console.warn("Could not fetch IP:", e);
        }

        // Visit Count (local storage for session/user tracking)
        let visitCount = localStorage.getItem('visitCount') || 0;
        visitCount = parseInt(visitCount) + 1;
        localStorage.setItem('visitCount', visitCount);

        const visitData = {
            time: new Date().toLocaleString(),
            timestamp: serverTimestamp(),
            os: os,
            browser: browser,
            ip: ip,
            visitNumber: visitCount,
            userAgent: navigator.userAgent
        };

        await addDoc(collection(db, "visitors"), visitData);
    } catch (error) {
        console.error("Error tracking visit:", error);
    }
}

// Global function for "manga" command
window.mangaCommand = async function () {
    try {
        console.log("Fetching visitor data...");
        const q = query(collection(db, "visitors"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        const data = [];
        querySnapshot.forEach((doc) => {
            data.push(doc.data());
        });

        if (data.length === 0) {
            return "No visitor data found yet.";
        }

        // Create download
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visitors_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return `Found ${data.length} records. Download started.`;
    } catch (error) {
        console.error("Error fetching data:", error);
        return "Error: Could not retrieve data. Check console for details.";
    }
};

// Execute tracking on load
trackVisit();
