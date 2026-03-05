(() => {
    const LOCAL_DATA_KEY = "JJS_SKILLBUILDER_DATA";
    const BACKEND_URL_STORAGE_KEY = "JJS_BACKEND_URL";
    const DEFAULT_BACKEND_URL = "https://jjs-skillbuilder-backend.onrender.com";
    const DOUBLE_F9_MS = 700;

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

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

    const defaultPageFor = (title) => ({
        title,
        subtitle: `Content page for ${title}.`,
        sections: [
            { heading: "Overview", body: `Main notes for ${title}.` },
            { heading: "Setup", body: `Configuration details and values for ${title}.` },
            { heading: "Tips", body: `Extra usage tips and practical combos for ${title}.` }
        ],
        canvas: { width: 980, height: 420, background: "#1f1f1f" },
        elements: []
    });

    const makeDefaultData = () => {
        const icons = DEFAULT_ICONS.map((icon) => ({ ...icon }));
        const pages = {};
        icons.forEach((icon) => {
            pages[icon.slug] = defaultPageFor(icon.title);
        });
        return { icons, pages };
    };

    const sanitizeSlug = (value) => {
        const cleaned = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, "-")
            .replace(/[^a-z0-9-]/g, "")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
        return cleaned || "icon";
    };

    const uniqueSlug = (base, usedSet) => {
        const normalized = sanitizeSlug(base);
        if (!usedSet.has(normalized)) {
            return normalized;
        }

        let index = 2;
        while (usedSet.has(`${normalized}-${index}`)) {
            index += 1;
        }
        return `${normalized}-${index}`;
    };

    const humanizeSlug = (slug) => String(slug || "")
        .split("-")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Untitled";

    const normalizeElement = (element, index) => {
        const type = element?.type === "image" ? "image" : "text";
        return {
            id: String(element?.id || `el-${index + 1}`),
            type,
            x: Number(element?.x ?? 20),
            y: Number(element?.y ?? 20),
            w: Math.max(20, Number(element?.w ?? (type === "image" ? 240 : 260))),
            h: Math.max(20, Number(element?.h ?? (type === "image" ? 150 : 90))),
            text: String(element?.text ?? "Text"),
            color: String(element?.color ?? "#ffffff"),
            background: String(element?.background ?? "transparent"),
            fontSize: Math.max(10, Number(element?.fontSize ?? 20)),
            src: String(element?.src ?? "")
        };
    };

    const normalizePage = (page, fallbackTitle) => ({
        title: String(page?.title || fallbackTitle),
        subtitle: String(page?.subtitle || ""),
        sections: Array.isArray(page?.sections)
            ? page.sections.map((section) => ({
                heading: String(section?.heading || "Section"),
                body: String(section?.body || "")
            }))
            : [],
        canvas: {
            width: Math.max(320, Number(page?.canvas?.width ?? 980)),
            height: Math.max(220, Number(page?.canvas?.height ?? 420)),
            background: String(page?.canvas?.background || "#1f1f1f")
        },
        elements: Array.isArray(page?.elements)
            ? page.elements.map((item, idx) => normalizeElement(item, idx))
            : []
    });

    const normalizeData = (rawData) => {
        const defaults = makeDefaultData();
        const sourceIcons = Array.isArray(rawData?.icons) && rawData.icons.length > 0
            ? rawData.icons
            : defaults.icons;
        const sourcePages = rawData?.pages && typeof rawData.pages === "object"
            ? rawData.pages
            : {};

        const used = new Set();
        const icons = sourceIcons.map((icon, index) => {
            const slug = uniqueSlug(icon?.slug || `icon-${index + 1}`, used);
            used.add(slug);
            return {
                slug,
                title: String(icon?.title || humanizeSlug(slug)),
                mini: String(icon?.mini || ""),
                full: String(icon?.full || "")
            };
        });

        const pages = {};
        icons.forEach((icon) => {
            pages[icon.slug] = normalizePage(sourcePages[icon.slug], icon.title);
        });

        return { icons, pages };
    };

    const state = {
        data: makeDefaultData(),
        currentSlug: "",
        refs: {
            index: {
                iconList: document.getElementById("iconList") || document.querySelector(".icon-list"),
                title: document.getElementById("splitTitle"),
                subtitle: document.getElementById("splitSubtitle"),
                sections: document.getElementById("splitSections"),
                canvas: document.getElementById("splitFreeCanvas")
            },
            standalone: {
                title: document.getElementById("pageTitle"),
                subtitle: document.getElementById("pageSubtitle"),
                sections: document.getElementById("pageSections"),
                canvas: document.getElementById("pageFreeCanvas")
            }
        },
        indexLinks: [],
        editor: {
            enabled: false,
            authorized: false,
            apiBase: normalizeApiBase(localStorage.getItem(BACKEND_URL_STORAGE_KEY)) || DEFAULT_BACKEND_URL,
            panel: null,
            refs: null,
            selectedElementId: "",
            drag: null,
            placeMode: null,
            lastF9At: 0,
            pendingFileAction: null,
            canvasBound: false
        }
    };

    const isIndexPage = () => Boolean(
        state.refs.index.iconList
        && state.refs.index.title
        && state.refs.index.subtitle
        && state.refs.index.sections
        && state.refs.index.canvas
    );

    const isStandalonePage = () => Boolean(
        state.refs.standalone.title
        && state.refs.standalone.subtitle
        && state.refs.standalone.sections
        && state.refs.standalone.canvas
    );

    const publishGlobals = () => {
        window.SKILLBUILDER_DATA = state.data;
        window.SKILLBUILDER_PAGES = state.data.pages;
    };

    const loadLocalData = () => {
        try {
            const raw = localStorage.getItem(LOCAL_DATA_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_error) {
            return null;
        }
    };

    const saveLocalData = () => {
        try {
            localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(state.data));
            return true;
        } catch (_error) {
            return false;
        }
    };

    const getSlugFromHash = () => window.location.hash.replace(/^#/, "");

    const ensureCurrentSlug = () => {
        if (!Array.isArray(state.data.icons) || state.data.icons.length === 0) {
            state.data = makeDefaultData();
        }

        if (!state.data.icons.some((icon) => icon.slug === state.currentSlug)) {
            state.currentSlug = state.data.icons[0]?.slug || "";
        }

        if (state.currentSlug && !state.data.pages[state.currentSlug]) {
            const icon = state.data.icons.find((item) => item.slug === state.currentSlug);
            state.data.pages[state.currentSlug] = defaultPageFor(icon?.title || "Page");
        }
    };

    const setCurrentSlug = (slug, syncHash = true) => {
        if (!slug || !state.data.pages[slug]) {
            return;
        }

        state.currentSlug = slug;
        if (syncHash && window.location.hash.replace(/^#/, "") !== slug) {
            window.location.hash = slug;
        }
    };

    const getCurrentPage = () => state.data.pages[state.currentSlug] || null;

    const getSelectedElement = () => {
        const page = getCurrentPage();
        if (!page) {
            return null;
        }
        return page.elements.find((element) => element.id === state.editor.selectedElementId) || null;
    };

    const fitImageSize = (width, height, maxSide = 360) => {
        const safeW = Math.max(1, Number(width || 1));
        const safeH = Math.max(1, Number(height || 1));
        const scale = Math.min(1, maxSide / Math.max(safeW, safeH));
        return {
            w: Math.max(40, Math.round(safeW * scale)),
            h: Math.max(40, Math.round(safeH * scale))
        };
    };

    const nextElementId = (page) => {
        const used = new Set(page.elements.map((element) => String(element.id)));
        let index = page.elements.length + 1;
        while (used.has(`el-${index}`)) {
            index += 1;
        }
        return `el-${index}`;
    };
    const renderSections = (container, sections, sectionClass) => {
        if (!container) {
            return;
        }

        container.innerHTML = "";
        sections.forEach((section) => {
            const card = document.createElement("article");
            card.className = sectionClass;

            const heading = document.createElement("h3");
            heading.textContent = section.heading;

            const body = document.createElement("p");
            body.textContent = section.body;

            card.appendChild(heading);
            card.appendChild(body);
            container.appendChild(card);
        });
    };

    const renderElements = (container, page) => {
        if (!container || !page) {
            return;
        }

        container.innerHTML = "";
        page.elements.forEach((element) => {
            const node = document.createElement("div");
            node.className = `free-item ${element.type}`;
            node.dataset.elementId = element.id;
            node.style.left = `${element.x}px`;
            node.style.top = `${element.y}px`;
            node.style.width = `${element.w}px`;
            node.style.height = `${element.h}px`;

            if (state.editor.enabled) {
                node.classList.add("is-edit-draggable");
                if (state.editor.selectedElementId === element.id) {
                    node.classList.add("is-edit-selected");
                }
            }

            if (element.type === "image") {
                const image = document.createElement("img");
                image.src = element.src || "";
                image.alt = "";
                node.appendChild(image);
            } else {
                node.textContent = element.text;
                node.style.color = element.color;
                node.style.background = element.background;
                node.style.fontSize = `${element.fontSize}px`;
            }

            container.appendChild(node);
        });
    };

    const renderIndexPanel = () => {
        if (!isIndexPage()) {
            return;
        }

        const page = getCurrentPage();
        const refs = state.refs.index;

        if (!page) {
            refs.title.textContent = "Page not found";
            refs.subtitle.textContent = "No content for this page.";
            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = "980px";
            refs.canvas.style.height = "420px";
            refs.canvas.style.background = "#1f1f1f";
            return;
        }

        refs.title.textContent = page.title;
        refs.subtitle.textContent = page.subtitle;
        renderSections(refs.sections, page.sections, "split-section");
        refs.canvas.style.width = `${page.canvas.width}px`;
        refs.canvas.style.height = `${page.canvas.height}px`;
        refs.canvas.style.background = page.canvas.background;
        renderElements(refs.canvas, page);

        state.indexLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.slug === state.currentSlug);
        });
    };

    const renderStandalone = () => {
        if (!isStandalonePage()) {
            return;
        }

        const slug = getSlugFromHash() || state.data.icons[0]?.slug || "";
        const page = state.data.pages[slug];
        const refs = state.refs.standalone;

        if (!page) {
            refs.title.textContent = "Page not found";
            refs.subtitle.textContent = "No content for this page.";
            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = "980px";
            refs.canvas.style.height = "420px";
            refs.canvas.style.background = "#1f1f1f";
            return;
        }

        refs.title.textContent = page.title;
        refs.subtitle.textContent = page.subtitle;
        renderSections(refs.sections, page.sections, "page-section");
        refs.canvas.style.width = `${page.canvas.width}px`;
        refs.canvas.style.height = `${page.canvas.height}px`;
        refs.canvas.style.background = page.canvas.background;
        renderElements(refs.canvas, page);
        document.title = `${page.title} | JJS Skillbuilder`;
    };

    const buildIconList = () => {
        if (!isIndexPage()) {
            return;
        }

        state.refs.index.iconList.innerHTML = "";
        state.indexLinks = [];

        state.data.icons.forEach((icon) => {
            const link = document.createElement("a");
            link.className = "icon-link";
            link.href = `page.html#${icon.slug}`;
            link.title = icon.title;
            link.dataset.slug = icon.slug;

            const img = document.createElement("img");
            img.src = icon.mini;
            img.alt = icon.title;
            img.dataset.full = icon.full;

            link.appendChild(img);
            state.refs.index.iconList.appendChild(link);

            link.addEventListener("click", (event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
                    return;
                }

                event.preventDefault();
                setCurrentSlug(icon.slug, true);
                renderMain({ syncEditor: true });
            });

            state.indexLinks.push(link);
        });
    };

    const renderMain = ({ rebuildIcons = false, syncEditor = false } = {}) => {
        ensureCurrentSlug();
        publishGlobals();

        if (rebuildIcons) {
            buildIconList();
        }

        renderIndexPanel();
        renderStandalone();

        if (syncEditor) {
            syncEditorPanel();
        }
    };

    const setEditorStatus = (message, isError = false) => {
        if (!state.editor.refs?.status) {
            return;
        }
        state.editor.refs.status.textContent = message;
        state.editor.refs.status.classList.toggle("is-error", Boolean(isError));
    };

    const setInputValueIfIdle = (input, value) => {
        if (!input) {
            return;
        }
        if (document.activeElement !== input) {
            input.value = value;
        }
    };

    const syncEditorSections = () => {
        if (!state.editor.refs?.sectionsWrap) {
            return;
        }

        const page = getCurrentPage();
        state.editor.refs.sectionsWrap.innerHTML = "";
        if (!page) {
            return;
        }

        page.sections.forEach((section, index) => {
            const row = document.createElement("div");
            row.className = "site-editor-card";

            const heading = document.createElement("input");
            heading.type = "text";
            heading.value = section.heading;
            heading.placeholder = "Section heading";
            heading.addEventListener("input", () => {
                section.heading = heading.value;
                saveLocalData();
                renderMain();
            });

            const body = document.createElement("textarea");
            body.rows = 3;
            body.value = section.body;
            body.placeholder = "Section body";
            body.addEventListener("input", () => {
                section.body = body.value;
                saveLocalData();
                renderMain();
            });

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.textContent = "Remove section";
            removeBtn.addEventListener("click", () => {
                page.sections.splice(index, 1);
                saveLocalData();
                renderMain({ syncEditor: true });
            });

            row.appendChild(heading);
            row.appendChild(body);
            row.appendChild(removeBtn);
            state.editor.refs.sectionsWrap.appendChild(row);
        });
    };

    const syncEditorElementFields = () => {
        if (!state.editor.refs) {
            return;
        }

        const refs = state.editor.refs;
        const element = getSelectedElement();

        if (!element) {
            refs.elementMeta.textContent = "No selected element";
            refs.elementTextWrap.style.display = "none";
            refs.elementSrcWrap.style.display = "none";
            return;
        }

        refs.elementMeta.textContent = `Selected: ${element.id} (${element.type})`;
        refs.elementTextWrap.style.display = element.type === "text" ? "block" : "none";
        refs.elementSrcWrap.style.display = element.type === "image" ? "block" : "none";

        setInputValueIfIdle(refs.elText, element.text || "");
        setInputValueIfIdle(refs.elSrc, element.src || "");
        setInputValueIfIdle(refs.elX, String(Math.round(element.x)));
        setInputValueIfIdle(refs.elY, String(Math.round(element.y)));
        setInputValueIfIdle(refs.elW, String(Math.round(element.w)));
        setInputValueIfIdle(refs.elH, String(Math.round(element.h)));
        setInputValueIfIdle(refs.elFontSize, String(Math.round(element.fontSize || 20)));
        setInputValueIfIdle(refs.elColor, element.color || "#ffffff");
        setInputValueIfIdle(refs.elBackground, element.background || "transparent");
    };
    const syncEditorPanel = () => {
        if (!state.editor.enabled || !state.editor.refs) {
            return;
        }

        const refs = state.editor.refs;
        const page = getCurrentPage();
        const icon = state.data.icons.find((item) => item.slug === state.currentSlug) || null;

        refs.iconSelect.innerHTML = "";
        state.data.icons.forEach((entry) => {
            const option = document.createElement("option");
            option.value = entry.slug;
            option.textContent = `${entry.title} (${entry.slug})`;
            option.selected = entry.slug === state.currentSlug;
            refs.iconSelect.appendChild(option);
        });

        setInputValueIfIdle(refs.apiInput, state.editor.apiBase || "");

        if (icon) {
            setInputValueIfIdle(refs.iconTitle, icon.title);
            setInputValueIfIdle(refs.iconSlug, icon.slug);
            setInputValueIfIdle(refs.iconMini, icon.mini);
            setInputValueIfIdle(refs.iconFull, icon.full);
        }

        if (page) {
            setInputValueIfIdle(refs.pageTitle, page.title);
            setInputValueIfIdle(refs.pageSubtitle, page.subtitle);
        }

        syncEditorSections();
        syncEditorElementFields();
    };

    const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(reader.error || new Error("Cannot read file"));
        reader.readAsDataURL(file);
    });

    const readImageDimensions = (src) => new Promise((resolve) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => resolve({ width: 320, height: 180 });
        image.src = src;
    });

    const openImagePicker = (callback) => {
        if (!state.editor.refs?.imageInput) {
            return;
        }
        state.editor.pendingFileAction = callback;
        state.editor.refs.imageInput.value = "";
        state.editor.refs.imageInput.click();
    };

    const renameCurrentIconSlug = (nextSlugRaw) => {
        const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
        if (!icon) {
            return;
        }

        const used = new Set(state.data.icons.map((entry) => entry.slug).filter((slug) => slug !== icon.slug));
        const nextSlug = uniqueSlug(nextSlugRaw, used);
        if (nextSlug === icon.slug) {
            return;
        }

        const oldSlug = icon.slug;
        icon.slug = nextSlug;
        state.data.pages[nextSlug] = normalizePage(state.data.pages[oldSlug], icon.title);
        delete state.data.pages[oldSlug];
        setCurrentSlug(nextSlug, true);
        saveLocalData();
        renderMain({ rebuildIcons: true, syncEditor: true });
    };

    const addIcon = () => {
        const used = new Set(state.data.icons.map((icon) => icon.slug));
        const slug = uniqueSlug("new-icon", used);
        const icon = { slug, title: "New Icon", mini: "", full: "" };
        state.data.icons.push(icon);
        state.data.pages[slug] = defaultPageFor(icon.title);
        setCurrentSlug(slug, true);
        saveLocalData();
        renderMain({ rebuildIcons: true, syncEditor: true });
    };

    const removeCurrentIcon = () => {
        if (state.data.icons.length <= 1) {
            setEditorStatus("Cannot remove the last icon.", true);
            return;
        }

        const index = state.data.icons.findIndex((icon) => icon.slug === state.currentSlug);
        if (index < 0) {
            return;
        }

        const removed = state.data.icons[index];
        state.data.icons.splice(index, 1);
        delete state.data.pages[removed.slug];

        const next = state.data.icons[Math.min(index, state.data.icons.length - 1)];
        setCurrentSlug(next?.slug || "", true);
        state.editor.selectedElementId = "";
        saveLocalData();
        renderMain({ rebuildIcons: true, syncEditor: true });
    };

    const moveCurrentIcon = (delta) => {
        const from = state.data.icons.findIndex((icon) => icon.slug === state.currentSlug);
        if (from < 0) {
            return;
        }

        const to = clamp(from + delta, 0, state.data.icons.length - 1);
        if (to === from) {
            return;
        }

        const [entry] = state.data.icons.splice(from, 1);
        state.data.icons.splice(to, 0, entry);
        saveLocalData();
        renderMain({ rebuildIcons: true, syncEditor: true });
    };

    const addTextElement = (x = 20, y = 20) => {
        const page = getCurrentPage();
        if (!page) {
            return;
        }

        const element = normalizeElement({
            id: nextElementId(page),
            type: "text",
            x,
            y,
            w: 260,
            h: 90,
            text: "New text",
            color: "#ffffff",
            background: "transparent",
            fontSize: 20
        }, page.elements.length);

        page.elements.push(element);
        state.editor.selectedElementId = element.id;
        saveLocalData();
        renderMain({ syncEditor: true });
    };

    const addImageElement = (src, x = 20, y = 20, width = 220, height = 140) => {
        const page = getCurrentPage();
        if (!page) {
            return;
        }

        const element = normalizeElement({
            id: nextElementId(page),
            type: "image",
            x,
            y,
            w: width,
            h: height,
            src
        }, page.elements.length);

        page.elements.push(element);
        state.editor.selectedElementId = element.id;
        saveLocalData();
        renderMain({ syncEditor: true });
    };

    const removeSelectedElement = () => {
        const page = getCurrentPage();
        if (!page) {
            return;
        }

        const index = page.elements.findIndex((element) => element.id === state.editor.selectedElementId);
        if (index < 0) {
            return;
        }

        page.elements.splice(index, 1);
        state.editor.selectedElementId = page.elements[Math.max(0, index - 1)]?.id || "";
        saveLocalData();
        renderMain({ syncEditor: true });
    };

    const createEditorPanel = () => {
        if (state.editor.panel) {
            return;
        }

        const panel = document.createElement("aside");
        panel.className = "site-editor-panel is-hidden";
        panel.innerHTML = `
            <div class="site-editor-head">
                <strong>Inline Editor</strong>
                <button type="button" data-editor-close>Close</button>
            </div>
            <p class="site-editor-status" data-editor-status>Editor ready.</p>
            <div class="site-editor-group">
                <label>Backend URL</label>
                <input type="text" data-editor-api>
                <div class="site-editor-row">
                    <button type="button" data-editor-connect>Connect</button>
                    <button type="button" data-editor-save-backend>Save</button>
                    <button type="button" data-editor-logout>Logout</button>
                </div>
            </div>
            <div class="site-editor-group">
                <label>Current Icon</label>
                <select data-editor-icon-select></select>
                <div class="site-editor-row">
                    <button type="button" data-editor-icon-add>Add</button>
                    <button type="button" data-editor-icon-up>Up</button>
                    <button type="button" data-editor-icon-down>Down</button>
                    <button type="button" data-editor-icon-remove>Remove</button>
                </div>
                <input type="text" placeholder="Icon title" data-editor-icon-title>
                <div class="site-editor-row">
                    <input type="text" placeholder="Icon slug" data-editor-icon-slug>
                    <button type="button" data-editor-icon-apply-slug>Apply</button>
                </div>
                <div class="site-editor-row">
                    <input type="text" placeholder="Mini icon src" data-editor-icon-mini>
                    <button type="button" data-editor-upload-mini>Upload</button>
                </div>
                <div class="site-editor-row">
                    <input type="text" placeholder="Full icon src" data-editor-icon-full>
                    <button type="button" data-editor-upload-full>Upload</button>
                </div>
            </div>
            <div class="site-editor-group">
                <label>Page Title</label>
                <input type="text" data-editor-page-title>
                <label>Subtitle</label>
                <textarea rows="3" data-editor-page-subtitle></textarea>
                <div class="site-editor-row">
                    <button type="button" data-editor-add-section>Add section</button>
                </div>
                <div data-editor-sections></div>
            </div>
            <div class="site-editor-group">
                <div class="site-editor-row">
                    <button type="button" data-editor-place-text>Place text</button>
                    <button type="button" data-editor-place-image>Place image</button>
                    <button type="button" data-editor-remove-element>Remove element</button>
                </div>
                <p class="site-editor-meta" data-editor-element-meta>No selected element</p>
                <div data-editor-element-text-wrap>
                    <label>Text</label>
                    <textarea rows="3" data-editor-element-text></textarea>
                </div>
                <div data-editor-element-src-wrap>
                    <label>Image src</label>
                    <input type="text" data-editor-element-src>
                </div>
                <div class="site-editor-grid">
                    <input type="number" placeholder="x" data-editor-el-x>
                    <input type="number" placeholder="y" data-editor-el-y>
                    <input type="number" placeholder="w" data-editor-el-w>
                    <input type="number" placeholder="h" data-editor-el-h>
                </div>
                <div class="site-editor-grid">
                    <input type="number" placeholder="font" data-editor-el-font-size>
                    <input type="text" placeholder="color" data-editor-el-color>
                    <input type="text" placeholder="background" data-editor-el-background>
                </div>
            </div>
        `;

        const imageInput = document.createElement("input");
        imageInput.type = "file";
        imageInput.accept = "image/*";
        imageInput.className = "site-editor-hidden-input";
        imageInput.addEventListener("change", async () => {
            const file = imageInput.files?.[0];
            imageInput.value = "";
            if (!file || typeof state.editor.pendingFileAction !== "function") {
                state.editor.pendingFileAction = null;
                return;
            }

            const callback = state.editor.pendingFileAction;
            state.editor.pendingFileAction = null;

            try {
                const src = await readFileAsDataUrl(file);
                const dimensions = await readImageDimensions(src);
                callback({ src, width: dimensions.width, height: dimensions.height, name: file.name });
            } catch (error) {
                setEditorStatus(`Image load failed: ${String(error?.message || error)}`, true);
            }
        });
        panel.appendChild(imageInput);

        document.body.appendChild(panel);
        state.editor.panel = panel;

        const q = (selector) => panel.querySelector(selector);
        state.editor.refs = {
            status: q("[data-editor-status]"),
            apiInput: q("[data-editor-api]"),
            iconSelect: q("[data-editor-icon-select]"),
            iconTitle: q("[data-editor-icon-title]"),
            iconSlug: q("[data-editor-icon-slug]"),
            iconMini: q("[data-editor-icon-mini]"),
            iconFull: q("[data-editor-icon-full]"),
            pageTitle: q("[data-editor-page-title]"),
            pageSubtitle: q("[data-editor-page-subtitle]"),
            sectionsWrap: q("[data-editor-sections]"),
            elementMeta: q("[data-editor-element-meta]"),
            elementTextWrap: q("[data-editor-element-text-wrap]"),
            elementSrcWrap: q("[data-editor-element-src-wrap]"),
            elText: q("[data-editor-element-text]"),
            elSrc: q("[data-editor-element-src]"),
            elX: q("[data-editor-el-x]"),
            elY: q("[data-editor-el-y]"),
            elW: q("[data-editor-el-w]"),
            elH: q("[data-editor-el-h]"),
            elFontSize: q("[data-editor-el-font-size]"),
            elColor: q("[data-editor-el-color]"),
            elBackground: q("[data-editor-el-background]"),
            imageInput
        };

        q("[data-editor-close]").addEventListener("click", () => {
            disableEditor();
        });

        q("[data-editor-connect]").addEventListener("click", async () => {
            const nextBase = normalizeApiBase(state.editor.refs.apiInput.value);
            if (!nextBase) {
                setEditorStatus("Backend URL is invalid.", true);
                return;
            }
            state.editor.apiBase = nextBase;
            localStorage.setItem(BACKEND_URL_STORAGE_KEY, nextBase);
            const ok = await requestEditorAccess(false);
            if (ok) {
                setEditorStatus("Connected and authorized.");
            }
        });

        q("[data-editor-save-backend]").addEventListener("click", async () => {
            await saveToBackend();
        });

        q("[data-editor-logout]").addEventListener("click", async () => {
            await logoutEditorSession();
        });

        state.editor.refs.iconSelect.addEventListener("change", () => {
            setCurrentSlug(state.editor.refs.iconSelect.value, true);
            state.editor.selectedElementId = "";
            renderMain({ syncEditor: true });
        });

        q("[data-editor-icon-add]").addEventListener("click", () => {
            addIcon();
            setEditorStatus("Icon added.");
        });

        q("[data-editor-icon-up]").addEventListener("click", () => moveCurrentIcon(-1));
        q("[data-editor-icon-down]").addEventListener("click", () => moveCurrentIcon(1));
        q("[data-editor-icon-remove]").addEventListener("click", () => removeCurrentIcon());

        state.editor.refs.iconTitle.addEventListener("input", () => {
            const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
            const page = getCurrentPage();
            if (!icon || !page) {
                return;
            }

            const oldTitle = icon.title;
            icon.title = state.editor.refs.iconTitle.value;
            if (page.title === oldTitle) {
                page.title = icon.title;
            }
            saveLocalData();
            renderMain({ rebuildIcons: true });
        });

        q("[data-editor-icon-apply-slug]").addEventListener("click", () => {
            renameCurrentIconSlug(state.editor.refs.iconSlug.value);
            setEditorStatus("Icon slug updated.");
        });

        state.editor.refs.iconMini.addEventListener("input", () => {
            const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
            if (!icon) {
                return;
            }
            icon.mini = state.editor.refs.iconMini.value;
            saveLocalData();
            renderMain({ rebuildIcons: true, syncEditor: true });
        });

        state.editor.refs.iconFull.addEventListener("input", () => {
            const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
            if (!icon) {
                return;
            }
            icon.full = state.editor.refs.iconFull.value;
            saveLocalData();
            renderMain({ rebuildIcons: true, syncEditor: true });
        });

        q("[data-editor-upload-mini]").addEventListener("click", () => {
            openImagePicker(({ src }) => {
                const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
                if (!icon) {
                    return;
                }
                icon.mini = src;
                saveLocalData();
                renderMain({ rebuildIcons: true, syncEditor: true });
            });
        });

        q("[data-editor-upload-full]").addEventListener("click", () => {
            openImagePicker(({ src }) => {
                const icon = state.data.icons.find((entry) => entry.slug === state.currentSlug);
                if (!icon) {
                    return;
                }
                icon.full = src;
                saveLocalData();
                renderMain({ rebuildIcons: true, syncEditor: true });
            });
        });

        state.editor.refs.pageTitle.addEventListener("input", () => {
            const page = getCurrentPage();
            if (!page) {
                return;
            }
            page.title = state.editor.refs.pageTitle.value;
            saveLocalData();
            renderMain();
        });

        state.editor.refs.pageSubtitle.addEventListener("input", () => {
            const page = getCurrentPage();
            if (!page) {
                return;
            }
            page.subtitle = state.editor.refs.pageSubtitle.value;
            saveLocalData();
            renderMain();
        });

        q("[data-editor-add-section]").addEventListener("click", () => {
            const page = getCurrentPage();
            if (!page) {
                return;
            }
            page.sections.push({ heading: "New section", body: "Section text" });
            saveLocalData();
            renderMain({ syncEditor: true });
        });

        q("[data-editor-place-text]").addEventListener("click", () => {
            state.editor.placeMode = { type: "text" };
            setEditorStatus("Click on canvas to place text.");
        });

        q("[data-editor-place-image]").addEventListener("click", () => {
            openImagePicker(({ src, width, height, name }) => {
                const fit = fitImageSize(width, height);
                state.editor.placeMode = {
                    type: "image",
                    src,
                    width: fit.w,
                    height: fit.h
                };
                setEditorStatus(`Click on canvas to place image (${name}).`);
            });
        });

        q("[data-editor-remove-element]").addEventListener("click", () => {
            removeSelectedElement();
        });

        state.editor.refs.elText.addEventListener("input", () => {
            const element = getSelectedElement();
            if (!element || element.type !== "text") {
                return;
            }
            element.text = state.editor.refs.elText.value;
            saveLocalData();
            renderMain();
        });

        state.editor.refs.elSrc.addEventListener("input", () => {
            const element = getSelectedElement();
            if (!element || element.type !== "image") {
                return;
            }
            element.src = state.editor.refs.elSrc.value;
            saveLocalData();
            renderMain();
        });
        const bindNumericField = (input, apply) => {
            input.addEventListener("input", () => {
                const element = getSelectedElement();
                if (!element) {
                    return;
                }
                const numeric = Number(input.value);
                if (!Number.isFinite(numeric)) {
                    return;
                }
                apply(element, numeric);
                saveLocalData();
                renderMain();
            });
        };

        bindNumericField(state.editor.refs.elX, (element, value) => {
            const page = getCurrentPage();
            if (!page) {
                return;
            }
            element.x = clamp(Math.round(value), 0, Math.max(0, page.canvas.width - element.w));
        });

        bindNumericField(state.editor.refs.elY, (element, value) => {
            const page = getCurrentPage();
            if (!page) {
                return;
            }
            element.y = clamp(Math.round(value), 0, Math.max(0, page.canvas.height - element.h));
        });

        bindNumericField(state.editor.refs.elW, (element, value) => {
            element.w = Math.max(20, Math.round(value));
        });

        bindNumericField(state.editor.refs.elH, (element, value) => {
            element.h = Math.max(20, Math.round(value));
        });

        bindNumericField(state.editor.refs.elFontSize, (element, value) => {
            element.fontSize = Math.max(10, Math.round(value));
        });

        state.editor.refs.elColor.addEventListener("input", () => {
            const element = getSelectedElement();
            if (!element || element.type !== "text") {
                return;
            }
            element.color = state.editor.refs.elColor.value;
            saveLocalData();
            renderMain();
        });

        state.editor.refs.elBackground.addEventListener("input", () => {
            const element = getSelectedElement();
            if (!element || element.type !== "text") {
                return;
            }
            element.background = state.editor.refs.elBackground.value;
            saveLocalData();
            renderMain();
        });
    };

    const enableEditor = () => {
        if (!isIndexPage()) {
            return;
        }

        createEditorPanel();
        state.editor.enabled = true;
        state.editor.panel.classList.remove("is-hidden");
        state.editor.placeMode = null;
        state.editor.selectedElementId = "";
        setEditorStatus("Editor enabled.");
        initCanvasInteractions();
        renderMain({ syncEditor: true });
    };

    const disableEditor = () => {
        state.editor.enabled = false;
        state.editor.placeMode = null;
        state.editor.drag = null;
        state.editor.selectedElementId = "";

        if (state.editor.panel) {
            state.editor.panel.classList.add("is-hidden");
        }

        renderMain();
    };

    const isMixedContentBlocked = (apiBase) => (
        window.location.protocol === "https:" && String(apiBase || "").startsWith("http://")
    );

    const describeConnectionError = (apiBase, error) => {
        if (isMixedContentBlocked(apiBase)) {
            return [
                "Browser blocked request: HTTPS page cannot call HTTP backend.",
                "Use HTTPS backend URL.",
                `Current backend URL: ${apiBase}`
            ].join("\n");
        }

        return [
            `Cannot connect to backend: ${apiBase}`,
            "Check backend status and URL.",
            `Error: ${String(error?.message || error)}`
        ].join("\n");
    };

    const apiFetch = async (path, init = {}) => {
        const apiBase = state.editor.apiBase;
        if (!apiBase) {
            throw new Error("Backend URL is empty");
        }

        const headers = { ...(init.headers || {}) };
        if (init.body !== undefined && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        return fetch(`${apiBase}${path}`, {
            ...init,
            headers,
            credentials: "include"
        });
    };

    const requestEditorAccess = async (askForKey = true) => {
        if (!state.editor.apiBase) {
            const entered = window.prompt("Backend URL:", DEFAULT_BACKEND_URL);
            if (entered === null) {
                return false;
            }
            const normalized = normalizeApiBase(entered);
            if (!normalized) {
                alert("Backend URL is invalid.");
                return false;
            }
            state.editor.apiBase = normalized;
            localStorage.setItem(BACKEND_URL_STORAGE_KEY, normalized);
        }

        if (isMixedContentBlocked(state.editor.apiBase)) {
            alert(describeConnectionError(state.editor.apiBase, new Error("Mixed content")));
            return false;
        }

        try {
            const sessionResponse = await apiFetch("/api/editor/session");
            const sessionPayload = await sessionResponse.json().catch(() => ({}));
            if (sessionResponse.ok && sessionPayload?.authorized) {
                state.editor.authorized = true;
                setEditorStatus("Authorized via cookie session.");
                return true;
            }

            if (!askForKey) {
                state.editor.authorized = false;
                return false;
            }

            const key = window.prompt("Enter editor key:");
            if (!key) {
                return false;
            }

            const authResponse = await apiFetch("/api/editor/auth", {
                method: "POST",
                body: JSON.stringify({ key })
            });
            const authPayload = await authResponse.json().catch(() => ({}));

            if (!authResponse.ok || !authPayload?.ok) {
                alert(`Editor access denied: ${authPayload?.error || "Invalid key"}`);
                state.editor.authorized = false;
                return false;
            }

            state.editor.authorized = true;
            setEditorStatus("Authorization successful.");
            return true;
        } catch (error) {
            alert(describeConnectionError(state.editor.apiBase, error));
            state.editor.authorized = false;
            return false;
        }
    };

    const saveToBackend = async () => {
        if (!state.editor.enabled) {
            return false;
        }

        const ok = await requestEditorAccess(false);
        if (!ok) {
            setEditorStatus("Not authorized. Press Connect or F9 x2.", true);
            return false;
        }

        try {
            const response = await apiFetch("/api/editor/data", {
                method: "PUT",
                body: JSON.stringify({ data: state.data })
            });
            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                setEditorStatus(`Save failed: ${payload?.error || `HTTP ${response.status}`}`, true);
                return false;
            }

            saveLocalData();
            setEditorStatus("Saved to backend.");
            return true;
        } catch (error) {
            setEditorStatus(`Save failed: ${String(error?.message || error)}`, true);
            return false;
        }
    };

    const logoutEditorSession = async () => {
        if (!state.editor.apiBase) {
            return;
        }

        try {
            await apiFetch("/api/editor/logout", { method: "POST" });
        } catch (_error) {
            // Ignore.
        }

        state.editor.authorized = false;
        setEditorStatus("Logged out.");
    };
    const findElementAt = (page, x, y) => {
        for (let i = page.elements.length - 1; i >= 0; i -= 1) {
            const element = page.elements[i];
            if (x >= element.x && x <= element.x + element.w && y >= element.y && y <= element.y + element.h) {
                return element;
            }
        }
        return null;
    };

    const initCanvasInteractions = () => {
        if (state.editor.canvasBound || !isIndexPage()) {
            return;
        }

        state.editor.canvasBound = true;
        const canvas = state.refs.index.canvas;

        const toCanvasPosition = (event) => {
            const rect = canvas.getBoundingClientRect();
            return {
                x: event.clientX - rect.left,
                y: event.clientY - rect.top
            };
        };

        canvas.addEventListener("mousedown", (event) => {
            if (!state.editor.enabled || event.button !== 0) {
                return;
            }

            const page = getCurrentPage();
            if (!page) {
                return;
            }

            const point = toCanvasPosition(event);
            if (point.x < 0 || point.y < 0 || point.x > page.canvas.width || point.y > page.canvas.height) {
                return;
            }

            if (state.editor.placeMode?.type === "text") {
                addTextElement(point.x, point.y);
                state.editor.placeMode = null;
                setEditorStatus("Text placed.");
                return;
            }

            if (state.editor.placeMode?.type === "image") {
                addImageElement(
                    state.editor.placeMode.src,
                    point.x,
                    point.y,
                    state.editor.placeMode.width,
                    state.editor.placeMode.height
                );
                state.editor.placeMode = null;
                setEditorStatus("Image placed.");
                return;
            }

            const hitNode = event.target.closest(".free-item");
            const hitId = hitNode?.dataset.elementId;
            if (hitId) {
                const hitElement = findElementAt(page, point.x, point.y);
                const element = hitElement || page.elements.find((item) => item.id === hitId);
                if (!element) {
                    return;
                }

                state.editor.selectedElementId = element.id;
                state.editor.drag = {
                    id: element.id,
                    offsetX: point.x - element.x,
                    offsetY: point.y - element.y
                };
                renderMain({ syncEditor: true });
                event.preventDefault();
                return;
            }

            state.editor.selectedElementId = "";
            renderMain({ syncEditor: true });
        });

        document.addEventListener("mousemove", (event) => {
            if (!state.editor.enabled || !state.editor.drag) {
                return;
            }

            const page = getCurrentPage();
            if (!page) {
                return;
            }

            const element = page.elements.find((item) => item.id === state.editor.drag.id);
            if (!element) {
                return;
            }

            const point = toCanvasPosition(event);
            const nextX = clamp(Math.round(point.x - state.editor.drag.offsetX), 0, Math.max(0, page.canvas.width - element.w));
            const nextY = clamp(Math.round(point.y - state.editor.drag.offsetY), 0, Math.max(0, page.canvas.height - element.h));

            if (nextX !== element.x || nextY !== element.y) {
                element.x = nextX;
                element.y = nextY;
                saveLocalData();
                renderMain();
                syncEditorElementFields();
            }
        });

        document.addEventListener("mouseup", () => {
            if (!state.editor.drag) {
                return;
            }
            state.editor.drag = null;
            syncEditorElementFields();
        });
    };

    const initHotkey = () => {
        if (!isIndexPage()) {
            return;
        }

        window.addEventListener("keydown", (event) => {
            if (event.key !== "F9" || event.repeat) {
                return;
            }

            event.preventDefault();

            const now = Date.now();
            if (now - state.editor.lastF9At <= DOUBLE_F9_MS) {
                state.editor.lastF9At = 0;
                void (async () => {
                    if (state.editor.enabled) {
                        disableEditor();
                        return;
                    }

                    const granted = await requestEditorAccess(true);
                    if (granted) {
                        enableEditor();
                    }
                })();
                return;
            }

            state.editor.lastF9At = now;
        });
    };

    const fetchPublicData = async () => {
        if (!state.editor.apiBase || isMixedContentBlocked(state.editor.apiBase)) {
            return null;
        }

        try {
            const response = await apiFetch("/api/site-data");
            if (!response.ok) {
                return null;
            }

            const payload = await response.json().catch(() => ({}));
            return payload?.data || null;
        } catch (_error) {
            return null;
        }
    };

    const bootstrap = async () => {
        const localData = loadLocalData();
        const initial = normalizeData(window.SKILLBUILDER_DATA || localData || makeDefaultData());
        state.data = initial;

        const hashSlug = getSlugFromHash();
        const initialSlug = state.data.pages[hashSlug]
            ? hashSlug
            : state.data.icons[0]?.slug || "";
        setCurrentSlug(initialSlug, false);

        buildIconList();
        renderMain();

        if (isIndexPage()) {
            window.addEventListener("hashchange", () => {
                const slug = getSlugFromHash();
                if (state.data.pages[slug]) {
                    setCurrentSlug(slug, false);
                    renderMain({ syncEditor: true });
                }
            });
        }

        if (isStandalonePage()) {
            window.addEventListener("hashchange", () => {
                renderStandalone();
            });
        }

        const remote = await fetchPublicData();
        if (remote) {
            state.data = normalizeData(remote);
            ensureCurrentSlug();
            if (!state.data.pages[state.currentSlug]) {
                setCurrentSlug(state.data.icons[0]?.slug || "", false);
            }
            saveLocalData();
            renderMain({ rebuildIcons: true, syncEditor: true });
        }

        initHotkey();
    };

    bootstrap();
})();
