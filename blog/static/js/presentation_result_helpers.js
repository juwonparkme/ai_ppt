(function () {
    function cleanText(value, fallback) {
        if (value === null || value === undefined) {
            return fallback;
        }
        const text = String(value).trim();
        return text || fallback;
    }

    function cleanBullets(value) {
        const source = Array.isArray(value) ? value : typeof value === "string" ? value.split("\n") : [];
        return source
            .map(function (item) {
                return String(item || "").trim();
            })
            .filter(Boolean)
            .slice(0, 6);
    }

    function normalizePreviewItem(item, index) {
        const preview = Object.assign({}, item || {});
        if (preview.kind === "image") {
            return {
                kind: "image",
                slide_kind: "image",
                title: cleanText(preview.title, "Image Slide"),
                subtitle: "",
                bullets: [],
                image_url: cleanText(preview.image_url, ""),
                notes: cleanText(preview.notes, ""),
            };
        }

        const defaultKind = index === 0 ? "title" : "bullets";
        return {
            kind: "slide",
            slide_kind: ["title", "toc", "bullets", "summary"].includes(preview.slide_kind) ? preview.slide_kind : defaultKind,
            title: cleanText(preview.title, "Untitled Slide"),
            subtitle: cleanText(preview.subtitle, ""),
            bullets: cleanBullets(preview.bullets),
            notes: cleanText(preview.notes, ""),
        };
    }

    function createSlide(baseTitle, slideKind) {
        return {
            kind: "slide",
            slide_kind: slideKind || "bullets",
            title: slideKind === "title" ? cleanText(baseTitle, "Presentation") : "새 슬라이드",
            subtitle: slideKind === "title" ? "핵심 메시지를 적어주세요." : "",
            bullets: slideKind === "title" ? [] : ["핵심 포인트를 입력하세요."],
            notes: "",
        };
    }

    function isImageSlide(slide) {
        return slide && slide.kind === "image";
    }

    function supportsBullets(slide) {
        return !isImageSlide(slide) && slide.slide_kind !== "title";
    }

    function backendLabel(backend) {
        return backend === "pptxgenjs" ? "PptxGenJS Renderer" : "Google Slides Legacy";
    }

    function backendFooterLabel(backend) {
        return backend === "pptxgenjs" ? "PptxGenJS" : "Google Slides";
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function buildSlideCard(preview, index, selectedIndex, onSelect) {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.index = String(index);
        button.className =
            "result-slide-item group w-full rounded-2xl border border-transparent bg-surface-container-lowest/80 p-2 text-left transition hover:-translate-y-0.5 hover:border-outline-variant/20";
        if (index === selectedIndex) {
            button.classList.add("ring-2", "ring-primary");
        }

        if (preview.kind === "image") {
            button.innerHTML =
                '<div class="aspect-video overflow-hidden rounded-xl bg-surface-container">' +
                '<img alt="slide preview" class="h-full w-full object-cover" src="' + preview.image_url + '" />' +
                "</div>" +
                '<p class="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Slide ' + (index + 1) + "</p>";
        } else {
            const subtitle = preview.subtitle
                ? '<div class="mt-2 line-clamp-2 text-xs leading-5 text-on-surface-variant">' + escapeHtml(preview.subtitle) + "</div>"
                : "";
            button.innerHTML =
                '<div class="aspect-video overflow-hidden rounded-xl bg-surface-container">' +
                '<div class="flex h-full flex-col justify-between bg-gradient-to-br from-white to-surface-container p-4">' +
                '<div class="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">' + escapeHtml(preview.slide_kind) + "</div>" +
                '<div class="text-sm font-bold leading-5 text-on-surface">' + escapeHtml(preview.title) + "</div>" +
                subtitle +
                "</div>" +
                "</div>" +
                '<p class="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">Slide ' + (index + 1) + "</p>";
        }

        button.addEventListener("click", function () {
            onSelect(index);
        });
        return button;
    }

    function renderCanvasBullets(container, slide) {
        if (!container) {
            return;
        }
        container.innerHTML = "";

        if (!supportsBullets(slide)) {
            return;
        }

        const bullets = slide.bullets.length ? slide.bullets : ["불릿이 없습니다. 우측에서 추가하세요."];
        bullets.forEach(function (bullet) {
            const item = document.createElement("li");
            item.className = "flex items-start gap-3 text-base leading-7 text-on-surface-variant";
            item.innerHTML = '<span class="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"></span><span></span>';
            item.querySelector("span:last-child").textContent = bullet;
            container.appendChild(item);
        });
    }

    window.PresentationResultEditorHelpers = {
        backendFooterLabel: backendFooterLabel,
        backendLabel: backendLabel,
        buildSlideCard: buildSlideCard,
        cleanBullets: cleanBullets,
        cleanText: cleanText,
        createSlide: createSlide,
        escapeHtml: escapeHtml,
        isImageSlide: isImageSlide,
        normalizePreviewItem: normalizePreviewItem,
        renderCanvasBullets: renderCanvasBullets,
        supportsBullets: supportsBullets,
    };
})();
