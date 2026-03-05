import { ImGui, ImGuiImplWeb, ImVec2, ImVec4 } from "https://esm.sh/@mori2003/jsimgui@0.13.0";

const TARGET_STORAGE_KEY = "JJS_SKILLBUILDER_DATA";
const EDITOR_STORAGE_KEY = "JJS_SKILLBUILDER_EDITOR_V1";
const BACKEND_URL_STORAGE_KEY = "JJS_BACKEND_URL";
const EXPORT_VAR_NAME = "window.SKILLBUILDER_DATA";
const MAX_TEXT = 32768;
const MAX_LONG_TEXT = 131072;
const MAX_PATH_TEXT = 8192;

const params = new URLSearchParams(window.location.search);
const normalizeApiBase = (raw) => {
    const value = String(raw || "").trim();
    if (!value) {
        return "";
    }

    let candidate = value;

    if (/^\d{2,5}$/.test(candidate)) {
        candidate = `http://localhost:${candidate}`;
    } else if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(candidate)) {
        if (candidate.startsWith("//")) {
            candidate = `${window.location.protocol}${candidate}`;
        } else if (candidate.startsWith("/")) {
            candidate = `${window.location.origin}${candidate}`;
        } else {
            candidate = `http://${candidate}`;
        }
    }

    try {
        const url = new URL(candidate);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            return "";
        }
        return `${url.origin}${url.pathname}`.replace(/\/+$/, "");
    } catch (_error) {
        return "";
    }
};

const apiParam = normalizeApiBase(params.get("api"));
const apiStored = normalizeApiBase(localStorage.getItem(BACKEND_URL_STORAGE_KEY));
const API_BASE = apiParam || apiStored || "http://localhost:3000";
localStorage.setItem(BACKEND_URL_STORAGE_KEY, API_BASE);

const DEFAULT_ICONS = [
    { slug: "wait", title: "Wait", mini: "minskillbuilderimg/minwait.png", full: "skillbulderimg/wait.png" },
    { slug: "skill", title: "Skill", mini: "minskillbuilderimg/minskill.png", full: "skillbulderimg/skill.png" },
    { slug: "special", title: "Special", mini: "minskillbuilderimg/minspecial.png", full: "skillbulderimg/special.png" },
    { slug: "animation", title: "Animation", mini: "minskillbuilderimg/minanimation.png", full: "skillbulderimg/animation.png" },
    { slug: "sound", title: "Sound", mini: "minskillbuilderimg/minsound.png", full: "skillbulderimg/sound.png" },
    { slug: "velocity", title: "Velocity", mini: "minskillbuilderimg/minvelocity.png", full: "skillbulderimg/velocity.png" },
    { slug: "connect", title: "Connect", mini: "minskillbuilderimg/minconnect.png", full: "skillbulderimg/connect.png" },
    { slug: "hitbox", title: "Hitbox", mini: "minskillbuilderimg/minhitbox.png", full: "skillbulderimg/hitbox.png" },
    { slug: "branch", title: "Branch", mini: "minskillbuilderimg/minbranch.png", full: "skillbulderimg/branch.png" },
    { slug: "visual", title: "Visual", mini: "minskillbuilderimg/minvisual.png", full: "skillbulderimg/visual.png" },
    { slug: "grab", title: "Grab", mini: "minskillbuilderimg/mingrab.png", full: "skillbulderimg/grab.png" },
    { slug: "projectile", title: "Projectile", mini: "minskillbuilderimg/minprojectile.png", full: "skillbulderimg/projectile.png" },
    { slug: "counter", title: "Counter", mini: "minskillbuilderimg/mincounter.png", full: "skillbulderimg/counter.png" },
    { slug: "tag", title: "Tag", mini: "minskillbuilderimg/mintag.png", full: "skillbulderimg/tag.png" },
    { slug: "state", title: "State", mini: "minskillbuilderimg/minstate.png", full: "skillbulderimg/state.png" },
    { slug: "add-awakening", title: "Add Awakening", mini: "minskillbuilderimg/minadd-awakeing.png", full: "skillbulderimg/add awakening.png" },
    { slug: "add-health", title: "Add Health", mini: "minskillbuilderimg/minadd-health.png", full: "skillbulderimg/add health.png" },
    { slug: "add-evasion", title: "Add Evasion", mini: "minskillbuilderimg/minadd-evasion.png", full: "skillbulderimg/add evasion.png" },
    { slug: "hit-cancel", title: "Hit Cancel", mini: "minskillbuilderimg/minhit-cancel.png", full: "skillbulderimg/hit cancel.png" },
    { slug: "loop", title: "Loop", mini: "minskillbuilderimg/minloop.png", full: "skillbulderimg/loop.png" }
];

const canvasElement = document.getElementById("imgui-canvas");
const imageFileInput = document.getElementById("imageFileInput");
const dataFileInput = document.getElementById("dataFileInput");
if (!(canvasElement instanceof HTMLCanvasElement)) throw new Error("Canvas #imgui-canvas not found.");
if (!(imageFileInput instanceof HTMLInputElement)) throw new Error("Input #imageFileInput not found.");
if (!(dataFileInput instanceof HTMLInputElement)) throw new Error("Input #dataFileInput not found.");

const state = {
    data: null,
    selectedSlug: "",
    selectedElementId: "",
    drag: { elementId: "", offsetX: 0, offsetY: 0 },
    ui: {
        iconFilter: "",
        slugBind: "",
        slugInput: "",
        fitCanvas: true,
        zoom: 1,
        placeMode: null,
        autoSaveDraft: true,
        autoSaveBackend: false,
        showExport: false,
        status: "Ready.",
        statusError: false
    },
    textures: new Map(),
    activeFilePicker: null
};

const clone = (v) => JSON.parse(JSON.stringify(v));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function defaultPageFor(title) {
    return {
        title,
        subtitle: `Content page for ${title}.`,
        sections: [
            { heading: "Overview", body: `Main notes for ${title}.` },
            { heading: "Setup", body: `Configuration details and values for ${title}.` },
            { heading: "Tips", body: `Extra usage tips and practical combos for ${title}.` }
        ],
        canvas: { width: 980, height: 420, background: "#1f1f1f" },
        elements: []
    };
}

function makeDefaultData() {
    const icons = clone(DEFAULT_ICONS);
    const pages = {};
    icons.forEach((icon) => { pages[icon.slug] = defaultPageFor(icon.title); });
    return { icons, pages };
}

function humanizeSlug(slug) {
    const text = String(slug || "").trim();
    if (!text) return "Untitled";
    return text.split("-").filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

function sanitizeSlug(value) {
    const s = String(value || "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return s || "icon";
}

function uniqueSlug(base, used) {
    const slug = sanitizeSlug(base);
    if (!used.has(slug)) return slug;
    let i = 2;
    while (used.has(`${slug}-${i}`)) i += 1;
    return `${slug}-${i}`;
}

function normalizeElement(el, i) {
    const type = el?.type === "image" ? "image" : "text";
    return {
        id: String(el?.id || `el-${i + 1}`),
        type,
        x: Number(el?.x ?? 20),
        y: Number(el?.y ?? 20),
        w: Math.max(24, Number(el?.w ?? (type === "image" ? 240 : 260))),
        h: Math.max(20, Number(el?.h ?? (type === "image" ? 150 : 90))),
        text: String(el?.text ?? "Text"),
        color: String(el?.color ?? "#ffffff"),
        background: String(el?.background ?? "transparent"),
        fontSize: Math.max(10, Number(el?.fontSize ?? 20)),
        src: String(el?.src ?? "")
    };
}

function normalizePage(page, title) {
    return {
        title: String(page?.title || title),
        subtitle: String(page?.subtitle || ""),
        sections: Array.isArray(page?.sections) ? page.sections.map((s) => ({ heading: String(s?.heading || "Section"), body: String(s?.body || "") })) : [],
        canvas: {
            width: Math.max(320, Number(page?.canvas?.width ?? 980)),
            height: Math.max(220, Number(page?.canvas?.height ?? 420)),
            background: String(page?.canvas?.background || "#1f1f1f")
        },
        elements: Array.isArray(page?.elements) ? page.elements.map((el, idx) => normalizeElement(el, idx)) : []
    };
}

function normalizeData(raw) {
    const defaults = makeDefaultData();
    const srcIcons = Array.isArray(raw?.icons) && raw.icons.length > 0 ? raw.icons : defaults.icons;
    const pagesSrc = raw?.pages && typeof raw.pages === "object" ? raw.pages : {};
    const used = new Set();
    const icons = srcIcons.map((icon, index) => {
        const slug = uniqueSlug(sanitizeSlug(icon?.slug || `icon-${index + 1}`), used);
        used.add(slug);
        return { slug, title: String(icon?.title || humanizeSlug(slug)), mini: String(icon?.mini || ""), full: String(icon?.full || "") };
    });
    const pages = {};
    icons.forEach((icon) => { pages[icon.slug] = normalizePage(pagesSrc[icon.slug], icon.title); });
    return { icons, pages };
}

function parseImportedText(text) {
    const src = String(text || "").trim();
    if (!src) throw new Error("File is empty.");
    const mData = src.match(/window\.SKILLBUILDER_DATA\s*=\s*([\s\S]*?);?\s*$/);
    if (mData) return JSON.parse(mData[1]);
    const mPages = src.match(/window\.SKILLBUILDER_PAGES\s*=\s*([\s\S]*?);?\s*$/);
    if (mPages) return { pages: JSON.parse(mPages[1]) };
    const parsed = JSON.parse(src);
    if (parsed && typeof parsed === "object") {
        if (Array.isArray(parsed.icons) || parsed.pages) return parsed;
        return { pages: parsed };
    }
    throw new Error("Unsupported import format.");
}

function loadSavedObject(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_e) {
        return null;
    }
}

async function apiFetch(path, init = {}) {
    const headers = { ...(init.headers || {}) };
    if (!headers["Content-Type"] && init.body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    return fetch(`${API_BASE}${path}`, {
        ...init,
        headers,
        credentials: "include"
    });
}

async function checkEditorSession() {
    try {
        const response = await apiFetch("/api/editor/session");
        if (!response.ok) {
            return false;
        }
        const payload = await response.json();
        return Boolean(payload?.authorized);
    } catch (_error) {
        return false;
    }
}

async function loadInitialData() {
    const draft = loadSavedObject(EDITOR_STORAGE_KEY);
    if (draft) {
        return draft;
    }

    const localSiteData = loadSavedObject(TARGET_STORAGE_KEY);
    if (localSiteData) {
        return localSiteData;
    }

    try {
        const response = await apiFetch("/api/editor/data");
        if (response.ok) {
            const payload = await response.json();
            if (payload?.data) {
                localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(payload.data));
                return payload.data;
            }
        }
    } catch (_error) {
        // Ignore and fallback to public data/default.
    }

    try {
        const response = await apiFetch("/api/site-data");
        if (response.ok) {
            const payload = await response.json();
            if (payload?.data) {
                localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(payload.data));
                return payload.data;
            }
        }
    } catch (_error) {
        // Ignore and fallback to defaults.
    }

    return makeDefaultData();
}

function selectedIconIndex() { return state.data.icons.findIndex((i) => i.slug === state.selectedSlug); }
function selectedIcon() { const i = selectedIconIndex(); return i >= 0 ? state.data.icons[i] : null; }
function selectedPage() { return state.data.pages[state.selectedSlug] || null; }
function selectedElement(page = selectedPage()) { return page ? page.elements.find((e) => e.id === state.selectedElementId) || null : null; }

function ensureSelection() {
    if (!state.data || !state.data.icons?.length) state.data = makeDefaultData();
    if (!state.data.icons.some((i) => i.slug === state.selectedSlug)) state.selectedSlug = state.data.icons[0]?.slug || "";
    const icon = selectedIcon();
    if (!icon) { state.ui.slugBind = ""; state.ui.slugInput = ""; state.selectedElementId = ""; return; }
    if (!state.data.pages[icon.slug]) state.data.pages[icon.slug] = normalizePage(null, icon.title);
    if (state.ui.slugBind !== icon.slug) {
        state.ui.slugBind = icon.slug;
        state.ui.slugInput = icon.slug;
    }
    if (!selectedPage()?.elements.some((e) => e.id === state.selectedElementId)) state.selectedElementId = selectedPage()?.elements[0]?.id || "";
}

function syncPagesWithIcons() {
    const pages = {};
    state.data.icons.forEach((icon) => { pages[icon.slug] = normalizePage(state.data.pages[icon.slug], icon.title); });
    state.data.pages = pages;
}

function setStatus(message, error = false) { state.ui.status = String(message || ""); state.ui.statusError = Boolean(error); }

function saveDraftToStorage() {
    try { localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(state.data)); return true; }
    catch (e) { setStatus(`Draft save failed: ${String(e?.message || e)}`, true); return false; }
}

function saveSiteDataToLocalStorage() {
    try {
        localStorage.setItem(TARGET_STORAGE_KEY, JSON.stringify(state.data));
        return true;
    } catch (e) {
        setStatus(`Local save failed: ${String(e?.message || e)}`, true);
        return false;
    }
}

async function saveToBackend() {
    try {
        const response = await apiFetch("/api/editor/data", {
            method: "PUT",
            body: JSON.stringify({ data: buildExportObject() })
        });

        if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            const message = payload?.error || `HTTP ${response.status}`;
            setStatus(`Backend save failed: ${message}`, true);
            return false;
        }

        saveSiteDataToLocalStorage();
        setStatus("Saved to backend.");
        return true;
    } catch (error) {
        setStatus(`Backend save failed: ${String(error?.message || error)}`, true);
        return false;
    }
}

function onDataChanged(msg, persist = true) {
    syncPagesWithIcons();
    ensureSelection();
    if (persist) {
        if (state.ui.autoSaveDraft) saveDraftToStorage();
        saveSiteDataToLocalStorage();
        if (state.ui.autoSaveBackend) {
            void saveToBackend();
        }
    }
    if (msg) setStatus(msg);
}

function buildExportObject() { syncPagesWithIcons(); return clone(state.data); }
function buildExportJs() { return `${EXPORT_VAR_NAME} = ${JSON.stringify(buildExportObject(), null, 4)};`; }
function buildExportJson() { return JSON.stringify(buildExportObject(), null, 4); }

function downloadText(name, text, mime = "text/plain;charset=utf-8") {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
}

async function copyText(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (_e) {
        const t = document.createElement("textarea");
        t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
}
function pickFileFromInput(input, mode) {
    if (state.activeFilePicker) return Promise.resolve(null);
    state.activeFilePicker = mode;

    return new Promise((resolve) => {
        let done = false;
        const cleanup = () => {
            input.onchange = null;
            state.activeFilePicker = null;
            window.removeEventListener("focus", onFocus);
        };
        const finish = (value) => {
            if (done) return;
            done = true;
            cleanup();
            resolve(value);
        };
        const onFocus = () => {
            setTimeout(() => { if (!done) finish(null); }, 260);
        };

        window.addEventListener("focus", onFocus);

        input.onchange = async () => {
            const file = input.files?.[0];
            input.value = "";
            if (!file) { finish(null); return; }

            try {
                if (mode === "image") {
                    const dataUrl = await readFileAsDataURL(file);
                    const dims = await readImageDimensions(dataUrl);
                    finish({ name: file.name, dataUrl, width: dims.width, height: dims.height });
                } else {
                    const text = await file.text();
                    finish({ name: file.name, text });
                }
            } catch (e) {
                finish({ error: String(e?.message || e) });
            }
        };

        input.value = "";
        input.click();
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("File read failed."));
        reader.readAsDataURL(file);
    });
}

function readImageDimensions(src) {
    return new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth || 320, height: image.naturalHeight || 180 });
        image.onerror = () => resolve({ width: 320, height: 180 });
        image.src = src;
    });
}

function isAbsoluteAsset(src) {
    return /^(data:|blob:|https?:|file:|\/|[a-zA-Z]:\\|\\\\)/.test(src);
}

function assetCandidates(src) {
    const value = String(src || "").trim();
    if (!value) return [];
    return [value];
}

function queueTexture(source) {
    const src = String(source || "").trim();
    if (!src) return null;
    const cached = state.textures.get(src);
    if (cached) return cached;

    const record = { status: "loading", textureRef: null, width: 0, height: 0, error: "", resolvedSrc: "" };
    state.textures.set(src, record);

    const candidates = assetCandidates(src);
    let cursor = 0;

    const tryNext = () => {
        if (cursor >= candidates.length) {
            record.status = "error";
            record.error = "Failed to load image.";
            return;
        }

        const candidate = candidates[cursor++];
        const image = new Image();
        image.crossOrigin = "anonymous";

        image.onload = () => {
            try {
                record.textureRef = ImGuiImplWeb.LoadTexture(image);
                record.width = image.naturalWidth;
                record.height = image.naturalHeight;
                record.status = "ready";
                record.resolvedSrc = candidate;
            } catch (e) {
                record.status = "error";
                record.error = String(e?.message || e);
            }
        };

        image.onerror = () => tryNext();
        image.src = candidate;
    };

    tryNext();
    return record;
}

function parseHexRaw(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return null;
    if (text === "transparent") return { r: 0, g: 0, b: 0, a: 0 };

    let hex = text.startsWith("#") ? text.slice(1) : text;
    if (/^[0-9a-f]{3}$/.test(hex)) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}ff`;
    else if (/^[0-9a-f]{4}$/.test(hex)) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    else if (/^[0-9a-f]{6}$/.test(hex)) hex = `${hex}ff`;
    else if (!/^[0-9a-f]{8}$/.test(hex)) return null;

    return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: parseInt(hex.slice(6, 8), 16)
    };
}

function colorToU32(value, fallback) {
    const c = parseHexRaw(value) || parseHexRaw(fallback) || { r: 255, g: 255, b: 255, a: 255 };
    return ImGui.ColorConvertFloat4ToU32(new ImVec4(c.r / 255, c.g / 255, c.b / 255, c.a / 255));
}

function newElementId(page) {
    const used = new Set(page.elements.map((e) => String(e.id)));
    let i = page.elements.length + 1;
    while (used.has(`el-${i}`)) i += 1;
    return `el-${i}`;
}

function fitImageSize(width, height, maxSide = 360) {
    const w = Math.max(1, Number(width || 1));
    const h = Math.max(1, Number(height || 1));
    const scale = Math.min(1, maxSide / Math.max(w, h));
    return { w: Math.max(50, Math.round(w * scale)), h: Math.max(50, Math.round(h * scale)) };
}

function addTextElementAt(page, x, y) {
    const element = normalizeElement({ id: newElementId(page), type: "text", x: Math.round(x), y: Math.round(y), w: 280, h: 90, text: "New text", color: "#ffffff", background: "transparent", fontSize: 24 }, page.elements.length);
    page.elements.push(element);
    state.selectedElementId = element.id;
}

function addImageElementAt(page, src, x, y, width = 260, height = 160) {
    const element = normalizeElement({ id: newElementId(page), type: "image", x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height), src }, page.elements.length);
    page.elements.push(element);
    state.selectedElementId = element.id;
}

function removeSelectedElement() {
    const page = selectedPage();
    if (!page) return;
    const index = page.elements.findIndex((e) => e.id === state.selectedElementId);
    if (index < 0) return;
    page.elements.splice(index, 1);
    state.selectedElementId = page.elements[Math.max(0, index - 1)]?.id || "";
}

function duplicateSelectedElement() {
    const page = selectedPage();
    const element = selectedElement(page);
    if (!page || !element) return;
    const copy = normalizeElement({ ...element, id: newElementId(page), x: element.x + 16, y: element.y + 16 }, page.elements.length);
    page.elements.push(copy);
    state.selectedElementId = copy.id;
}

function bringElementToFront(page, id) {
    const i = page.elements.findIndex((e) => e.id === id);
    if (i < 0 || i === page.elements.length - 1) return;
    const [el] = page.elements.splice(i, 1);
    page.elements.push(el);
}

function sendElementToBack(page, id) {
    const i = page.elements.findIndex((e) => e.id === id);
    if (i <= 0) return;
    const [el] = page.elements.splice(i, 1);
    page.elements.unshift(el);
}

function hitTestElement(page, x, y) {
    for (let i = page.elements.length - 1; i >= 0; i -= 1) {
        const el = page.elements[i];
        if (x >= el.x && y >= el.y && x <= el.x + el.w && y <= el.y + el.h) return el;
    }
    return null;
}

function renameSelectedIcon(rawSlug) {
    const icon = selectedIcon();
    if (!icon) return;
    const used = new Set(state.data.icons.map((i) => i.slug).filter((s) => s !== icon.slug));
    const nextSlug = uniqueSlug(sanitizeSlug(rawSlug), used);
    if (nextSlug === icon.slug) { state.ui.slugBind = nextSlug; state.ui.slugInput = nextSlug; return; }
    const oldSlug = icon.slug;
    icon.slug = nextSlug;
    state.data.pages[nextSlug] = normalizePage(state.data.pages[oldSlug], icon.title);
    delete state.data.pages[oldSlug];
    state.selectedSlug = nextSlug;
    state.ui.slugBind = nextSlug;
    state.ui.slugInput = nextSlug;
    onDataChanged(`Slug changed: ${oldSlug} -> ${nextSlug}`);
}

function addIcon() {
    const used = new Set(state.data.icons.map((i) => i.slug));
    const slug = uniqueSlug("new-icon", used);
    const icon = { slug, title: "New Icon", mini: "", full: "" };
    state.data.icons.push(icon);
    state.data.pages[slug] = defaultPageFor(icon.title);
    state.selectedSlug = slug;
    state.ui.slugBind = slug;
    state.ui.slugInput = slug;
    state.selectedElementId = "";
    onDataChanged("New icon created.");
}

function removeCurrentIcon() {
    if (state.data.icons.length <= 1) { setStatus("At least one icon is required.", true); return; }
    const idx = selectedIconIndex();
    if (idx < 0) return;
    const icon = state.data.icons[idx];
    state.data.icons.splice(idx, 1);
    delete state.data.pages[icon.slug];
    const next = state.data.icons[Math.min(idx, state.data.icons.length - 1)];
    state.selectedSlug = next?.slug || "";
    state.ui.slugBind = state.selectedSlug;
    state.ui.slugInput = state.selectedSlug;
    state.selectedElementId = "";
    onDataChanged(`Icon "${icon.title}" removed.`);
}

function moveCurrentIcon(delta) {
    const from = selectedIconIndex();
    if (from < 0) return;
    const to = clamp(from + delta, 0, state.data.icons.length - 1);
    if (to === from) return;
    const [icon] = state.data.icons.splice(from, 1);
    state.data.icons.splice(to, 0, icon);
    onDataChanged("Icon order updated.");
}
async function importDataFromFile() {
    const loaded = await pickFileFromInput(dataFileInput, "data");
    if (!loaded) return;
    if (loaded.error) { setStatus(`Import failed: ${loaded.error}`, true); return; }

    try {
        const parsed = parseImportedText(loaded.text);
        if (parsed.pages && !Array.isArray(parsed.icons)) {
            const icons = clone(state.data.icons);
            const known = new Set(icons.map((i) => i.slug));
            Object.keys(parsed.pages).forEach((raw) => {
                const slug = sanitizeSlug(raw);
                if (!known.has(slug)) {
                    known.add(slug);
                    icons.push({ slug, title: parsed.pages[raw]?.title || humanizeSlug(slug), mini: "", full: "" });
                }
            });
            state.data = normalizeData({ icons, pages: parsed.pages });
        } else {
            state.data = normalizeData(parsed);
        }

        state.selectedSlug = state.data.icons[0]?.slug || "";
        state.selectedElementId = "";
        state.ui.slugBind = state.selectedSlug;
        state.ui.slugInput = state.selectedSlug;
        onDataChanged(`Imported: ${loaded.name || "file"}`);
    } catch (e) {
        setStatus(`Import parse error: ${String(e?.message || e)}`, true);
    }
}

async function uploadIconImage(kind) {
    const icon = selectedIcon();
    if (!icon) return;
    const loaded = await pickFileFromInput(imageFileInput, "image");
    if (!loaded) return;
    if (loaded.error) { setStatus(`Image load failed: ${loaded.error}`, true); return; }
    if (kind === "mini") {
        icon.mini = loaded.dataUrl;
        onDataChanged(`Mini icon updated (${loaded.name}).`);
    } else {
        icon.full = loaded.dataUrl;
        onDataChanged(`Full icon updated (${loaded.name}).`);
    }
}

async function addImageElementInteractive() {
    const page = selectedPage();
    if (!page) return;
    const loaded = await pickFileFromInput(imageFileInput, "image");
    if (!loaded) return;
    if (loaded.error) { setStatus(`Image load failed: ${loaded.error}`, true); return; }
    const fit = fitImageSize(loaded.width, loaded.height);
    addImageElementAt(page, loaded.dataUrl, 28, 28, fit.w, fit.h);
    onDataChanged(`Image element added (${loaded.name}).`);
}

async function placeImageOnCanvas() {
    const loaded = await pickFileFromInput(imageFileInput, "image");
    if (!loaded) return;
    if (loaded.error) { setStatus(`Image load failed: ${loaded.error}`, true); return; }
    const fit = fitImageSize(loaded.width, loaded.height);
    state.ui.placeMode = { type: "image", src: loaded.dataUrl, width: fit.w, height: fit.h };
    setStatus(`Click on canvas to place image (${loaded.name}).`);
}

function startPlaceTextMode() {
    state.ui.placeMode = { type: "text" };
    setStatus("Click on canvas to place text.");
}

function drawTexturePreview(src, size, id = "preview") {
    const t = queueTexture(src);
    if (t && t.status === "ready" && t.textureRef) ImGui.Image(t.textureRef, size);
    else if (src) ImGui.Button(`loading##${id}`, size);
    else ImGui.Button(`empty##${id}`, size);
}

function renderProjectWindow() {
    ImGui.SetNextWindowPos(new ImVec2(12, 12), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(400, 300), ImGui.Cond.FirstUseEver);

    if (ImGui.Begin("Project")) {
        ImGui.Text(`API: ${API_BASE}`);
        ImGui.Text(`Icons: ${state.data.icons.length}`);
        ImGui.Text(`Pages: ${Object.keys(state.data.pages).length}`);
        ImGui.Separator();

        if (ImGui.Button("Save Draft", new ImVec2(120, 0))) {
            if (saveDraftToStorage()) setStatus("Draft saved.");
        }
        ImGui.SameLine();
        if (ImGui.Button("Save to backend", new ImVec2(170, 0))) void saveToBackend();

        if (ImGui.Button("Open site preview", new ImVec2(220, 0))) {
            if (saveSiteDataToLocalStorage()) window.open(`index.html#${state.selectedSlug}`, "_blank");
        }
        ImGui.SameLine();
        if (ImGui.Button("Import data file", new ImVec2(140, 0))) void importDataFromFile();

        if (ImGui.Button("Copy JS export", new ImVec2(130, 0))) void copyText(buildExportJs()).then(() => setStatus("JS export copied."));
        ImGui.SameLine();
        if (ImGui.Button("Download JS", new ImVec2(110, 0))) {
            downloadText("page-data.js", buildExportJs(), "text/javascript;charset=utf-8");
            setStatus("Downloaded page-data.js.");
        }
        ImGui.SameLine();
        if (ImGui.Button("Download JSON", new ImVec2(120, 0))) {
            downloadText("page-data.json", buildExportJson(), "application/json;charset=utf-8");
            setStatus("Downloaded page-data.json.");
        }

        const autoSave = [state.ui.autoSaveDraft];
        if (ImGui.Checkbox("Auto-save draft", autoSave)) {
            state.ui.autoSaveDraft = autoSave[0];
            if (state.ui.autoSaveDraft) saveDraftToStorage();
        }

        const autoSaveBackend = [state.ui.autoSaveBackend];
        if (ImGui.Checkbox("Auto-save to backend", autoSaveBackend)) {
            state.ui.autoSaveBackend = autoSaveBackend[0];
            if (state.ui.autoSaveBackend) void saveToBackend();
        }

        const showExport = [state.ui.showExport];
        if (ImGui.Checkbox("Show export preview", showExport)) state.ui.showExport = showExport[0];

        ImGui.Separator();
        ImGui.Text(`${state.ui.statusError ? "Error" : "Status"}: ${state.ui.status}`);
    }
    ImGui.End();
}

function renderIconsWindow() {
    ImGui.SetNextWindowPos(new ImVec2(12, 330), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(410, 620), ImGui.Cond.FirstUseEver);

    const icon = selectedIcon();
    const page = selectedPage();

    if (ImGui.Begin("Icons and Page Links")) {
        const filter = [state.ui.iconFilter];
        if (ImGui.InputText("Search icons", filter, 256)) state.ui.iconFilter = filter[0];

        if (ImGui.BeginChild("icons-list", new ImVec2(0, 210), ImGui.ChildFlags.Borders)) {
            const q = state.ui.iconFilter.trim().toLowerCase();
            state.data.icons.forEach((entry) => {
                const hay = `${entry.title} ${entry.slug}`.toLowerCase();
                if (q && !hay.includes(q)) return;
                const selected = entry.slug === state.selectedSlug;
                if (ImGui.Selectable(`${entry.title} (${entry.slug})##icon-${entry.slug}`, selected)) {
                    state.selectedSlug = entry.slug;
                    state.selectedElementId = selectedPage()?.elements[0]?.id || "";
                    state.ui.slugBind = entry.slug;
                    state.ui.slugInput = entry.slug;
                }
            });
        }
        ImGui.EndChild();

        if (ImGui.Button("New icon", new ImVec2(90, 0))) addIcon();
        ImGui.SameLine();
        if (ImGui.Button("Remove", new ImVec2(90, 0))) removeCurrentIcon();
        ImGui.SameLine();
        if (ImGui.Button("Move up", new ImVec2(90, 0))) moveCurrentIcon(-1);
        ImGui.SameLine();
        if (ImGui.Button("Move down", new ImVec2(90, 0))) moveCurrentIcon(1);

        ImGui.Separator();

        if (icon && page) {
            const slugBuf = [state.ui.slugInput || icon.slug];
            if (ImGui.InputText("Slug", slugBuf, 256)) state.ui.slugInput = slugBuf[0];
            ImGui.SameLine();
            if (ImGui.Button("Apply slug")) renameSelectedIcon(state.ui.slugInput || icon.slug);

            const oldTitle = icon.title;
            const title = [icon.title];
            if (ImGui.InputText("Icon title", title, 256)) {
                icon.title = title[0];
                if (page.title === oldTitle) page.title = icon.title;
                onDataChanged("Icon title updated.");
            }

            const mini = [icon.mini];
            if (ImGui.InputText("Mini image", mini, MAX_PATH_TEXT)) { icon.mini = mini[0]; onDataChanged("Mini icon path updated."); }
            if (ImGui.Button("Upload mini")) void uploadIconImage("mini");
            ImGui.SameLine();
            if (ImGui.Button("Clear mini")) { icon.mini = ""; onDataChanged("Mini icon removed."); }

            const full = [icon.full];
            if (ImGui.InputText("Full image", full, MAX_PATH_TEXT)) { icon.full = full[0]; onDataChanged("Full icon path updated."); }
            if (ImGui.Button("Upload full")) void uploadIconImage("full");
            ImGui.SameLine();
            if (ImGui.Button("Use mini as full")) { icon.full = icon.mini; onDataChanged("Full icon copied from mini."); }

            ImGui.Text("Mini preview:");
            drawTexturePreview(icon.mini, new ImVec2(36, 36), "icon-mini");
            ImGui.SameLine();
            ImGui.Text("Full preview:");
            ImGui.SameLine();
            drawTexturePreview(icon.full, new ImVec2(90, 36), "icon-full");
        }
    }
    ImGui.End();
}

function renderPageContentWindow() {
    ImGui.SetNextWindowPos(new ImVec2(430, 12), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(460, 520), ImGui.Cond.FirstUseEver);

    const page = selectedPage();
    if (ImGui.Begin("Page Content")) {
        if (!page) {
            ImGui.Text("No page selected.");
            ImGui.End();
            return;
        }

        const title = [page.title];
        if (ImGui.InputText("Page title", title, MAX_TEXT)) { page.title = title[0]; onDataChanged("Page title updated."); }

        const subtitle = [page.subtitle];
        if (ImGui.InputTextMultiline("Subtitle", subtitle, MAX_LONG_TEXT, new ImVec2(-1, 90))) { page.subtitle = subtitle[0]; onDataChanged("Subtitle updated."); }

        ImGui.Separator();
        ImGui.Text(`Sections: ${page.sections.length}`);

        if (ImGui.BeginChild("sections-list", new ImVec2(0, 260), ImGui.ChildFlags.Borders)) {
            page.sections.forEach((section, i) => {
                const label = `Section ${i + 1}: ${section.heading || "Untitled"}##sec-${i}`;
                if (ImGui.CollapsingHeader(label)) {
                    const head = [section.heading];
                    if (ImGui.InputText(`Heading##${i}`, head, MAX_TEXT)) { section.heading = head[0]; onDataChanged("Section heading updated."); }
                    const body = [section.body];
                    if (ImGui.InputTextMultiline(`Body##${i}`, body, MAX_LONG_TEXT, new ImVec2(-1, 85))) { section.body = body[0]; onDataChanged("Section body updated."); }
                    if (ImGui.SmallButton(`Remove##sec-${i}`)) { page.sections.splice(i, 1); onDataChanged("Section removed."); }
                }
            });
        }
        ImGui.EndChild();

        if (ImGui.Button("Add section")) {
            page.sections.push({ heading: "New section", body: "Section text" });
            onDataChanged("Section added.");
        }

        ImGui.Separator();
        ImGui.Text("Canvas settings");
        const w = [Math.round(page.canvas.width)];
        if (ImGui.DragInt("Width", w, 1, 320, 3840)) { page.canvas.width = clamp(w[0], 320, 3840); onDataChanged("Canvas width updated."); }
        const h = [Math.round(page.canvas.height)];
        if (ImGui.DragInt("Height", h, 1, 220, 2160)) { page.canvas.height = clamp(h[0], 220, 2160); onDataChanged("Canvas height updated."); }
        const bg = [page.canvas.background];
        if (ImGui.InputText("Background", bg, 64)) { page.canvas.background = bg[0]; onDataChanged("Canvas background updated."); }
    }
    ImGui.End();
}
function renderCanvasEditorWindow() {
    ImGui.SetNextWindowPos(new ImVec2(430, 540), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(980, 500), ImGui.Cond.FirstUseEver);

    const page = selectedPage();
    if (ImGui.Begin("Canvas Editor")) {
        if (!page) {
            ImGui.Text("No page selected.");
            ImGui.End();
            return;
        }

        ImGui.TextWrapped("Click element to select. Drag with left mouse to move. Place mode puts text or image where you click.");

        const fit = [state.ui.fitCanvas];
        if (ImGui.Checkbox("Fit canvas to view", fit)) state.ui.fitCanvas = fit[0];
        ImGui.SameLine();
        const zoom = [state.ui.zoom];
        if (ImGui.SliderFloat("Zoom", zoom, 0.2, 4.0, "%.2f")) state.ui.zoom = zoom[0];

        if (ImGui.Button("Place text on click")) startPlaceTextMode();
        ImGui.SameLine();
        if (ImGui.Button("Place image on click")) void placeImageOnCanvas();
        ImGui.SameLine();
        if (ImGui.Button("Cancel place mode")) { state.ui.placeMode = null; setStatus("Place mode canceled."); }

        if (state.ui.placeMode) ImGui.Text(`Place mode: ${state.ui.placeMode.type}`);

        const avail = ImGui.GetContentRegionAvail();
        const childSize = new ImVec2(Math.max(220, avail.x), Math.max(220, avail.y));

        if (ImGui.BeginChild("canvas-preview", childSize, ImGui.ChildFlags.Borders, ImGui.WindowFlags.HorizontalScrollbar)) {
            const fitScale = Math.min(childSize.x / page.canvas.width, childSize.y / page.canvas.height);
            const baseScale = state.ui.fitCanvas ? clamp(fitScale, 0.05, 1) : 1;
            const scale = clamp(baseScale * state.ui.zoom, 0.05, 8);

            const drawW = Math.max(1, page.canvas.width * scale);
            const drawH = Math.max(1, page.canvas.height * scale);
            const min = ImGui.GetCursorScreenPos();
            const max = new ImVec2(min.x + drawW, min.y + drawH);

            ImGui.InvisibleButton("canvas-hit", new ImVec2(drawW, drawH));

            const drawList = ImGui.GetWindowDrawList();
            drawList.AddRectFilled(min, max, colorToU32(page.canvas.background, "#1f1f1f"), 0);
            drawList.AddRect(min, max, colorToU32("#6e6e6e", "#6e6e6e"), 0, 0, 1);

            page.elements.forEach((el) => {
                const eMin = new ImVec2(min.x + el.x * scale, min.y + el.y * scale);
                const eMax = new ImVec2(eMin.x + el.w * scale, eMin.y + el.h * scale);

                if (el.type === "image") {
                    const t = queueTexture(el.src);
                    if (t && t.status === "ready" && t.textureRef) drawList.AddImage(t.textureRef, eMin, eMax);
                    else {
                        drawList.AddRectFilled(eMin, eMax, colorToU32("#2b2b2b", "#2b2b2b"), 0);
                        drawList.AddText(new ImVec2(eMin.x + 6, eMin.y + 6), colorToU32("#b8b8b8", "#b8b8b8"), "Image");
                    }
                } else {
                    const bg = parseHexRaw(el.background);
                    if (bg && bg.a > 0) drawList.AddRectFilled(eMin, eMax, colorToU32(el.background, "#000000"), 4);
                    drawList.AddText(new ImVec2(eMin.x + 6, eMin.y + 6), colorToU32(el.color, "#ffffff"), el.text || "Text");
                }

                const sel = el.id === state.selectedElementId;
                drawList.AddRect(eMin, eMax, sel ? colorToU32("#ffffff", "#ffffff") : colorToU32("#5b5b5b", "#5b5b5b"), 4, 0, sel ? 2 : 1);
            });

            const hovered = ImGui.IsItemHovered();
            const click = hovered && ImGui.IsMouseClicked(ImGui.MouseButton.Left);
            const mouse = ImGui.GetMousePos();
            const lx = (mouse.x - min.x) / scale;
            const ly = (mouse.y - min.y) / scale;

            if (click) {
                if (state.ui.placeMode?.type === "text") {
                    addTextElementAt(page, lx, ly);
                    state.ui.placeMode = null;
                    onDataChanged("Text placed.");
                } else if (state.ui.placeMode?.type === "image") {
                    addImageElementAt(page, state.ui.placeMode.src || "", lx, ly, state.ui.placeMode.width || 260, state.ui.placeMode.height || 160);
                    state.ui.placeMode = null;
                    onDataChanged("Image placed.");
                } else {
                    const hit = hitTestElement(page, lx, ly);
                    if (hit) {
                        state.selectedElementId = hit.id;
                        bringElementToFront(page, hit.id);
                        state.drag.elementId = hit.id;
                        state.drag.offsetX = lx - hit.x;
                        state.drag.offsetY = ly - hit.y;
                    } else {
                        state.selectedElementId = "";
                    }
                }
            }

            if (state.drag.elementId) {
                if (ImGui.IsMouseDown(ImGui.MouseButton.Left)) {
                    const el = page.elements.find((item) => item.id === state.drag.elementId);
                    if (el) {
                        const maxX = Math.max(0, page.canvas.width - el.w);
                        const maxY = Math.max(0, page.canvas.height - el.h);
                        const nx = clamp(Math.round(lx - state.drag.offsetX), 0, maxX);
                        const ny = clamp(Math.round(ly - state.drag.offsetY), 0, maxY);
                        if (nx !== el.x || ny !== el.y) {
                            el.x = nx;
                            el.y = ny;
                            onDataChanged("", false);
                        }
                    }
                } else {
                    state.drag.elementId = "";
                }
            }
        }
        ImGui.EndChild();
    }
    ImGui.End();
}

function renderElementsWindow() {
    ImGui.SetNextWindowPos(new ImVec2(900, 12), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(520, 520), ImGui.Cond.FirstUseEver);

    const page = selectedPage();
    if (ImGui.Begin("Elements")) {
        if (!page) {
            ImGui.Text("No page selected.");
            ImGui.End();
            return;
        }

        if (ImGui.Button("Add text")) { addTextElementAt(page, 30, 30); onDataChanged("Text element added."); }
        ImGui.SameLine();
        if (ImGui.Button("Add image")) void addImageElementInteractive();
        ImGui.SameLine();
        if (ImGui.Button("Duplicate")) { duplicateSelectedElement(); onDataChanged("Element duplicated."); }
        ImGui.SameLine();
        if (ImGui.Button("Delete")) { removeSelectedElement(); onDataChanged("Element removed."); }

        if (ImGui.BeginChild("elements-list", new ImVec2(0, 200), ImGui.ChildFlags.Borders)) {
            page.elements.forEach((el, idx) => {
                const selected = el.id === state.selectedElementId;
                const label = `${idx + 1}. ${el.type} (${Math.round(el.x)}, ${Math.round(el.y)})##${el.id}`;
                if (ImGui.Selectable(label, selected)) state.selectedElementId = el.id;
            });
        }
        ImGui.EndChild();

        const el = selectedElement(page);
        if (!el) {
            ImGui.Text("Select an element for properties.");
            ImGui.End();
            return;
        }

        ImGui.Separator();
        ImGui.Text(`Selected: ${el.type}`);

        const x = [Math.round(el.x)];
        if (ImGui.DragInt("X", x, 1, 0, Math.max(0, page.canvas.width - 10))) { el.x = x[0]; onDataChanged("Element X updated."); }
        const y = [Math.round(el.y)];
        if (ImGui.DragInt("Y", y, 1, 0, Math.max(0, page.canvas.height - 10))) { el.y = y[0]; onDataChanged("Element Y updated."); }
        const w = [Math.round(el.w)];
        if (ImGui.DragInt("Width", w, 1, 24, 3840)) { el.w = Math.max(24, w[0]); onDataChanged("Element width updated."); }
        const h = [Math.round(el.h)];
        if (ImGui.DragInt("Height", h, 1, 20, 2160)) { el.h = Math.max(20, h[0]); onDataChanged("Element height updated."); }

        if (ImGui.Button("Bring to front")) { bringElementToFront(page, el.id); onDataChanged("Element moved to front."); }
        ImGui.SameLine();
        if (ImGui.Button("Send to back")) { sendElementToBack(page, el.id); onDataChanged("Element moved to back."); }

        if (el.type === "text") {
            const text = [el.text];
            if (ImGui.InputTextMultiline("Text", text, MAX_LONG_TEXT, new ImVec2(-1, 120))) { el.text = text[0]; onDataChanged("Text updated."); }
            const f = [Math.round(el.fontSize)];
            if (ImGui.DragInt("Font size", f, 1, 10, 180)) { el.fontSize = Math.max(10, f[0]); onDataChanged("Font size updated."); }
            const c = [el.color];
            if (ImGui.InputText("Text color", c, 64)) { el.color = c[0]; onDataChanged("Text color updated."); }
            const bg = [el.background];
            if (ImGui.InputText("Text background", bg, 64)) { el.background = bg[0]; onDataChanged("Text background updated."); }
        } else {
            const src = [el.src];
            if (ImGui.InputText("Image source", src, MAX_PATH_TEXT)) { el.src = src[0]; onDataChanged("Image source updated."); }
            if (ImGui.Button("Upload image file")) {
                void (async () => {
                    const loaded = await pickFileFromInput(imageFileInput, "image");
                    if (!loaded || loaded.error) { if (loaded?.error) setStatus(`Image load failed: ${loaded.error}`, true); return; }
                    el.src = loaded.dataUrl;
                    const fit = fitImageSize(loaded.width, loaded.height);
                    el.w = fit.w;
                    el.h = fit.h;
                    onDataChanged("Image source replaced.");
                })();
            }
            ImGui.Text("Image preview:");
            drawTexturePreview(el.src, new ImVec2(180, 90), `element-${el.id}`);
        }
    }
    ImGui.End();
}

function renderExportWindow() {
    if (!state.ui.showExport) return;
    ImGui.SetNextWindowPos(new ImVec2(1420, 12), ImGui.Cond.FirstUseEver);
    ImGui.SetNextWindowSize(new ImVec2(540, 530), ImGui.Cond.FirstUseEver);

    if (ImGui.Begin("Export Preview")) {
        const js = buildExportJs();
        const size = Math.max(4096, js.length + 128);
        const buf = [js];
        ImGui.InputTextMultiline("##export-data", buf, size, new ImVec2(-1, -1), ImGui.InputTextFlags.ReadOnly);
    }
    ImGui.End();
}

function resizeCanvasToDisplaySize() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const width = Math.max(1, Math.floor(canvasElement.clientWidth * dpr));
    const height = Math.max(1, Math.floor(canvasElement.clientHeight * dpr));
    if (canvasElement.width !== width || canvasElement.height !== height) {
        canvasElement.width = width;
        canvasElement.height = height;
    }
}

function applyStyle() {
    const style = ImGui.GetStyle();
    style.WindowRounding = 8;
    style.FrameRounding = 5;
    style.GrabRounding = 5;
    style.PopupRounding = 6;
    style.ScrollbarRounding = 6;
    style.WindowPadding = new ImVec2(10, 10);
    style.FramePadding = new ImVec2(8, 5);
    style.ItemSpacing = new ImVec2(8, 6);
}

function renderFrame() {
    ensureSelection();
    resizeCanvasToDisplaySize();

    ImGuiImplWeb.BeginRender();
    renderProjectWindow();
    renderIconsWindow();
    renderPageContentWindow();
    renderCanvasEditorWindow();
    renderElementsWindow();
    renderExportWindow();
    ImGuiImplWeb.EndRender();

    requestAnimationFrame(renderFrame);
}

async function start() {
    const authorized = await checkEditorSession();
    if (!authorized) {
        alert("Editor access denied. Press F9 twice on the main page and enter the key.");
        window.location.href = "index.html";
        return;
    }

    const initial = await loadInitialData();
    state.data = normalizeData(initial);
    state.selectedSlug = state.data.icons[0]?.slug || "";
    state.selectedElementId = "";
    state.ui.slugBind = state.selectedSlug;
    state.ui.slugInput = state.selectedSlug;

    await ImGuiImplWeb.Init({ canvas: canvasElement });
    applyStyle();
    setStatus("ImGui editor is ready.");
    requestAnimationFrame(renderFrame);
}

start().catch((error) => {
    console.error(error);
    alert(`Editor failed to start: ${String(error?.message || error)}`);
});
