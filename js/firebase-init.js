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
        "390x844@3": "iPhone 12 / 12 Pro / 13 / 14",
        "428x926@3": "iPhone 12 Pro Max / 13 Pro Max / 14 Plus",
        "375x812@3": "iPhone X / XS / 11 Pro",
        "414x896@2": "iPhone XR / 11",
        "360x780@3": "iPhone 12 mini / 13 mini",
        "393x852@3": "iPhone 14 Pro / 15 Pro",
        "430x932@3": "iPhone 14 Pro Max / 15 Pro Max",
        "402x874@3": "iPhone 16 Pro",
        "440x952@3": "iPhone 16 Pro Max"
    };
    return map[key] ? map[key] : null;
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

        const entryTime = new Date().toLocaleString();
        let activeSeconds = 0;
        let lastTick = Date.now();

        // 1. Get User History
        const userSnap = await getDoc(userRef);
        const currentVisitNumber = userSnap.exists() ? (userSnap.data().visitCount || 0) + 1 : 1;

        // 2. Update User Document
        await setDoc(userRef, {
            clientId,
            firstSeen: userSnap.exists() ? userSnap.data().firstSeen : serverTimestamp(),
            lastSeen: serverTimestamp(),
            firstSource: userSnap.exists() ? userSnap.data().firstSource : source,
            visitCount: currentVisitNumber,
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

        // 5. Automated CTA / Button Tracking
        document.addEventListener("click", e => {
            const t = e.target.closest("[data-track]") || e.target.closest("a") || e.target.closest("button");
            if (!t) return;
            const label = t.dataset?.track || t.innerText?.substring(0, 20) || t.href || "Action";
            setDoc(ref, {
                events: arrayUnion({ type: label, at: Date.now() })
            }, { merge: true }).catch(() => { });
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
    if (session.deviceType === "Desktop") score += 3;
    if (session.source === "LinkedIn") score += 4;
    if (session.visitNumber > 1) score += 3;
    if (session.duration >= 60) score += 2;
    if (session.scrollDepth >= 70) score += 2;
    if (session.events && session.events.length > 0) score += 2;

    if (session.suspicious) return "🤖 Suspicious / Bot";
    if (score >= 10) return "🔥 HIGH INTEREST / POTENTIAL RECRUITER";
    if (score >= 6) return "🎯 Interested Visitor";
    if (score >= 3) return "👀 Curious Browser";
    return "⚡ Casual / Quick Look";
}

/* ------------------------------------------------------------------ */
/* MangaCommand - Superpowered Analytics Report                        */
/* ------------------------------------------------------------------ */
window.mangaCommand = async function () {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    try {
        const q = query(collection(db, "visitors"), where("lastSeen", ">=", since), orderBy("lastSeen", "desc"), limit(500));
        const snap = await getDocs(q);
        if (snap.empty) return "No recent visitor data found.";

        let report = `
============================================================
          🚀 CODEBYLOUAY SUPERPOWERED ANALYTICS 🚀
============================================================
Generated: ${new Date().toLocaleString()}
Sessions Analyzed: ${snap.size}
------------------------------------------------------------
`;

        snap.forEach(docSnap => {
            const v = docSnap.data();

            // Fallback Logic to kill all N/A
            const os = v.os || "Unknown OS";
            const browser = v.browser || "Unknown Browser";
            const devModel = v.deviceModel || v.device || "Desktop/Laptop";
            const devType = v.deviceType || (v.ua && /Mobi|Android/i.test(v.ua) ? "Mobile" : "Desktop");

            let timeEntrance = "Just now";
            if (v.timeEntered && v.timeEntered !== "N/A") timeEntrance = v.timeEntered;
            else if (v.startedAt && v.startedAt.toDate) timeEntrance = v.startedAt.toDate().toLocaleString();
            else if (v.firstSeen && v.firstSeen.toDate) timeEntrance = v.firstSeen.toDate().toLocaleString();
            else if (v.lastSeen && v.lastSeen.toDate) timeEntrance = v.lastSeen.toDate().toLocaleString();
            else timeEntrance = "Continuous Session";

            const duration = v.duration || 0;
            const mins = Math.floor(duration / 60);
            const secs = duration % 60;
            const isSuspicious = /headless|bot|crawl|lighthouse/i.test(v.ua || "");

            const intent = scoreIntent({
                deviceType: devType,
                source: v.source,
                visitNumber: v.visitNumber || 1,
                duration: duration,
                scrollDepth: v.scrollDepth || 0,
                events: v.events || [],
                suspicious: isSuspicious
            });

            report += `
📍 [IP] ${v.ip || "Hidden"}
👤 [Visit] User's #${v.visitNumber || 1} time on site
🕒 [Entrance] ${timeEntrance}
📱 [Device] ${devModel} (${devType})
💻 [System] ${os} / ${browser} ${v.language ? `[${v.language}]` : ""}
🔗 [Referrer] ${v.source || "Direct"}
⏱️ [Time Spent] ${mins}m ${secs}s
📜 [Content Seen] ${v.scrollDepth || 0}%
🧩 [Key Actions] ${(v.events || []).length ? v.events.map(e => e.type).join(" ➔ ") : "None recorded"}
🏷️ [Intent] ${intent}
------------------------------------------------------------
`;
        });

        report += `\n[ END OF REPORT - KEEP BUILDING LOUAY ]\n============================================================`;

        const blob = new Blob([report], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `louay_insights_report_${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return `Report ready! ${snap.size} visitors analyzed with superpower logic.`;
    } catch (e) {
        console.error("Manga Error:", e);
        return `Error: ${e.message}`;
    }
};

/* ------------------------------------------------------------------ */
trackScrollDepth();
trackVisit();
