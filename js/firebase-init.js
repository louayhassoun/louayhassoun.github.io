import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp,
    arrayUnion,
    increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

/* ------------------------------------------------------------------ */
/* Firebase Init                                                       */
/* ------------------------------------------------------------------ */
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

/* ------------------------------------------------------------------ */
/* iPhone Model Heuristic                                              */
/* ------------------------------------------------------------------ */
function inferIphoneModel() {
    const w = Math.max(screen.width, screen.height);
    const h = Math.min(screen.width, screen.height);
    const dpr = window.devicePixelRatio;
    const key = `${w}x${h}@${dpr}`;
    const map = {
        "390x844@3": "iPhone 12 / 12 Pro / 13 / 14",
        "428x926@3": "iPhone 12 Pro Max / 13 Pro Max / 14 Plus",
        "375x812@3": "iPhone X / XS / 11 Pro",
        "414x896@2": "iPhone XR / 11",
        "360x780@3": "iPhone 12 mini / 13 mini",
        "393x852@3": "iPhone 14 Pro / 15 Pro",
        "430x932@3": "iPhone 14 Pro Max / 15 Pro Max"
    };
    return map[key] ? `Likely ${map[key]}` : null;
}

/* ------------------------------------------------------------------ */
/* Device Detection                                                    */
/* ------------------------------------------------------------------ */
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let os = "Unknown";
    let deviceType = "Desktop";
    let deviceModel = "Desktop/Laptop";

    if (/Instagram/i.test(ua)) browser = "Instagram WebView";
    else if (/FBAN|FBAV/i.test(ua)) browser = "Facebook WebView";
    else if (/LinkedInApp/i.test(ua)) browser = "LinkedIn WebView";
    else if (/Edg/i.test(ua)) browser = "Edge";
    else if (/Chrome/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua)) browser = "Safari";
    else if (/Firefox/i.test(ua)) browser = "Firefox";

    if (/iPhone|iPad|iPod/i.test(ua)) {
        os = "iOS";
        deviceType = /iPad/.test(ua) ? "Tablet" : "Mobile";
        deviceModel = /iPad/.test(ua) ? "iPad" : "iPhone";
        const inferred = inferIphoneModel();
        if (inferred) deviceModel += ` (${inferred})`;
    } else if (/Android/i.test(ua)) {
        os = "Android";
        deviceType = "Mobile";
        const match = ua.match(/Android.*;\s*([^;]+)\s*Build/);
        deviceModel = match ? match[1] : "Android Device";
    } else if (/Macintosh/i.test(ua)) os = "MacOS";
    else if (/Windows/i.test(ua)) os = "Windows";
    else if (/Linux/i.test(ua)) os = "Linux";

    return { browser, os, deviceType, deviceModel, ua };
}

/* ------------------------------------------------------------------ */
/* Source Detection                                                    */
/* ------------------------------------------------------------------ */
function getSource(ua, referrer) {
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV/i.test(ua)) return "Facebook";
    if (/LinkedInApp/i.test(ua) || (referrer && referrer.includes("linkedin.com")))
        return "LinkedIn";
    if (!referrer) return "Direct";
    try {
        return new URL(referrer).hostname;
    } catch {
        return "Unknown";
    }
}

/* ------------------------------------------------------------------ */
/* Session ID Generator                                                 */
/* ------------------------------------------------------------------ */
function generateSessionId({ ip, os, browser, deviceModel, source }) {
    return btoa(`${ip}|${os}|${browser}|${deviceModel}|${source}`).replace(/=/g, "");
}

/* ------------------------------------------------------------------ */
/* Track Visit + Heartbeat                                             */
/* ------------------------------------------------------------------ */
async function trackVisit() {
    try {
        const device = getDeviceInfo();
        const source = getSource(device.ua, document.referrer);

        let ip = "Unknown";
        try {
            const res = await fetch("https://api.ipify.org?format=json");
            ip = (await res.json()).ip;
        } catch { }

        const sessionId = generateSessionId({
            ip,
            os: device.os,
            browser: device.browser,
            deviceModel: device.deviceModel,
            source
        });

        const ref = doc(db, "visitors", sessionId);
        let sessionStart = Date.now();
        const entryTime = new Date().toLocaleString();

        // Save data including the sessionId field explicitly
        await setDoc(
            ref,
            {
                sessionId, // Storing ID as field for easier reading
                ip,
                source,
                ...device,
                firstSeen: serverTimestamp(),
                lastSeen: serverTimestamp(),
                timeEntered: entryTime,
                entryHistory: arrayUnion(entryTime),
                hits: increment(1),
                duration: 0 // Initialize to 0 so it's not undefined
            },
            { merge: true }
        );

        const interval = setInterval(() => {
            if (document.visibilityState === "visible") {
                const duration = Math.round((Date.now() - sessionStart) / 1000);
                setDoc(ref, { lastSeen: serverTimestamp(), duration }, { merge: true }).catch(console.error);
            }
        }, 5000);

        const finalizeDuration = () => {
            const duration = Math.round((Date.now() - sessionStart) / 1000);
            setDoc(ref, { lastSeen: serverTimestamp(), duration }, { merge: true }).catch(console.error);
            clearInterval(interval);
        };

        window.addEventListener("beforeunload", finalizeDuration);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") finalizeDuration();
        });
    } catch (e) {
        console.error("Tracking error:", e);
    }
}

/* ------------------------------------------------------------------ */
/* Intent Scoring                                                      */
/* ------------------------------------------------------------------ */
function scoreIntent(session) {
    let score = 0;
    if (session.device && session.device.includes("Desktop")) score += 3;
    if (session.source === "LinkedIn") score += 4;
    if (session.hits >= 3) score += 2;
    if (session.duration >= 60) score += 2;
    if (!/Instagram|Facebook/.test(session.source)) score += 1;

    if (session.suspicious) return "🤖 Suspicious / Bot";
    if (score >= 7) return "🎯 LIKELY RECRUITER / SERIOUS REVIEW";
    if (score >= 4) return "👀 Interested Visitor";
    return "⚡ Casual / Quick Look";
}

/* ------------------------------------------------------------------ */
/* MangaCommand Report Generator                                       */
/* ------------------------------------------------------------------ */
window.mangaCommand = async function () {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const q = query(
        collection(db, "visitors"),
        where("lastSeen", ">=", since), // Query by lastSeen to get active users
        orderBy("lastSeen", "desc"),
        limit(500)
    );

    const snap = await getDocs(q);
    if (snap.empty) return "No recent visitors.";

    let report = `
========================================================
        PORTFOLIO VISITOR INSIGHTS
========================================================
Generated: ${new Date().toLocaleString()}
--------------------------------------------------------
`;

    snap.forEach(docSnap => {
        const v = docSnap.data();

        // Use the saved duration or fallback to 0
        const duration = v.duration || 0;

        // Check for suspicious UA
        const isSuspicious = /headless|bot|crawl|lighthouse/i.test(v.ua || "");

        const intent = scoreIntent({
            device: v.deviceModel,
            source: v.source,
            hits: v.hits,
            duration: duration,
            suspicious: isSuspicious
        });

        report += `
📍 IP: ${v.ip || "Unknown"}
🕒 Entered: ${v.timeEntered || (v.firstSeen ? v.firstSeen.toDate().toLocaleString() : "N/A")}
📱 Device: ${v.deviceModel || "Unknown"} (${v.deviceType || "N/A"})
💻 System: ${v.os || "N/A"} / ${v.browser || "N/A"}
🔗 Source: ${v.source || "Direct"}
🔢 Hits: ${v.hits || 1}
⏱️ Time Spent: ${duration}s
🏷️ Intent: ${intent}
--------------------------------------------------------
`;
    });

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `portfolio_insights_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    return "Report generated and downloading...";
};

trackVisit();