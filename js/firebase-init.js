import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

/* ------------------------------------------------------------------ */
/* Firebase Init                                                       */
/* ------------------------------------------------------------------ */
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

/* ------------------------------------------------------------------ */
/* iPhone Model Heuristic (BEST-EFFORT)                                */
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

    if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/Macintosh/i.test(ua)) os = "MacOS";
    else if (/Windows/i.test(ua)) os = "Windows";
    else if (/Linux/i.test(ua)) os = "Linux";

    if (/Android/i.test(ua)) {
        deviceType = "Mobile";
        const match = ua.match(/Android.*;\s*([^;]+)\s*Build/);
        deviceModel = match ? match[1] : "Android Device";
    }

    if (/iPhone|iPad|iPod/i.test(ua)) {
        deviceType = /iPad/.test(ua) ? "Tablet" : "Mobile";
        deviceModel = /iPad/.test(ua) ? "iPad" : "iPhone";
        const inferred = inferIphoneModel();
        if (inferred) deviceModel += ` (${inferred})`;
    }

    return { browser, os, deviceType, deviceModel, ua };
}

/* ------------------------------------------------------------------ */
/* Source Detection                                                    */
/* ------------------------------------------------------------------ */
function getSource(ua, referrer) {
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV/i.test(ua)) return "Facebook";
    if (/LinkedInApp/i.test(ua) || referrer.includes("linkedin.com"))
        return "LinkedIn";
    if (!referrer) return "Direct";

    try {
        return new URL(referrer).hostname;
    } catch {
        return "Unknown";
    }
}

/* ------------------------------------------------------------------ */
/* Session ID                                                         */
/* ------------------------------------------------------------------ */
function generateSessionId({ ip, os, browser, deviceModel, source }) {
    return btoa(`${ip}|${os}|${browser}|${deviceModel}|${source}`)
        .replace(/=/g, "");
}

/* ------------------------------------------------------------------ */
/* Track Visit                                                        */
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

        await addDoc(collection(db, "visitors"), {
            sessionId,
            ip,
            source,
            ...device,
            createdAt: serverTimestamp()
        });
    } catch (e) {
        console.error("Tracking error:", e);
    }
}

/* ------------------------------------------------------------------ */
/* INTENT SCORING                                                     */
/* ------------------------------------------------------------------ */
function scoreIntent(session) {
    let score = 0;

    if (session.device.includes("Desktop")) score += 3;
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
/* mangaCommand Report                                                */
/* ------------------------------------------------------------------ */
window.mangaCommand = async function () {
    const since = new Date();
    since.setDate(since.getDate() - 7);

    const q = query(
        collection(db, "visitors"),
        where("createdAt", ">=", since),
        orderBy("createdAt", "asc"),
        limit(500)
    );

    const snap = await getDocs(q);
    if (snap.empty) return "No recent visitors.";

    const sessions = {};

    snap.forEach(doc => {
        const v = doc.data();
        if (!sessions[v.sessionId]) {
            sessions[v.sessionId] = {
                ip: v.ip,
                device: `${v.deviceModel} (${v.deviceType})`,
                system: `${v.os} / ${v.browser}`,
                source: v.source,
                first: v.createdAt?.toDate(),
                last: v.createdAt?.toDate(),
                hits: 1,
                suspicious: /headless|bot|crawl/i.test(v.ua)
            };
        } else {
            sessions[v.sessionId].hits++;
            sessions[v.sessionId].last = v.createdAt?.toDate();
        }
    });

    let report = `
========================================================
        PORTFOLIO VISITOR INSIGHTS
========================================================
Generated: ${new Date().toLocaleString()}
--------------------------------------------------------
`;

    Object.values(sessions).forEach(s => {
        s.duration =
            s.first && s.last ? Math.round((s.last - s.first) / 1000) : 0;
        s.intent = scoreIntent(s);

        report += `
📍 IP: ${s.ip}
📱 Device: ${s.device}
💻 System: ${s.system}
🔗 Source: ${s.source}
🔢 Hits: ${s.hits}
⏱️ Time Spent: ${s.duration}s
🏷️ Intent: ${s.intent}
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

    return "Report generated.";
};

/* ------------------------------------------------------------------ */
/* Auto Track                                                         */
/* ------------------------------------------------------------------ */
trackVisit();
