(() => {
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
        const pages = {};
        DEFAULT_ICONS.forEach((icon) => {
            pages[icon.slug] = defaultPageFor(icon.title);
        });
        return { icons: DEFAULT_ICONS, pages };
    };

    const normalizeElement = (element, index) => ({
        id: String(element?.id || `el-${index}`),
        type: element?.type === "image" ? "image" : "text",
        x: Number(element?.x ?? 20),
        y: Number(element?.y ?? 20),
        w: Math.max(20, Number(element?.w ?? 220)),
        h: Math.max(20, Number(element?.h ?? 80)),
        text: String(element?.text ?? "Text"),
        color: String(element?.color ?? "#ffffff"),
        background: String(element?.background ?? "transparent"),
        fontSize: Math.max(10, Number(element?.fontSize ?? 20)),
        src: String(element?.src ?? "")
    });

    const normalizePage = (page, fallbackTitle) => ({
        title: String(page?.title || fallbackTitle),
        subtitle: String(page?.subtitle || ""),
        sections: Array.isArray(page?.sections)
            ? page.sections.map((s) => ({
                heading: String(s?.heading || "Section"),
                body: String(s?.body || "")
            }))
            : [],
        canvas: {
            width: Math.max(320, Number(page?.canvas?.width ?? 980)),
            height: Math.max(220, Number(page?.canvas?.height ?? 420)),
            background: String(page?.canvas?.background || "#1f1f1f")
        },
        elements: Array.isArray(page?.elements)
            ? page.elements.map((el, i) => normalizeElement(el, i))
            : []
    });

    const normalizeData = (rawData) => {
        const defaults = makeDefaultData();
        const icons = Array.isArray(rawData?.icons) ? rawData.icons : defaults.icons;
        const pages = { ...defaults.pages };

        icons.forEach((icon, index) => {
            const slug = String(icon?.slug || `icon-${index + 1}`);
            const title = String(icon?.title || slug);
            icon.slug = slug;
            icon.title = title;
            icon.mini = String(icon?.mini || "");
            icon.full = String(icon?.full || "");

            pages[slug] = normalizePage(rawData?.pages?.[slug], title);
        });

        return { icons, pages };
    };

    const STORAGE_KEY = "JJS_SKILLBUILDER_DATA";

    let storageOverride = null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            storageOverride = JSON.parse(raw);
        }
    } catch (_error) {
        storageOverride = null;
    }

    const DATA = normalizeData(window.SKILLBUILDER_DATA || storageOverride || makeDefaultData());
    window.SKILLBUILDER_DATA = DATA;
    window.SKILLBUILDER_PAGES = DATA.pages;

    const iconListEl = document.getElementById("iconList") || document.querySelector(".icon-list");

    const buildIconList = () => {
        if (!iconListEl) {
            return [];
        }

        iconListEl.innerHTML = "";
        const links = [];

        DATA.icons.forEach((icon) => {
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
            iconListEl.appendChild(link);
            links.push(link);
        });

        return links;
    };

    const renderElements = (container, elements) => {
        if (!container) {
            return;
        }

        container.innerHTML = "";

        elements.forEach((element) => {
            const node = document.createElement("div");
            node.className = `free-item ${element.type}`;
            node.style.left = `${element.x}px`;
            node.style.top = `${element.y}px`;
            node.style.width = `${element.w}px`;
            node.style.height = `${element.h}px`;

            if (element.type === "image") {
                const img = document.createElement("img");
                img.src = element.src || "";
                img.alt = "";
                node.appendChild(img);
            } else {
                node.textContent = element.text;
                node.style.color = element.color;
                node.style.background = element.background;
                node.style.fontSize = `${element.fontSize}px`;
            }

            container.appendChild(node);
        });
    };

    const renderPageInto = (slug, refs) => {
        const page = DATA.pages[slug];
        if (!page) {
            if (refs.title) refs.title.textContent = "Page not found";
            if (refs.subtitle) refs.subtitle.textContent = "No content for this slug in page.js.";
            if (refs.sections) refs.sections.innerHTML = "";
            if (refs.canvas) {
                refs.canvas.style.width = "980px";
                refs.canvas.style.height = "420px";
                refs.canvas.style.background = "#1f1f1f";
                refs.canvas.innerHTML = "";
            }
            return;
        }

        if (refs.title) refs.title.textContent = page.title;
        if (refs.subtitle) refs.subtitle.textContent = page.subtitle;

        if (refs.sections) {
            refs.sections.innerHTML = "";
            page.sections.forEach((section) => {
                const card = document.createElement("article");
                card.className = refs.sectionClass || "split-section";

                const heading = document.createElement("h3");
                heading.textContent = section.heading;

                const body = document.createElement("p");
                body.textContent = section.body;

                card.appendChild(heading);
                card.appendChild(body);
                refs.sections.appendChild(card);
            });
        }

        if (refs.canvas) {
            refs.canvas.style.width = `${page.canvas.width}px`;
            refs.canvas.style.height = `${page.canvas.height}px`;
            refs.canvas.style.background = page.canvas.background;
            renderElements(refs.canvas, page.elements);
        }
    };

    const initIndexSplitPanel = () => {
        const links = buildIconList();
        if (links.length === 0) {
            return;
        }

        const refs = {
            title: document.getElementById("splitTitle"),
            subtitle: document.getElementById("splitSubtitle"),
            sections: document.getElementById("splitSections"),
            canvas: document.getElementById("splitFreeCanvas"),
            sectionClass: "split-section"
        };

        if (!refs.title || !refs.subtitle || !refs.sections || !refs.canvas) {
            return;
        }

        const setActive = (slug) => {
            links.forEach((link) => {
                link.classList.toggle("active", link.dataset.slug === slug);
            });
        };

        const renderSlug = (slug) => {
            renderPageInto(slug, refs);
            setActive(slug);
            if (window.location.hash.replace(/^#/, "") !== slug) {
                window.location.hash = slug;
            }
        };

        links.forEach((link) => {
            link.addEventListener("click", (event) => {
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) {
                    return;
                }
                event.preventDefault();
                renderSlug(link.dataset.slug || "");
            });
        });

        const fromHash = window.location.hash.replace(/^#/, "");
        const initialSlug = DATA.pages[fromHash] ? fromHash : (links[0].dataset.slug || "");
        renderSlug(initialSlug);

        window.addEventListener("hashchange", () => {
            const slug = window.location.hash.replace(/^#/, "");
            if (DATA.pages[slug]) {
                renderSlug(slug);
            }
        });
    };

    const initStandalonePage = () => {
        const refs = {
            title: document.getElementById("pageTitle"),
            subtitle: document.getElementById("pageSubtitle"),
            sections: document.getElementById("pageSections"),
            canvas: document.getElementById("pageFreeCanvas"),
            sectionClass: "page-section"
        };

        if (!refs.title || !refs.subtitle || !refs.sections || !refs.canvas) {
            return;
        }

        const slug = window.location.hash.replace(/^#/, "") || (DATA.icons[0]?.slug || "wait");
        renderPageInto(slug, refs);

        const page = DATA.pages[slug];
        document.title = `${(page && page.title) || "Skill"} | JJS Skillbuilder`;
    };

    initIndexSplitPanel();
    initStandalonePage();
})();
