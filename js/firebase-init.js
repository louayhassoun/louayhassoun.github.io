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
/* Scroll Depth                                                        */
/* ------------------------------------------------------------------ */
let maxScrollDepth = 0;

function trackScrollDepth() {
    window.addEventListener("scroll", () => {
        const scrolled =
            (window.scrollY + window.innerHeight) /
            document.documentElement.scrollHeight;

        maxScrollDepth = Math.max(maxScrollDepth, scrolled);
    });
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

        /* ------------------ user doc ------------------ */
        const userSnap = await getDoc(userRef);

        await setDoc(
            userRef,
            {
                clientId,
                firstSeen: userSnap.exists() ? userSnap.data().firstSeen : serverTimestamp(),
                lastSeen: serverTimestamp(),
                firstSource: userSnap.exists() ? userSnap.data().firstSource : source,
                deviceSummary: {
                    os: device.os,
                    browser: device.browser,
                    deviceType: device.deviceType,
                    deviceModel: device.deviceModel
                }
            },
            { merge: true }
        );

        /* ------------------ session doc ------------------ */
        await setDoc(ref, {
            sessionId,
            clientId,
            source,
            ...device,
            startedAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            timeEntered: entryTime,
            duration: 0,
            scrollDepth: 0,
            events: [],
            hits: 1
        });

        /* ------------------ duration ticker ------------------ */
        const ticker = setInterval(() => {
            const now = Date.now();
            if (document.visibilityState === "visible") {
                activeSeconds += (now - lastTick) / 1000;
            }
            lastTick = now;
        }, 1000);

        /* cheap heartbeat to survive mobile webviews */
        const heartbeat = setInterval(() => {
            const duration = Math.round(activeSeconds);
            const scrollDepth = Math.round(maxScrollDepth * 100);

            setDoc(ref, {
                lastSeen: serverTimestamp(),
                duration,
                scrollDepth
            }, { merge: true }).catch(() => { });
        }, 20000);

        const finalize = async () => {
            clearInterval(ticker);
            clearInterval(heartbeat);

            const duration = Math.round(activeSeconds);
            const scrollDepth = Math.round(maxScrollDepth * 100);

            await setDoc(ref, {
                lastSeen: serverTimestamp(),
                duration,
                scrollDepth
            }, { merge: true });

            await setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        };

        window.addEventListener("beforeunload", finalize);
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") finalize().catch(() => { });
        });

        /* ------------------ CTA / Event Tracking ------------------ */
        document.addEventListener("click", e => {
            const t = e.target.closest("[data-track]");
            if (!t) return;

            setDoc(
                ref,
                {
                    events: arrayUnion({
                        type: t.dataset.track,
                        at: Date.now()
                    })
                },
                { merge: true }
            ).catch(() => { });
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
    if (session.hits >= 2) score += 1;
    if (session.duration >= 60) score += 2;
    if (session.scrollDepth >= 60) score += 2;
    if (session.events && session.events.length) score += 2;

    if (session.suspicious) return "🤖 Suspicious / Bot";
    if (score >= 8) return "🎯 LIKELY RECRUITER / SERIOUS REVIEW";
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
        where("lastSeen", ">=", since),
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
        const duration = v.duration || 0;
        const isSuspicious = /headless|bot|crawl|lighthouse/i.test(v.ua || "");

        const intent = scoreIntent({
            deviceType: v.deviceType,
            source: v.source,
            hits: v.hits || 1,
            duration,
            scrollDepth: v.scrollDepth || 0,
            events: v.events || [],
            suspicious: isSuspicious
        });

        report += `
🆔 Session: ${v.sessionId || docSnap.id}
👤 Client: ${v.clientId || "legacy"}
🕒 Entered: ${v.timeEntered || "N/A"}
📱 Device: ${v.deviceModel || "Unknown"} (${v.deviceType || "N/A"})
💻 System: ${v.os || "N/A"} / ${v.browser || "N/A"}
🔗 Source: ${v.source || "Direct"}
⏱️ Time Spent: ${duration}s
📜 Scroll: ${v.scrollDepth || 0}%
🧩 Events: ${(v.events || []).map(e => e.type).join(", ") || "None"}
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

/* ------------------------------------------------------------------ */
trackScrollDepth();
trackVisit();
