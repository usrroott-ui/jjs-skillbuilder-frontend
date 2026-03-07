(() => {
    const LEGACY_LOCAL_DATA_KEY = "JJS_SKILLBUILDER_DATA";
    const LANG_STORAGE_KEY = "JJS_LANG";
    const DEFAULT_BACKEND_URL = "https://jjs-skillbuilder-editor-backend.onrender.com";

    const DEFAULT_CANVAS_WIDTH = 1200;
    const DEFAULT_CANVAS_HEIGHT = 420;
    const DEFAULT_PAGE_BOUNDARY_WIDTH = 1200;
    const DEFAULT_PAGE_BOUNDARY_HEIGHT = 420;

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
        if (!/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(candidate)) {
            candidate = `https://${candidate.replace(/^\/+/, "")}`;
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

    const normalizeIconLink = (value) => String(value || "").trim();
    const normalizeIconTopSpace = (value) => {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) {
            return 0;
        }
        return clamp(Math.round(numeric), 0, 2000);
    };
    const iconHasLink = (icon) => normalizeIconLink(icon?.url).length > 0;

    const defaultPageFor = (title) => ({
        title,
        subtitle: `Content page for ${title}.`,
        sections: [
            { heading: "Overview", body: `Main notes for ${title}.` },
            { heading: "Setup", body: `Configuration details and values for ${title}.` },
            { heading: "Tips", body: `Extra usage tips and practical combos for ${title}.` }
        ],
        canvas: { width: DEFAULT_CANVAS_WIDTH, height: DEFAULT_CANVAS_HEIGHT, background: "#1f1f1f", radius: 12 },
        layout: {
            fullWidth: false,
            boundaryWidth: DEFAULT_PAGE_BOUNDARY_WIDTH,
            boundaryHeight: DEFAULT_PAGE_BOUNDARY_HEIGHT
        },
        elements: []
    });

    const makeDefaultData = () => {
        const icons = DEFAULT_ICONS.map((icon) => ({
            ...icon,
            url: normalizeIconLink(icon?.url || ""),
            topSpace: normalizeIconTopSpace(icon?.topSpace ?? icon?.spaceBefore ?? icon?.offsetTop ?? icon?.offsetY ?? 0)
        }));
        const pages = {};
        icons.forEach((icon) => {
            if (!iconHasLink(icon)) {
                pages[icon.slug] = defaultPageFor(icon.title);
            }
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

    const extractLocalizedStringFields = (source, baseKey) => {
        const result = {};
        if (!source || typeof source !== "object") {
            return result;
        }

        const prefix = `${baseKey}_`;
        Object.keys(source).forEach((key) => {
            if (!key.startsWith(prefix)) {
                return;
            }
            const suffix = key.slice(prefix.length);
            if (!suffix) {
                return;
            }
            const value = source[key];
            result[key] = value == null ? "" : String(value);
        });

        return result;
    };

    const normalizeElement = (element, index) => {
        const rawType = String(element?.type || "");
        const type = rawType === "image" || rawType === "video" ? rawType : "text";
        const radiusRaw = Number(element?.radius ?? 8);
        const defaultW = type === "image" ? 240 : type === "video" ? 360 : 260;
        const defaultH = type === "image" ? 150 : type === "video" ? 202 : 90;

        return {
            id: String(element?.id || `el-${index + 1}`),
            type,
            x: Number(element?.x ?? 20),
            y: Number(element?.y ?? 20),
            w: Math.max(20, Number(element?.w ?? defaultW)),
            h: Math.max(20, Number(element?.h ?? defaultH)),
            radius: Number.isFinite(radiusRaw) ? Math.max(0, radiusRaw) : 8,
            text: String(element?.text ?? "Text"),
            ...extractLocalizedStringFields(element, "text"),
            color: String(element?.color ?? "#ffffff"),
            background: String(element?.background ?? "transparent"),
            fontSize: Math.max(10, Number(element?.fontSize ?? 20)),
            src: String(element?.src ?? "")
        };
    };

    const normalizePage = (page, fallbackTitle) => {
        const radiusRaw = Number(page?.canvas?.radius ?? 12);
        const boundaryWidthRaw = Number(page?.layout?.boundaryWidth ?? DEFAULT_PAGE_BOUNDARY_WIDTH);
        const boundaryHeightRaw = Number(page?.layout?.boundaryHeight ?? DEFAULT_PAGE_BOUNDARY_HEIGHT);
        const normalizedBoundaryWidth = Math.max(320, Number.isFinite(boundaryWidthRaw) ? boundaryWidthRaw : DEFAULT_PAGE_BOUNDARY_WIDTH);
        const normalizedBoundaryHeight = Math.max(220, Number.isFinite(boundaryHeightRaw) ? boundaryHeightRaw : DEFAULT_PAGE_BOUNDARY_HEIGHT);

        return {
            title: String(page?.title || fallbackTitle),
            ...extractLocalizedStringFields(page, "title"),
            subtitle: String(page?.subtitle || ""),
            ...extractLocalizedStringFields(page, "subtitle"),
            sections: Array.isArray(page?.sections)
                ? page.sections.map((section) => ({
                    heading: String(section?.heading || "Section"),
                    ...extractLocalizedStringFields(section, "heading"),
                    body: String(section?.body || ""),
                    ...extractLocalizedStringFields(section, "body")
                }))
                : [],
            canvas: {
                width: normalizedBoundaryWidth,
                height: normalizedBoundaryHeight,
                background: String(page?.canvas?.background || "#1f1f1f"),
                radius: Math.max(0, Number.isFinite(radiusRaw) ? radiusRaw : 12)
            },
            layout: {
                fullWidth: Boolean(page?.layout?.fullWidth),
                boundaryWidth: normalizedBoundaryWidth,
                boundaryHeight: normalizedBoundaryHeight
            },
            elements: Array.isArray(page?.elements)
                ? page.elements.map((item, idx) => normalizeElement(item, idx))
                : []
        };
    };

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
                full: String(icon?.full || ""),
                url: normalizeIconLink(icon?.url || icon?.link || ""),
                topSpace: normalizeIconTopSpace(icon?.topSpace ?? icon?.spaceBefore ?? icon?.offsetTop ?? icon?.offsetY ?? 0)
            };
        });

        const pages = {};
        icons.forEach((icon) => {
            if (!iconHasLink(icon)) {
                pages[icon.slug] = normalizePage(sourcePages[icon.slug], icon.title);
            }
        });

        return { icons, pages };
    };

    const state = {
        data: makeDefaultData(),
        currentSlug: "",
        lang: localStorage.getItem(LANG_STORAGE_KEY) || "en",
        indexLinks: [],
        refs: {
            index: {
                iconList: document.getElementById("iconList") || document.querySelector(".icon-list"),
                splitInner: document.querySelector(".split-inner"),
                title: document.getElementById("splitTitle"),
                subtitle: document.getElementById("splitSubtitle"),
                sections: document.getElementById("splitSections"),
                canvas: document.getElementById("splitFreeCanvas")
            },
            standalone: {
                card: document.querySelector(".page-card"),
                title: document.getElementById("pageTitle"),
                subtitle: document.getElementById("pageSubtitle"),
                sections: document.getElementById("pageSections"),
                canvas: document.getElementById("pageFreeCanvas")
            }
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

    const getLocalizedField = (obj, field) => {
        if (state.lang !== "en") {
            const localized = obj?.[`${field}_${state.lang}`];
            if (localized) {
                return localized;
            }
        }
        return obj?.[field] || "";
    };

    const getElementText = (element) => {
        if (state.lang !== "en") {
            const localized = element?.[`text_${state.lang}`];
            if (localized) {
                return localized;
            }
        }
        return element?.text || "";
    };

    const renderBootState = (title, subtitle, canvasMessage = "") => {
        if (isIndexPage()) {
            const refs = state.refs.index;
            refs.title.textContent = title;
            refs.subtitle.textContent = subtitle;
            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
            refs.canvas.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;
            refs.canvas.style.background = "#1f1f1f";
            refs.canvas.style.borderRadius = "12px";
            if (refs.splitInner) {
                refs.splitInner.classList.remove("is-full-width");
                refs.splitInner.style.maxWidth = `${DEFAULT_PAGE_BOUNDARY_WIDTH}px`;
            }
            if (canvasMessage) {
                const note = document.createElement("div");
                note.className = "boot-message";
                note.textContent = canvasMessage;
                refs.canvas.appendChild(note);
            }
        }

        if (isStandalonePage()) {
            const refs = state.refs.standalone;
            refs.title.textContent = title;
            refs.subtitle.textContent = subtitle;
            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
            refs.canvas.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;
            refs.canvas.style.background = "#1f1f1f";
            refs.canvas.style.borderRadius = "12px";
            if (refs.card) {
                refs.card.style.maxWidth = `${DEFAULT_PAGE_BOUNDARY_WIDTH}px`;
            }
            if (canvasMessage) {
                const note = document.createElement("div");
                note.className = "boot-message";
                note.textContent = canvasMessage;
                refs.canvas.appendChild(note);
            }
        }
    };

    const getSlugFromHash = () => window.location.hash.replace(/^#/, "");

    const ensureCurrentSlug = () => {
        if (!Array.isArray(state.data.icons) || state.data.icons.length === 0) {
            state.data = makeDefaultData();
        }

        state.data.icons.forEach((icon) => {
            icon.url = normalizeIconLink(icon.url);
            icon.topSpace = normalizeIconTopSpace(icon.topSpace ?? icon.spaceBefore ?? icon.offsetTop ?? icon.offsetY ?? 0);
            if (iconHasLink(icon)) {
                delete state.data.pages[icon.slug];
                return;
            }
            if (!state.data.pages[icon.slug]) {
                state.data.pages[icon.slug] = defaultPageFor(icon.title || "Page");
            }
        });

        if (!state.data.icons.some((icon) => icon.slug === state.currentSlug)) {
            state.currentSlug = state.data.icons[0]?.slug || "";
        }
    };

    const setCurrentSlug = (slug, syncHash = true) => {
        if (!slug || !state.data.icons.some((icon) => icon.slug === slug)) {
            return;
        }

        state.currentSlug = slug;
        if (syncHash && window.location.hash.replace(/^#/, "") !== slug) {
            window.location.hash = slug;
        }
    };

    const getCurrentIcon = () => state.data.icons.find((icon) => icon.slug === state.currentSlug) || null;

    const getCurrentPage = () => {
        const icon = getCurrentIcon();
        if (!icon || iconHasLink(icon)) {
            return null;
        }
        return state.data.pages[state.currentSlug] || null;
    };

    const clampElementsToCanvas = (page) => {
        if (!page) {
            return;
        }

        page.elements.forEach((element) => {
            element.w = clamp(Math.round(element.w), 20, page.canvas.width);
            element.h = clamp(Math.round(element.h), 20, page.canvas.height);
            element.x = clamp(Math.round(element.x), 0, Math.max(0, page.canvas.width - element.w));
            element.y = clamp(Math.round(element.y), 0, Math.max(0, page.canvas.height - element.h));
            element.radius = Math.max(0, Math.round(Number(element.radius || 0)));
        });
    };

    const syncCanvasToPageBoundary = (page) => {
        if (!page) {
            return;
        }

        if (!page.layout || typeof page.layout !== "object") {
            page.layout = {
                fullWidth: false,
                boundaryWidth: DEFAULT_PAGE_BOUNDARY_WIDTH,
                boundaryHeight: DEFAULT_PAGE_BOUNDARY_HEIGHT
            };
        }

        const boundaryWidth = Math.max(320, Math.round(Number(page.layout.boundaryWidth || DEFAULT_PAGE_BOUNDARY_WIDTH)));
        const boundaryHeight = Math.max(220, Math.round(Number(page.layout.boundaryHeight || DEFAULT_PAGE_BOUNDARY_HEIGHT)));
        page.layout.boundaryWidth = boundaryWidth;
        page.layout.boundaryHeight = boundaryHeight;
        page.layout.fullWidth = Boolean(page.layout.fullWidth);

        page.canvas.width = boundaryWidth;
        page.canvas.height = boundaryHeight;
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
            heading.textContent = getLocalizedField(section, "heading");

            const body = document.createElement("p");
            body.textContent = getLocalizedField(section, "body");

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
            node.style.left = `${element.x}px`;
            node.style.top = `${element.y}px`;
            node.style.width = `${element.w}px`;
            node.style.height = `${element.h}px`;
            node.style.borderRadius = `${Math.max(0, Number(element.radius || 0))}px`;

            if (element.type === "image") {
                const image = document.createElement("img");
                image.src = element.src || "";
                image.alt = "";
                node.appendChild(image);
            } else if (element.type === "video") {
                const video = document.createElement("video");
                video.src = element.src || "";
                video.controls = true;
                video.preload = "metadata";
                video.playsInline = true;
                node.appendChild(video);
            } else {
                node.textContent = getElementText(element);
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

        const icon = getCurrentIcon();
        const page = getCurrentPage();
        const refs = state.refs.index;

        if (!page) {
            if (icon && iconHasLink(icon)) {
                refs.title.textContent = icon.title || "External link";
                refs.subtitle.textContent = `This icon opens: ${normalizeIconLink(icon.url)}`;
            } else {
                refs.title.textContent = "Page not found";
                refs.subtitle.textContent = "No content for this page.";
            }

            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
            refs.canvas.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;
            refs.canvas.style.background = "#1f1f1f";
            refs.canvas.style.borderRadius = "12px";
            if (refs.splitInner) {
                refs.splitInner.classList.remove("is-full-width");
                refs.splitInner.style.maxWidth = `${DEFAULT_PAGE_BOUNDARY_WIDTH}px`;
            }
        } else {
            refs.title.textContent = getLocalizedField(page, "title");
            refs.subtitle.textContent = getLocalizedField(page, "subtitle");
            syncCanvasToPageBoundary(page);
            clampElementsToCanvas(page);
            renderSections(refs.sections, page.sections, "split-section");

            if (refs.splitInner) {
                const fullWidth = Boolean(page.layout?.fullWidth);
                refs.splitInner.classList.toggle("is-full-width", fullWidth);
                refs.splitInner.style.maxWidth = fullWidth ? "none" : `${page.layout.boundaryWidth}px`;
            }

            refs.canvas.style.width = `${page.canvas.width}px`;
            refs.canvas.style.height = `${page.canvas.height}px`;
            refs.canvas.style.background = page.canvas.background;
            refs.canvas.style.borderRadius = `${Math.max(0, Number(page.canvas.radius || 0))}px`;
            renderElements(refs.canvas, page);
        }

        state.indexLinks.forEach((link) => {
            link.classList.toggle("active", link.dataset.slug === state.currentSlug);
        });
    };

    const renderStandalone = () => {
        if (!isStandalonePage()) {
            return;
        }

        const slug = getSlugFromHash() || state.currentSlug || state.data.icons[0]?.slug || "";
        const icon = state.data.icons.find((entry) => entry.slug === slug) || null;
        const page = icon && !iconHasLink(icon) ? state.data.pages[slug] : null;
        const refs = state.refs.standalone;

        if (!page) {
            refs.title.textContent = icon && iconHasLink(icon) ? icon.title : "Page not found";
            refs.subtitle.textContent = icon && iconHasLink(icon)
                ? "This icon uses external link and has no internal page."
                : "No content for this page.";
            refs.sections.innerHTML = "";
            refs.canvas.innerHTML = "";
            refs.canvas.style.width = `${DEFAULT_CANVAS_WIDTH}px`;
            refs.canvas.style.height = `${DEFAULT_CANVAS_HEIGHT}px`;
            refs.canvas.style.background = "#1f1f1f";
            refs.canvas.style.borderRadius = "12px";
            if (refs.card) {
                refs.card.style.maxWidth = `${DEFAULT_PAGE_BOUNDARY_WIDTH}px`;
            }
            return;
        }

        refs.title.textContent = getLocalizedField(page, "title");
        refs.subtitle.textContent = getLocalizedField(page, "subtitle");
        syncCanvasToPageBoundary(page);
        clampElementsToCanvas(page);
        renderSections(refs.sections, page.sections, "page-section");

        if (refs.card) {
            const fullWidth = Boolean(page.layout?.fullWidth);
            refs.card.style.maxWidth = fullWidth ? "none" : `${page.layout.boundaryWidth}px`;
        }

        refs.canvas.style.width = `${page.canvas.width}px`;
        refs.canvas.style.height = `${page.canvas.height}px`;
        refs.canvas.style.background = page.canvas.background;
        refs.canvas.style.borderRadius = `${Math.max(0, Number(page.canvas.radius || 0))}px`;
        renderElements(refs.canvas, page);
        document.title = `${getLocalizedField(page, "title") || page.title} | JJS Skillbuilder`;
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
            const topSpace = normalizeIconTopSpace(icon.topSpace);
            link.style.marginTop = topSpace > 0 ? `${topSpace}px` : "";
            const targetUrl = normalizeIconLink(icon.url);
            link.href = targetUrl || `page.html#${icon.slug}`;
            link.title = icon.title;
            link.dataset.slug = icon.slug;
            if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
                link.rel = "noopener noreferrer";
            }

            const img = document.createElement("img");
            img.src = icon.mini;
            img.alt = icon.title;
            img.dataset.full = icon.full;

            link.appendChild(img);
            state.refs.index.iconList.appendChild(link);
            state.indexLinks.push(link);

            if (!iconHasLink(icon)) {
                link.addEventListener("click", (event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
                        return;
                    }
                    event.preventDefault();
                    setCurrentSlug(icon.slug, true);
                    renderMain();
                });
            }
        });
    };

    const renderMain = ({ rebuildIcons = false } = {}) => {
        ensureCurrentSlug();
        publishGlobals();

        if (rebuildIcons) {
            buildIconList();
        }

        renderIndexPanel();
        renderStandalone();
    };

    const fetchPublicData = async (apiBase) => {
        if (!apiBase) {
            return null;
        }

        try {
            const response = await fetch(`${apiBase}/api/site-data`);
            if (!response.ok) {
                return null;
            }
            const payload = await response.json().catch(() => ({}));
            return payload?.data || null;
        } catch (_error) {
            return null;
        }
    };

    const initLangSwitch = () => {
        const switchEl = document.getElementById("langSwitch");
        const btn = document.getElementById("langBtn");
        const menu = document.getElementById("langMenu");
        if (!switchEl || !btn || !menu) {
            return;
        }

        btn.textContent = state.lang.toUpperCase();

        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            switchEl.classList.toggle("is-open");
        });

        menu.addEventListener("click", (e) => {
            const option = e.target.closest("[data-lang]");
            if (!option) {
                return;
            }

            const lang = option.dataset.lang;
            if (!lang || lang === state.lang) {
                switchEl.classList.remove("is-open");
                return;
            }

            state.lang = lang;
            localStorage.setItem(LANG_STORAGE_KEY, lang);
            btn.textContent = lang.toUpperCase();
            switchEl.classList.remove("is-open");

            if (isIndexPage()) {
                renderMain();
            }
            if (isStandalonePage()) {
                renderStandalone();
            }
        });

        document.addEventListener("click", () => {
            switchEl.classList.remove("is-open");
        });
    };

    const connectLiveStream = (apiBase) => {
        if (!apiBase) {
            return;
        }

        const source = new EventSource(`${apiBase}/api/site-data/stream`);
        source.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (!payload?.ok || !payload?.data) {
                    return;
                }

                state.data = normalizeData(payload.data);
                ensureCurrentSlug();

                if (isIndexPage()) {
                    buildIconList();
                    renderMain();
                }
                if (isStandalonePage()) {
                    renderStandalone();
                }
            } catch (_error) {
                // Ignore malformed events.
            }
        };

        source.onerror = () => {
            source.close();
            setTimeout(() => connectLiveStream(apiBase), 5000);
        };
    };

    const bootstrap = async () => {
        const apiBase = normalizeApiBase(DEFAULT_BACKEND_URL);
        renderBootState(
            "Activating site...",
            "The backend is waking up on Render. Please wait a few seconds.",
            "Activating site..."
        );
        const remoteData = await fetchPublicData(apiBase);
        const initial = normalizeData(remoteData || window.SKILLBUILDER_DATA || makeDefaultData());
        state.data = initial;

        // Remove legacy per-browser cache so content is never sourced from local storage.
        try {
            localStorage.removeItem(LEGACY_LOCAL_DATA_KEY);
        } catch (_error) {
            // ignore
        }

        const hashSlug = getSlugFromHash();
        const initialSlug = state.data.icons.some((icon) => icon.slug === hashSlug)
            ? hashSlug
            : state.data.icons[0]?.slug || "";

        setCurrentSlug(initialSlug, false);

        if (isIndexPage()) {
            buildIconList();
            renderMain();
            window.addEventListener("hashchange", () => {
                const slug = getSlugFromHash();
                if (state.data.icons.some((icon) => icon.slug === slug)) {
                    setCurrentSlug(slug, false);
                    renderMain();
                }
            });
        }

        if (isStandalonePage()) {
            renderStandalone();
            window.addEventListener("hashchange", () => {
                renderStandalone();
            });
        }

        initLangSwitch();
        connectLiveStream(apiBase);
    };

    bootstrap();
})();
