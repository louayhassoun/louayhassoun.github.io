import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDocs,
    getDoc,
    query,
    orderBy,
    where,
    limit,
    serverTimestamp,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import firebaseConfig from "./firebase-config.js";

/* ------------------------------------------------------------------ */
/* Firebase Init                                                       */
/* ------------------------------------------------------------------ */
const app = initializeApp(firebaseConfig);
getAnalytics(app);
const db = getFirestore(app);

/* ------------------------------------------------------------------ */
/* Client / Session IDs                                                */
/* ------------------------------------------------------------------ */
function getClientId() {
    let id = localStorage.getItem("portfolio_cid");
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem("portfolio_cid", id);
    }
    return id;
}

function createSessionId(clientId) {
    return `${clientId}_${Date.now()}`;
}

/* ------------------------------------------------------------------ */
/* iPhone Model Heuristic                                              */
/* ------------------------------------------------------------------ */
function inferIphoneModel() {
    const w = Math.max(screen.width, screen.height);
    const h = Math.min(screen.width, screen.height);
    const dpr = window.devicePixelRatio;
    const key = `${w}x${h}@${dpr}`;
    const map = {
        "390x844@3": "iPhone 12/13/14",
        "428x926@3": "iPhone 12/13/14 Plus/Max",
        "375x812@3": "iPhone X/XS/11 Pro",
        "414x896@2": "iPhone XR/11",
        "360x780@3": "iPhone 12/13 mini",
        "393x852@3": "iPhone 14/15 Pro",
        "430x932@3": "iPhone 14/15 Pro Max",
        "402x874@3": "iPhone 16 Pro",
        "440x952@3": "iPhone 16 Pro Max"
    };
    return map[key] || null;
}

/* ------------------------------------------------------------------ */
/* Device Detection                                                    */
/* ------------------------------------------------------------------ */
function getDeviceInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown Browser";
    let os = "Unknown OS";
    let deviceType = "Desktop";
    let deviceModel = "Desktop/Laptop";

    if (/Instagram/i.test(ua)) browser = "Instagram";
    else if (/FBAN|FBAV/i.test(ua)) browser = "Facebook";
    else if (/LinkedInApp/i.test(ua)) browser = "LinkedIn";
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
        const url = new URL(referrer);
        if (url.hostname.includes("google")) return "Google Search";
        return url.hostname;
    } catch {
        return "Direct";
    }
}

/* ------------------------------------------------------------------ */
/* Scroll Depth                                                        */
/* ------------------------------------------------------------------ */
let maxScrollDepth = 0;
function trackScrollDepth() {
    window.addEventListener("scroll", () => {
        const scrolled = (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight;
        maxScrollDepth = Math.max(maxScrollDepth, scrolled);
    }, { passive: true });
}

/* ------------------------------------------------------------------ */
/* Track Visit / Session                                               */
/* ------------------------------------------------------------------ */
async function trackVisit() {
    try {
        const device = getDeviceInfo();
        const source = getSource(device.ua, document.referrer);
        const clientId = getClientId();
        const sessionId = createSessionId(clientId);

        const ref = doc(db, "visitors", sessionId);
        const userRef = doc(db, "users", clientId);

        // Fetch Real IP
        let ip = "Unknown";
        try {
            const res = await fetch("https://api.ipify.org?format=json");
            const data = await res.json();
            ip = data.ip;
        } catch (ipErr) {
            console.warn("IP reveal failed, using fallback.");
        }

        const entryTime = new Date().toLocaleString();
        let activeSeconds = 0;
        let lastTick = Date.now();

        // 1. Get User History
        let userSnap;
        try {
            userSnap = await getDoc(userRef);
        } catch (permErr) {
            console.error("Firestore Permission Error: Please check security rules.", permErr);
            return;
        }

        const currentVisitNumber = userSnap.exists() ? (userSnap.data().visitCount || 0) + 1 : 1;

        // 2. Update User Document
        await setDoc(userRef, {
            clientId,
            firstSeen: userSnap.exists() ? userSnap.data().firstSeen : serverTimestamp(),
            lastSeen: serverTimestamp(),
            firstSource: userSnap.exists() ? userSnap.data().firstSource : source,
            visitCount: currentVisitNumber,
            lastIp: ip,
            deviceSummary: {
                os: device.os,
                browser: device.browser,
                deviceType: device.deviceType,
                deviceModel: device.deviceModel
            }
        }, { merge: true });

        // 3. Create Session Document
        await setDoc(ref, {
            sessionId,
            clientId,
            ip,
            source,
            ...device,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            startedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            timeEntered: entryTime,
            visitNumber: currentVisitNumber,
            duration: 0,
            scrollDepth: 0,
            events: [],
            hits: 1
        });

        // 4. Activity Heartbeat
        const ticker = setInterval(() => {
            const now = Date.now();
            if (document.visibilityState === "visible") {
                activeSeconds += (now - lastTick) / 1000;
            }
            lastTick = now;
        }, 1000);

        const heartbeat = setInterval(() => {
            const duration = Math.round(activeSeconds);
            const scrollDepth = Math.round(maxScrollDepth * 100);
            setDoc(ref, { lastSeen: serverTimestamp(), duration, scrollDepth }, { merge: true }).catch(() => { });
        }, 15000);

        const finalize = async () => {
            clearInterval(ticker);
            clearInterval(heartbeat);
            const duration = Math.round(activeSeconds);
            const scrollDepth = Math.round(maxScrollDepth * 100);
            await setDoc(ref, { lastSeen: serverTimestamp(), duration, scrollDepth }, { merge: true });
            await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        };

        window.addEventListener("beforeunload", finalize);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") finalize().catch(() => { });
        });

        // 5. Automated Interaction Tracking
        document.addEventListener("click", e => {
            const t = e.target.closest("[data-track]") || e.target.closest("a") || e.target.closest("button");
            if (!t) return;
            const label = t.dataset?.track || t.innerText?.trim().substring(0, 30) || t.href || "Action";
            setDoc(ref, {
                events: arrayUnion({ type: label, at: Date.now() })
            }, { merge: true }).catch(() => { });
        });

    } catch (e) {
        if (e.message.includes("permissions")) {
            console.error("Superpower Tracking: Missing Firestore permissions! Update your rules.");
        } else {
            console.error("Tracking error:", e);
        }
    }
}

/* ------------------------------------------------------------------ */
/* Weighted Intent Scoring (Recruiter Focus)                           */
/* ------------------------------------------------------------------ */
function scoreIntent(session) {
    let weight = 0;

    // Weighted logic (0-100 scale)
    if (session.source === "LinkedIn") weight += 40;  // Direct professional link
    if (session.deviceType === "Desktop") weight += 20; // Recruiter work mode
    if (session.visitNumber > 1) weight += 15;        // Returning interest
    if (session.duration >= 60) weight += 10;        // Deep dive
    if (session.scrollDepth >= 70) weight += 10;     // Content consumption
    if (session.events && session.events.length > 0) weight += 5; // Interactions

    const isSuspicious = /headless|bot|crawl|lighthouse/i.test(session.ua || "");
    if (isSuspicious) return "🤖 Bot / Crawler";

    if (weight >= 75) return "🔥 TOP RECRUITER / SEVERE INTEREST";
    if (weight >= 50) return "🎯 Serious Visitor";
    if (weight >= 25) return "👀 Curious Lead";
    return "⚡ Casual Browse";
}

/* ------------------------------------------------------------------ */
/* Helper: Download Helper                                            */
/* ------------------------------------------------------------------ */
function downloadFile(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Manga Reports (TXT & CSV)                                           */
/* ------------------------------------------------------------------ */
window.mangaCommand = async function (count = 100) {
    try {
        const q = query(collection(db, "visitors"), orderBy("lastSeen", "desc"), limit(count));
        const snap = await getDocs(q);
        if (snap.empty) return "No data found.";

        let report = `============================================================\n`;
        report += `🚀 CODEBYLOUAY SUPER INSIGHTS (Latest ${snap.size})\n`;
        report += `============================================================\n`;

        snap.forEach(docSnap => {
            const v = docSnap.data();
            const intent = scoreIntent(v);
            const durationText = `${Math.floor((v.duration || 0) / 60)}m ${(v.duration || 0) % 60}s`;

            report += `📍 [IP] ${v.ip || "Hidden"}\n`;
            report += `👤 [Visit] #${v.visitNumber || 1} journey by ${v.clientId ? v.clientId.slice(0, 8) : "LEGACY"}\n`;
            report += `🕒 [Entrance] ${v.timeEntered || "Unknown"}\n`;
            report += `📱 [Device] ${v.deviceModel || "Desktop"} (${v.os || "OS"})\n`;
            report += `🔗 [Source] ${v.source || "Direct"}\n`;
            report += `⏱️ [Time] ${durationText} | [Scroll] ${v.scrollDepth || 0}%\n`;
            report += `🧩 [Path] ${(v.events || []).map(e => e.type).join(" -> ") || "None"}\n`;
            report += `🏷️ [Intent] ${intent}\n`;
            report += `------------------------------------------------------------\n`;
        });

        downloadFile(report, `louay_report_${Date.now()}.txt`, "text/plain");
        return "TXT Report exported.";
    } catch (e) {
        return `Report failed: ${e.message}`;
    }
};

window.mangaCSV = async function (count = 100) {
    try {
        const q = query(collection(db, "visitors"), orderBy("lastSeen", "desc"), limit(count));
        const snap = await getDocs(q);
        if (snap.empty) return "No data.";

        const headers = ["IP", "VisitNum", "Entrance", "Device", "OS", "Source", "Duration(s)", "Scroll(%)", "Intent"];
        const rows = [headers.join(",")];

        snap.forEach(docSnap => {
            const v = docSnap.data();
            const row = [
                v.ip || "Hidden",
                v.visitNumber || 1,
                v.timeEntered ? `"${v.timeEntered}"` : "Unknown",
                `"${v.deviceModel || "Desktop"}"`,
                v.os || "OS",
                v.source || "Direct",
                v.duration || 0,
                v.scrollDepth || 0,
                `"${scoreIntent(v)}"`
            ];
            rows.push(row.join(","));
        });

        downloadFile(rows.join("\n"), `louay_metrics_${Date.now()}.csv`, "text/csv");
        return "CSV Exported successfully.";
    } catch (e) {
        return `CSV failed: ${e.message}`;
    }
};

/* ------------------------------------------------------------------ */
trackScrollDepth();
trackVisit();
