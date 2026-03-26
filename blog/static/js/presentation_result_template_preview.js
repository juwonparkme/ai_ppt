(function () {
    const helpers = window.PresentationResultEditorHelpers || {};
    const escapeHtml = helpers.escapeHtml || function (value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    };

    function ensureStyles() {
        if (document.getElementById("presentation-result-template-preview-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "presentation-result-template-preview-styles";
        style.textContent = `
            .tp-template{position:relative;width:100%;height:100%;overflow:hidden}
            .tp-editable{outline:none;cursor:text}
            .tp-editable[data-placeholder]:empty::before{content:attr(data-placeholder);color:rgba(38,35,33,.36)}
            .tp-modern-b .tp-editable[data-placeholder]:empty::before{color:rgba(38,33,38,.35)}
            .tp-editable:focus{background:rgba(79,70,229,.08);box-shadow:0 0 0 2px rgba(79,70,229,.18);border-radius:12px}
            .tp-remove{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:999px;border:0;background:rgba(255,255,255,.92);color:#6366f1;font-size:12px;line-height:1;opacity:0;transition:opacity .15s ease}
            .tp-remove:hover,.tp-remove:focus{opacity:1}
            .tp-remove-wrap:hover .tp-remove,.tp-inline-token:hover .tp-remove{opacity:1}
            .tp-empty{border:1px dashed rgba(224,52,8,.28);border-radius:18px;padding:14px 16px;font-size:12px;line-height:1.6;color:rgba(38,35,33,.6)}
            .tp-modern-b .tp-empty{border-color:rgba(127,154,178,.35);color:rgba(38,33,38,.6)}
            .tp-modern-a{background:#EFEFEF;color:#262321;font-family:Arial,sans-serif}
            .tp-modern-a .tp-bg-cover,.tp-modern-a .tp-bg-split,.tp-modern-a .tp-bg-paper,.tp-modern-a .tp-bg-side,.tp-modern-a .tp-bg-overlay{position:absolute;background-position:center;background-repeat:no-repeat;background-size:cover}
            .tp-modern-a .tp-bg-paper{background-size:contain}
            .tp-modern-a .tp-orange{color:#E03408}
            .tp-modern-a .tp-section-no{position:absolute;left:6.4%;bottom:7.2%;font-size:2.25rem;font-weight:700;color:#E03408;letter-spacing:.02em}
            .tp-modern-a .tp-line{position:absolute;left:0;right:0;height:1px;background:#E03408;opacity:.85}
            .tp-modern-a .tp-a-row{position:absolute;left:0;right:0}
            .tp-modern-a .tp-a-label{position:absolute;left:6.8%;top:-12px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#E03408}
            .tp-modern-a .tp-a-value{position:absolute;right:22.5%;top:-20px;width:26%;font-size:13px;font-weight:700;color:#E03408;text-align:center}
            .tp-modern-a .tp-token-flow{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-start}
            .tp-modern-a .tp-inline-token{display:inline-flex;align-items:flex-start;gap:4px;max-width:100%}
            .tp-modern-a .tp-inline-token .tp-editable{display:inline-block;min-width:.4ch}
            .tp-modern-a .tp-bullet-list{display:grid;gap:18px}
            .tp-modern-a .tp-bullet-row{display:flex;align-items:flex-start;gap:14px}
            .tp-modern-a .tp-bullet-dot{width:11px;height:11px;border-radius:999px;background:#E03408;flex-shrink:0;margin-top:11px}
            .tp-modern-a .tp-bullet-copy{flex:1;font-size:20px;line-height:1.55;color:#262321}
            .tp-modern-a .tp-bullet-copy .tp-editable{display:block}
            .tp-modern-a .tp-caption{position:absolute;font-size:10px;font-weight:700;letter-spacing:.14em;color:#E03408;text-align:center}
            .tp-modern-b{background:#B7CDE2;color:#262126;font-family:"Aptos","Arial",sans-serif}
            .tp-modern-b .tp-b-panel{position:absolute;left:1.8%;top:4%;width:96.4%;height:92%;border-radius:28px;background:#FFF}
            .tp-modern-b .tp-b-notch{position:absolute;left:31.1%;top:0;width:37.9%;height:10.4%;border-radius:0 0 26px 26px;background:#B7CDE2}
            .tp-modern-b .tp-b-label{position:absolute;left:34.5%;top:3.2%;width:31%;font-size:12px;color:#6F7077;text-align:center;letter-spacing:.08em}
            .tp-modern-b .tp-b-divider{position:absolute;left:7.4%;top:24.9%;width:85.1%;height:1px;background:#9EB6CB}
            .tp-modern-b .tp-b-section-no{position:absolute;left:8.6%;top:16.1%;width:7.5%;font-size:28px;font-weight:700;color:#7F9AB2;text-align:center}
            .tp-modern-b .tp-b-section-title{position:absolute;left:23.6%;top:14.6%;width:54%;font-family:"Aptos Display","Arial",sans-serif;font-size:30px;font-weight:700;color:#262126;text-align:center;line-height:1.15}
            .tp-modern-b .tp-b-card{background:#EEF2F6;border-radius:24px}
            .tp-modern-b .tp-b-soft-line{height:1px;background:#9EB6CB}
            .tp-modern-b .tp-b-strong{color:#7F9AB2;font-weight:700}
            .tp-modern-b .tp-b-muted{color:#6F7077}
            .tp-modern-b .tp-b-edit{outline:none}
            .tp-modern-b .tp-b-edit:focus{background:rgba(127,154,178,.12);box-shadow:0 0 0 2px rgba(127,154,178,.22);border-radius:12px}
            .tp-modern-b .tp-b-list{display:grid;gap:12px}
            .tp-modern-b .tp-b-list-row{display:flex;align-items:flex-start;gap:12px}
            .tp-modern-b .tp-b-badge{display:inline-flex;align-items:center;justify-content:center;min-width:56px;height:32px;padding:0 12px;border-radius:999px;background:#EEF2F6;color:#7F9AB2;font-size:12px;font-weight:700;letter-spacing:.08em}
            .tp-modern-b .tp-b-bullet-text{flex:1;font-size:14px;line-height:1.55;color:#262126}
            .tp-modern-b .tp-b-grid{display:grid;gap:8px}
            .tp-modern-b .tp-b-grid-row{display:grid;grid-template-columns:1.3fr repeat(4,1fr);gap:10px;align-items:center}
            .tp-modern-b .tp-b-grid-cell{font-size:13px;line-height:1.25;text-align:center;color:#6F7077}
            .tp-modern-b .tp-b-grid-cell.is-year{color:#262126}
            .tp-modern-b .tp-inline-token{display:inline-flex;align-items:flex-start;gap:4px;max-width:100%}
            .tp-modern-b .tp-inline-token .tp-editable{display:inline-block;min-width:.4ch}
            .tp-modern-b .tp-token-flow{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:flex-start}
        `;
        document.head.appendChild(style);
    }

    function cssUrl(value) {
        return String(value || "").replace(/'/g, "%27");
    }

    function backgroundStyle(url) {
        return url ? ` style="background-image:url('${cssUrl(url)}')"` : "";
    }

    function upperIfAscii(text) {
        const source = String(text || "");
        return /^[\x00-\x7F\s.,:;!?&'()/-]+$/.test(source) ? source.toUpperCase() : source;
    }

    function cleanItems(items) {
        return (Array.isArray(items) ? items : [])
            .map(function (item) {
                return String(item || "").trim();
            })
            .filter(Boolean);
    }

    function ensureItems(items, count, fallbackPrefix) {
        const picked = cleanItems(items).slice(0, count);
        while (picked.length < count) {
            picked.push(`${fallbackPrefix} ${picked.length + 1}`);
        }
        return picked;
    }

    function takeBullets(items, count, fallbackPrefix) {
        return ensureItems(items, count, fallbackPrefix);
    }

    function joinedParagraph(slide, fallback) {
        const parts = [slide.subtitle].concat(cleanItems(slide.bullets));
        return parts.filter(Boolean).join(" ") || fallback;
    }

    function firstSentence(slide) {
        if (String(slide.subtitle || "").trim()) {
            return String(slide.subtitle).trim();
        }
        return cleanItems(slide.bullets)[0] || "";
    }

    function fitTitleLines(text) {
        const words = String(text || "").trim().split(/\s+/).filter(Boolean);
        if (words.length <= 1) {
            return [String(text || "").trim(), ""];
        }
        const midpoint = Math.ceil(words.length / 2);
        return [words.slice(0, midpoint).join(" "), words.slice(midpoint).join(" ")];
    }

    function splitBullets(items) {
        const midpoint = Math.ceil(items.length / 2);
        return [items.slice(0, midpoint), items.slice(midpoint)];
    }

    function sectionMeta(previewItems, selectedIndex) {
        let detailIndex = 0;
        let sectionNumber = 1;
        for (let index = 0; index < selectedIndex; index += 1) {
            const item = previewItems[index];
            if (!item || item.kind === "image" || item.slide_kind === "title" || item.slide_kind === "toc") {
                continue;
            }
            detailIndex += 1;
            sectionNumber += 1;
        }
        return { detailIndex: detailIndex, sectionNumber: sectionNumber };
    }

    function detailSlides(previewItems) {
        return previewItems.filter(function (item) {
            return item && item.kind !== "image" && item.slide_kind !== "title" && item.slide_kind !== "toc";
        });
    }

    function editable(field, value, options) {
        const opts = options || {};
        const attrs = [
            'class="' + escapeHtml(opts.className || "tp-editable") + '"',
            'contenteditable="true"',
            'spellcheck="false"',
            'data-editor-field="' + escapeHtml(field) + '"',
        ];
        if (typeof opts.index === "number") {
            attrs.push('data-bullet-index="' + String(opts.index) + '"');
        }
        if (opts.placeholder) {
            attrs.push('data-placeholder="' + escapeHtml(opts.placeholder) + '"');
        }
        const content = escapeHtml(value || "").replace(/\n/g, "<br>");
        return `<${opts.tag || "div"} ${attrs.join(" ")}>${content}</${opts.tag || "div"}>`;
    }

    function inlineTokens(slide, options) {
        const opts = options || {};
        const parts = [];
        if (String(slide.subtitle || "").trim()) {
            parts.push(
                '<span class="tp-inline-token">' +
                    editable("subtitle", slide.subtitle, {
                        tag: "span",
                        className: opts.tokenClass || "tp-editable",
                        placeholder: "부제 입력",
                    }) +
                "</span>"
            );
        }
        cleanItems(slide.bullets).forEach(function (bullet, index) {
            parts.push(
                '<span class="tp-inline-token">' +
                    editable("bullet", bullet, {
                        tag: "span",
                        className: opts.tokenClass || "tp-editable",
                        index: index,
                        placeholder: "포인트 입력",
                    }) +
                    '<button class="tp-remove" data-bullet-remove-index="' + index + '" type="button">×</button>' +
                "</span>"
            );
        });
        if (!parts.length) {
            parts.push(
                '<span class="tp-inline-token">' +
                    editable("subtitle", "", {
                        tag: "span",
                        className: opts.tokenClass || "tp-editable",
                        placeholder: opts.emptyPlaceholder || "내용 입력",
                    }) +
                "</span>"
            );
        }
        return '<div class="' + escapeHtml(opts.wrapperClass || "tp-token-flow") + '">' + parts.join("") + "</div>";
    }

    function bulletRows(slide, options) {
        const opts = options || {};
        const items = cleanItems(slide.bullets);
        if (!items.length) {
            return '<div class="tp-empty">' + escapeHtml(opts.emptyText || "불릿 없음. 상단 버튼으로 추가하세요.") + "</div>";
        }
        return (
            '<div class="' + escapeHtml(opts.wrapperClass || "tp-bullet-list") + '">' +
            items
                .map(function (bullet, index) {
                    const marker = opts.marker
                        ? opts.marker(index)
                        : '<span class="' + escapeHtml(opts.dotClass || "tp-bullet-dot") + '"></span>';
                    return (
                        '<div class="' + escapeHtml(opts.rowClass || "tp-bullet-row tp-remove-wrap") + '">' +
                        marker +
                        '<div class="' + escapeHtml(opts.textWrapClass || "tp-bullet-copy") + '">' +
                        editable("bullet", bullet, {
                            className: opts.textClass || "tp-editable",
                            index: index,
                            placeholder: "포인트 입력",
                        }) +
                        "</div>" +
                        '<button class="tp-remove" data-bullet-remove-index="' + index + '" type="button">×</button>' +
                        "</div>"
                    );
                })
                .join("") +
            "</div>"
        );
    }

    function renderModernA(context) {
        const slide = context.slide;
        const assets = context.assets || {};
        const meta = sectionMeta(context.previewItems, context.selectedIndex);
        const details = detailSlides(context.previewItems);

        if (slide.slide_kind === "title") {
            return `
                <div class="tp-template tp-modern-a">
                    <div class="tp-bg-cover" style="inset:0;${assets.cover ? `background-image:url('${cssUrl(assets.cover)}')` : ""};background-size:cover;"></div>
                    <div style="position:absolute;left:5.4%;top:6.2%;width:89%;font-size:clamp(2.6rem,5.8vw,4.5rem);font-weight:700;line-height:1.06;color:#E03408;text-align:center;">
                        ${editable("title", upperIfAscii(slide.title || context.deckTitle), { placeholder: "제목 입력" })}
                    </div>
                    <div style="position:absolute;left:6.6%;bottom:6.7%;font-size:12px;font-weight:700;letter-spacing:.16em;color:#E03408;">AI PPT STUDIO</div>
                    <div style="position:absolute;right:6.9%;bottom:6.7%;width:18%;font-size:12px;font-weight:700;color:#E03408;text-align:right;">
                        ${editable("subtitle", slide.subtitle, { placeholder: "부제 입력" })}
                    </div>
                </div>
            `;
        }

        if (slide.slide_kind === "toc") {
            const tocTitles = ensureItems(
                cleanItems(slide.bullets).length ? cleanItems(slide.bullets).map(upperIfAscii) : details.map(function (item) { return upperIfAscii(item.title); }),
                6,
                "SECTION"
            );
            const captions = ensureItems(
                details.map(function (item) { return joinedParagraph(item, ""); }).filter(Boolean),
                6,
                "핵심 메시지"
            );
            return `
                <div class="tp-template tp-modern-a">
                    ${tocTitles.map(function (text, index) {
                        const y = 13.6 + index * 10.4;
                        return `
                            <div class="tp-a-row" style="top:${y}%;">
                                <div style="position:absolute;left:6.1%;top:-2.2%;font-size:2.25rem;font-weight:700;color:#E03408;">(${index + 1})</div>
                                <div style="position:absolute;left:16.3%;top:-2.3%;width:55%;font-size:2.1rem;font-weight:700;color:#E03408;line-height:1.02;">
                                    ${editable("bullet", text, { index: index, placeholder: "목차 입력" })}
                                </div>
                                <div style="position:absolute;right:8.2%;top:.4%;width:14%;font-size:10px;font-weight:700;color:#E03408;text-align:right;line-height:1.35;">${escapeHtml(captions[index])}</div>
                                <div class="tp-line" style="top:6.9%;"></div>
                            </div>
                        `;
                    }).join("")}
                </div>
            `;
        }

        const layoutIndex = meta.detailIndex % 6;
        if (slide.slide_kind === "summary") {
            const values = ensureItems(slide.bullets, 4, "연락 정보");
            return `
                <div class="tp-template tp-modern-a">
                    <div style="position:absolute;left:6.5%;top:11.4%;width:34%;font-size:clamp(2rem,4.1vw,3rem);font-weight:700;line-height:1;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title || "SUMMARY"), { placeholder: "제목 입력" })}
                    </div>
                    ${["PHONE:", "E-MAIL:", "WEBSITE:", "SOCIAL MEDIA:"].map(function (label, index) {
                        const y = 39.2 + index * 12;
                        return `
                            <div class="tp-a-row" style="top:${y}%;">
                                <div class="tp-a-label">${escapeHtml(label)}</div>
                                <div class="tp-a-value tp-remove-wrap">
                                    ${editable("bullet", values[index], { index: index, placeholder: "내용 입력" })}
                                    <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                                </div>
                                <div class="tp-line" style="top:8%;left:7.3%;right:8.3%;"></div>
                            </div>
                        `;
                    }).join("")}
                    <div class="tp-caption" style="right:8.4%;bottom:14.8%;width:14%;">LET'S CONNECT</div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        if (layoutIndex === 0) {
            return `
                <div class="tp-template tp-modern-a">
                    <div class="tp-bg-cover" style="inset:0;${assets.introFur ? `background-image:url('${cssUrl(assets.introFur)}')` : ""};background-size:cover;"></div>
                    <div style="position:absolute;left:5.7%;top:9.8%;width:33%;font-size:clamp(1.9rem,4vw,3rem);font-weight:700;line-height:1.02;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title), { placeholder: "제목 입력" })}
                    </div>
                    <div style="position:absolute;right:8.2%;top:10.8%;width:14%;font-size:11px;font-weight:700;line-height:1.55;color:#E03408;text-align:center;">
                        ${inlineTokens(slide, { tokenClass: "tp-editable", emptyPlaceholder: "내용 입력" })}
                    </div>
                    <div class="tp-caption" style="right:8.3%;bottom:13.6%;width:15%;">OVERVIEW OF THE BRIEF</div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        if (layoutIndex === 1) {
            const rows = ensureItems(slide.bullets, 3, "핵심 항목");
            return `
                <div class="tp-template tp-modern-a">
                    <div style="position:absolute;left:6.5%;top:11.4%;width:29%;font-size:clamp(1.9rem,3.8vw,2.75rem);font-weight:700;line-height:1.02;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title), { placeholder: "제목 입력" })}
                    </div>
                    <div class="tp-bg-paper" style="right:0;top:4%;width:24.4%;height:92%;${assets.vase ? `background-image:url('${cssUrl(assets.vase)}')` : ""};"></div>
                    ${["AGE:", "CLIENTS:", "LOCATION:"].map(function (label, index) {
                        const y = 42 + index * 12;
                        return `
                            <div class="tp-a-row" style="top:${y}%;">
                                <div class="tp-a-label">${escapeHtml(label)}</div>
                                <div class="tp-a-value tp-remove-wrap">
                                    ${editable("bullet", rows[index], { index: index, placeholder: "내용 입력" })}
                                    <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                                </div>
                                <div class="tp-line" style="top:8%;left:7.3%;right:22.4%;"></div>
                            </div>
                        `;
                    }).join("")}
                    <div class="tp-caption" style="right:15.3%;bottom:14.6%;width:18%;">WHO IS THIS INTENDED FOR?</div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        if (layoutIndex === 2) {
            return `
                <div class="tp-template tp-modern-a">
                    <div class="tp-bg-split" style="left:0;top:0;width:50%;height:100%;${assets.hide ? `background-image:url('${cssUrl(assets.hide)}')` : ""};"></div>
                    <div class="tp-bg-split" style="right:0;top:0;width:50%;height:100%;${assets.shirt ? `background-image:url('${cssUrl(assets.shirt)}')` : ""};"></div>
                    <div class="tp-bg-overlay" style="right:12.7%;top:25.6%;width:25.1%;height:54.1%;${assets.path ? `background-image:url('${cssUrl(assets.path)}')` : ""};"></div>
                    <div style="position:absolute;left:6%;top:11.6%;width:25%;font-size:clamp(1.85rem,3.8vw,2.7rem);font-weight:700;line-height:1.02;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title), { placeholder: "제목 입력" })}
                    </div>
                    <div style="position:absolute;right:8.4%;bottom:13.8%;width:15.5%;font-size:11px;font-weight:700;line-height:1.55;color:#FFF;text-align:center;">
                        ${inlineTokens(slide, { tokenClass: "tp-editable", emptyPlaceholder: "내용 입력" })}
                    </div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        if (layoutIndex === 3) {
            const rows = ensureItems(slide.bullets, 2, "전달물");
            return `
                <div class="tp-template tp-modern-a">
                    <div style="position:absolute;left:6.5%;top:12%;width:48%;font-size:clamp(1.9rem,3.9vw,2.8rem);font-weight:700;line-height:1;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title), { placeholder: "제목 입력" })}
                    </div>
                    <div class="tp-bg-paper" style="right:0;top:4.2%;width:29.5%;height:93%;${assets.cactus ? `background-image:url('${cssUrl(assets.cactus)}')` : ""};"></div>
                    ${["CONTENT:", "FORMATS:"].map(function (label, index) {
                        const y = 48 + index * 10.4;
                        return `
                            <div class="tp-a-row" style="top:${y}%;">
                                <div class="tp-a-label">${escapeHtml(label)}</div>
                                <div class="tp-a-value tp-remove-wrap" style="right:28%;">
                                    ${editable("bullet", rows[index], { index: index, placeholder: "내용 입력" })}
                                    <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                                </div>
                                <div class="tp-line" style="top:8%;left:7.3%;right:29%;"></div>
                            </div>
                        `;
                    }).join("")}
                    <div class="tp-caption" style="right:16%;bottom:13.8%;width:18%;">CREATORS HAVE TASKS TO TACKLE</div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        if (layoutIndex === 4) {
            return `
                <div class="tp-template tp-modern-a">
                    <div class="tp-bg-cover" style="inset:0;${assets.leather ? `background-image:url('${cssUrl(assets.leather)}')` : ""};background-size:cover;"></div>
                    <div style="position:absolute;left:6.5%;top:11%;width:28%;font-size:clamp(1.85rem,3.8vw,2.7rem);font-weight:700;line-height:1.02;color:#E03408;">
                        ${editable("title", upperIfAscii(slide.title), { placeholder: "제목 입력" })}
                    </div>
                    <div style="position:absolute;right:7.8%;bottom:13.6%;width:15.5%;font-size:11px;font-weight:700;line-height:1.55;color:#E03408;text-align:center;">
                        ${inlineTokens(slide, { tokenClass: "tp-editable", emptyPlaceholder: "내용 입력" })}
                    </div>
                    <div class="tp-section-no">(${meta.sectionNumber})</div>
                </div>
            `;
        }

        return `
            <div class="tp-template tp-modern-a">
                <div class="tp-bg-split" style="right:0;top:0;width:47.7%;height:100%;${assets.heels ? `background-image:url('${cssUrl(assets.heels)}')` : ""};"></div>
                <div class="tp-bg-overlay" style="right:12.1%;top:21.9%;width:25.2%;height:58.9%;${assets.glass ? `background-image:url('${cssUrl(assets.glass)}')` : ""};"></div>
                <div style="position:absolute;left:6.6%;top:11.8%;width:22%;font-size:14px;font-weight:700;line-height:1.75;color:#E03408;">
                    ${inlineTokens(slide, { tokenClass: "tp-editable", emptyPlaceholder: "내용 입력" })}
                </div>
                <div class="tp-section-no">(${meta.sectionNumber})</div>
            </div>
        `;
    }

    function renderModernB(context) {
        const slide = context.slide;
        const assets = context.assets || {};
        const meta = sectionMeta(context.previewItems, context.selectedIndex);
        const details = detailSlides(context.previewItems);

        function baseFrame(bodyHtml) {
            return `
                <div class="tp-template tp-modern-b">
                    <div class="tp-b-panel"></div>
                    <div class="tp-b-notch"></div>
                    <div class="tp-b-label">BUSINESS PRESENTATION</div>
                    ${bodyHtml}
                </div>
            `;
        }

        function sectionHeader(titleText) {
            return `
                <div class="tp-b-section-no">${String(meta.sectionNumber).padStart(2, "0")}</div>
                <div class="tp-b-section-title">
                    ${editable("title", titleText, { placeholder: "제목 입력", className: "tp-editable tp-b-edit" })}
                </div>
                <div class="tp-b-divider"></div>
            `;
        }

        if (slide.slide_kind === "title") {
            const lines = fitTitleLines(slide.title || context.deckTitle);
            const titleContent = [lines[0], lines[1] || slide.subtitle || ""].filter(Boolean).join("\n");
            return baseFrame(`
                <div style="position:absolute;left:11.8%;top:28%;width:76%;font-family:'Aptos Display','Arial',sans-serif;font-size:clamp(2.2rem,4.8vw,3.3rem);font-weight:700;line-height:1.16;color:#262126;text-align:center;">
                    ${editable("title", titleContent, { placeholder: "제목 입력", className: "tp-editable tp-b-edit" })}
                </div>
                <div class="tp-b-soft-line" style="position:absolute;left:7.4%;bottom:15.7%;width:85.1%;"></div>
                <div style="position:absolute;left:12%;bottom:7.6%;width:76%;font-size:12px;color:#6F7077;text-align:center;">
                    ${editable("subtitle", slide.subtitle, { placeholder: "부제 입력", className: "tp-editable tp-b-edit" })}
                </div>
            `);
        }

        if (slide.slide_kind === "toc") {
            const tocItems = takeBullets(cleanItems(slide.bullets).length ? slide.bullets : details.map(function (item) { return item.title; }), 6, "섹션");
            const tocDescriptions = takeBullets(
                details.map(firstSentence).filter(Boolean),
                6,
                "해당 목차에 대한 설명을 입력해 주세요"
            );
            const positions = [
                { left: 10.2, top: 36.4 },
                { left: 10.2, top: 54.6 },
                { left: 10.2, top: 72.8 },
                { left: 55.4, top: 36.4 },
                { left: 55.4, top: 54.6 },
                { left: 55.4, top: 72.8 },
            ];
            return baseFrame(`
                <div style="position:absolute;left:32%;top:17.2%;width:36%;font-family:'Aptos Display','Arial',sans-serif;font-size:2.1rem;color:#262126;text-align:center;">CONTENTS</div>
                ${positions.map(function (position, index) {
                    return `
                        <div style="position:absolute;left:${position.left}%;top:${position.top}%;width:33%;">
                            <div style="position:absolute;left:0;top:0;font-size:1.75rem;font-weight:700;color:#7F9AB2;">${String(index + 1).padStart(2, "0")}</div>
                            <div style="position:absolute;left:24%;top:-1%;width:70%;font-size:16px;font-weight:700;color:#262126;line-height:1.25;">
                                ${editable("bullet", tocItems[index], { index: index, placeholder: "목차 입력", className: "tp-editable tp-b-edit" })}
                            </div>
                            <div style="position:absolute;left:24%;top:46px;width:72%;font-size:10px;line-height:1.45;color:#6F7077;">${escapeHtml(tocDescriptions[index])}</div>
                            <div class="tp-b-soft-line" style="position:absolute;left:0;top:86px;width:96%;"></div>
                        </div>
                    `;
                }).join("")}
            `);
        }

        const layoutIndex = meta.detailIndex % 5;
        const isGoalsSummary = slide.slide_kind === "summary" && meta.detailIndex >= 4;
        if (isGoalsSummary) {
            const items = takeBullets(slide.bullets, 4, "키워드");
            return baseFrame(`
                ${sectionHeader(slide.title)}
                <div class="tp-b-card" style="position:absolute;left:7.4%;top:30.4%;width:83.2%;height:14.6%;"></div>
                <div style="position:absolute;left:16.1%;top:36%;font-size:16px;font-weight:700;color:#7F9AB2;">목표</div>
                <div style="position:absolute;left:26.6%;top:34.5%;width:56%;font-size:13px;line-height:1.55;color:#262126;">
                    ${inlineTokens(slide, { wrapperClass: "tp-token-flow", tokenClass: "tp-editable tp-b-edit", emptyPlaceholder: "목표 입력" })}
                </div>
                ${items.map(function (item, index) {
                    const left = 9.4 + index * 22.1;
                    return `
                        <div style="position:absolute;left:${left + 4.1}%;top:60.3%;width:5.4%;height:9.6%;border-radius:999px;border:2px solid #9EB6CB;background:#FFF;display:flex;align-items:center;justify-content:center;color:#7F9AB2;font-size:12px;font-weight:700;">${index + 1}</div>
                        <div style="position:absolute;left:${left}%;top:78.4%;width:13.5%;font-size:15px;font-weight:700;color:#7F9AB2;text-align:center;">키워드 0${index + 1}</div>
                        <div class="tp-remove-wrap" style="position:absolute;left:${left - 1.2}%;top:83.8%;width:16%;font-size:10px;line-height:1.45;color:#6F7077;text-align:center;">
                            ${editable("bullet", item, { index: index, placeholder: "키워드 입력", className: "tp-editable tp-b-edit" })}
                            <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                        </div>
                    `;
                }).join("")}
            `);
        }

        if (slide.slide_kind === "summary") {
            const bullets = takeBullets(slide.bullets, 2, "핵심 성과");
            return baseFrame(`
                ${sectionHeader(slide.title)}
                ${bullets.map(function (bullet, index) {
                    const top = 36.4 + index * 18.9;
                    return `
                        <div style="position:absolute;left:13.4%;top:${top}%;font-size:15px;font-weight:700;color:#7F9AB2;">핵심 키워드 0${index + 1}</div>
                        <div class="tp-remove-wrap" style="position:absolute;left:30.8%;top:${top - 1}%;width:54%;font-size:13px;line-height:1.5;color:#262126;">
                            ${editable("bullet", bullet, { index: index, placeholder: "내용 입력", className: "tp-editable tp-b-edit" })}
                            <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                        </div>
                        <div class="tp-b-soft-line" style="position:absolute;left:7.4%;top:${top + 8.6}%;width:83.2%;"></div>
                    `;
                }).join("")}
                <div style="position:absolute;left:48.7%;top:65.4%;font-size:18px;color:#7F9AB2;">▼</div>
                <div class="tp-b-card" style="position:absolute;left:7.4%;top:72%;width:83.2%;height:19.2%;"></div>
                <div style="position:absolute;left:16%;top:78.6%;font-size:15px;font-weight:700;color:#7F9AB2;">결론 요약</div>
                <div style="position:absolute;left:30.9%;top:77.2%;width:54%;font-size:13px;line-height:1.55;color:#262126;">
                    ${inlineTokens(slide, { tokenClass: "tp-editable tp-b-edit", emptyPlaceholder: "내용 입력" })}
                </div>
            `);
        }

        if (layoutIndex === 0) {
            const bullets = takeBullets(slide.bullets, 3, "핵심 포인트");
            return baseFrame(`
                ${sectionHeader(slide.title)}
                <div style="position:absolute;left:7.4%;top:30.4%;width:35.4%;height:58.4%;background:#d8e0e8 ${assets.building ? `url('${cssUrl(assets.building)}') center/cover no-repeat` : ""};"></div>
                ${["프로젝트 배경", "프로젝트 목적", "프로젝트 기간"].map(function (label, index) {
                    const top = 34.9 + index * 10.4;
                    return `
                        <div style="position:absolute;left:48.1%;top:${top}%;font-size:16px;font-weight:700;color:#7F9AB2;">${escapeHtml(label)} |</div>
                        <div class="tp-remove-wrap" style="position:absolute;left:63.2%;top:${top - 1}%;width:23%;font-size:14px;line-height:1.45;color:#262126;">
                            ${editable("bullet", bullets[index], { index: index, placeholder: "내용 입력", className: "tp-editable tp-b-edit" })}
                            <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                        </div>
                    `;
                }).join("")}
                <div class="tp-b-card" style="position:absolute;left:46.5%;top:66.7%;width:44.2%;height:22.9%;"></div>
                <div style="position:absolute;left:60.6%;top:70.4%;font-size:16px;font-weight:700;color:#7F9AB2;">핵심 내용</div>
                <div style="position:absolute;left:50.4%;top:75.4%;width:36.4%;font-size:13px;line-height:1.55;color:#6F7077;text-align:center;">
                    ${editable("subtitle", slide.subtitle || slide.bullets.join(" / "), { placeholder: "부제 입력", className: "tp-editable tp-b-edit" })}
                </div>
            `);
        }

        if (layoutIndex === 1) {
            const cards = takeBullets(slide.bullets, 3, "핵심 키워드");
            return baseFrame(`
                ${sectionHeader(slide.title)}
                ${cards.map(function (card, index) {
                    const left = 7.4 + index * 29.6;
                    return `
                        <div class="tp-b-card" style="position:absolute;left:${left}%;top:30.4%;width:25.2%;height:60.3%;"></div>
                        <div style="position:absolute;left:${left + 4.1}%;top:36.3%;font-size:16px;font-weight:700;color:#7F9AB2;">POINT 0${index + 1}.</div>
                        <div style="position:absolute;left:${left + 2.4}%;top:42.4%;width:20.4%;height:8.3%;border-radius:18px;background:#FFF;"></div>
                        <div class="tp-remove-wrap" style="position:absolute;left:${left + 3.4}%;top:45.1%;width:18.4%;font-size:12px;font-weight:700;color:#262126;text-align:center;">
                            ${editable("bullet", card, { index: index, placeholder: "카드 제목", className: "tp-editable tp-b-edit" })}
                            <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                        </div>
                        <div style="position:absolute;left:${left + 4.2}%;top:55.2%;width:16.2%;font-size:10px;line-height:1.55;color:#262126;">
                            ${slide.bullets.slice(index, index + 4).map(function (text) {
                                return "• " + escapeHtml(text);
                            }).join("<br>")}
                        </div>
                    `;
                }).join("")}
            `);
        }

        if (layoutIndex === 2) {
            const rows = takeBullets(slide.bullets, 4, "분석 항목");
            return baseFrame(`
                ${sectionHeader(slide.title)}
                <div class="tp-b-card" style="position:absolute;left:7.4%;top:30.6%;width:15.8%;height:7.8%;"></div>
                <div class="tp-b-card" style="position:absolute;left:24.4%;top:30.6%;width:23.6%;height:7.8%;"></div>
                <div class="tp-b-card" style="position:absolute;left:51.4%;top:30.6%;width:39.4%;height:59.3%;"></div>
                <div style="position:absolute;left:11.8%;top:33.4%;font-size:15px;font-weight:700;color:#7F9AB2;">항목</div>
                <div style="position:absolute;left:33.1%;top:33.4%;font-size:15px;font-weight:700;color:#7F9AB2;">상세 내용</div>
                <div style="position:absolute;left:67.3%;top:33.4%;font-size:15px;font-weight:700;color:#7F9AB2;">분기 요약</div>
                ${rows.map(function (row, index) {
                    const top = 43.8 + index * 12.5;
                    return `
                        <div style="position:absolute;left:10.8%;top:${top}%;width:8.2%;font-size:13px;font-weight:700;color:#262126;text-align:center;">항목 ${index + 1}</div>
                        <div class="tp-remove-wrap" style="position:absolute;left:26.3%;top:${top - .8}%;width:18.2%;font-size:12px;line-height:1.45;color:#6F7077;">
                            ${editable("bullet", row, { index: index, placeholder: "상세 내용", className: "tp-editable tp-b-edit" })}
                            <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                        </div>
                        <div style="position:absolute;left:54%;top:${top - .2}%;width:31.5%;font-size:12px;line-height:1.45;color:#262126;">${index + 1}. ${escapeHtml(row)}</div>
                    `;
                }).join("")}
            `);
        }

        if (layoutIndex === 3) {
            const values = takeBullets(slide.bullets, 5, "데이터");
            const headers = ["연도", "매입액", "매출액", "매출이익", "손익"];
            return baseFrame(`
                ${sectionHeader(slide.title)}
                ${headers.map(function (header, index) {
                    return `
                        <div class="tp-b-card" style="position:absolute;left:${7.5 + index * 17.55}%;top:30.4%;width:15.6%;height:7.8%;"></div>
                        <div style="position:absolute;left:${9.3 + index * 17.55}%;top:33.4%;width:12%;font-size:15px;font-weight:700;color:#7F9AB2;text-align:center;">${escapeHtml(header)}</div>
                    `;
                }).join("")}
                <div class="tp-b-grid" style="position:absolute;left:8.8%;top:44.8%;width:82%;">
                    ${[0, 1, 2].map(function (rowIndex) {
                        return `
                            <div class="tp-b-grid-row">
                                <div class="tp-b-grid-cell is-year">20${78 + rowIndex}년</div>
                                ${values.slice(0, 4).map(function (_, index) {
                                    return '<div class="tp-b-grid-cell">' + escapeHtml(`${(rowIndex + 2) * (index + 2)},${(index + rowIndex) * 12}`) + "</div>";
                                }).join("")}
                            </div>
                        `;
                    }).join("")}
                </div>
                <div class="tp-b-card" style="position:absolute;left:7.4%;top:74.4%;width:83.2%;height:14.7%;"></div>
                <div style="position:absolute;left:12.9%;top:79.1%;font-size:15px;font-weight:700;color:#7F9AB2;">연도별 추이 변화</div>
                <div style="position:absolute;left:31.5%;top:78.1%;width:52.5%;font-size:12px;line-height:1.45;color:#262126;">
                    ${inlineTokens(slide, { tokenClass: "tp-editable tp-b-edit", emptyPlaceholder: "내용 입력" })}
                </div>
            `);
        }

        const compared = splitBullets(takeBullets(slide.bullets, 8, "비교 포인트"));
        return baseFrame(`
            ${sectionHeader(slide.title)}
            <div class="tp-b-card" style="position:absolute;left:7.4%;top:30.4%;width:42.4%;height:59.3%;"></div>
            <div class="tp-b-card" style="position:absolute;left:50.3%;top:30.4%;width:40.5%;height:59.3%;"></div>
            <div style="position:absolute;left:18.3%;top:36.2%;font-size:16px;color:#6F7077;">타사 서비스</div>
            <div style="position:absolute;left:64.5%;top:36.2%;font-size:16px;font-weight:700;color:#7F9AB2;">자사 서비스</div>
            <div style="position:absolute;left:45%;top:53.7%;width:5.8%;height:10.4%;border-radius:999px;border:2px solid #FFF;background:#B7CDE2;display:flex;align-items:center;justify-content:center;font-family:'Aptos Display','Arial',sans-serif;font-size:18px;font-weight:700;color:#6F7077;">VS</div>
            ${compared[0].slice(0, 4).map(function (text, index) {
                return `
                    <div style="position:absolute;left:11%;top:${42.7 + index * 10.7}%;width:33.8%;height:6%;border-radius:16px;background:#FFF;"></div>
                    <div class="tp-remove-wrap" style="position:absolute;left:13.2%;top:${45 + index * 10.7}%;width:29.2%;font-size:11px;color:#262126;text-align:center;">
                        ${editable("bullet", text, { index: index, placeholder: "비교 항목", className: "tp-editable tp-b-edit" })}
                        <button class="tp-remove" data-bullet-remove-index="${index}" type="button">×</button>
                    </div>
                `;
            }).join("")}
            ${compared[1].slice(0, 4).map(function (text, index) {
                const bulletIndex = index + compared[0].slice(0, 4).length;
                return `
                    <div style="position:absolute;left:53.9%;top:${42.7 + index * 10.7}%;width:31.5%;height:6%;border-radius:16px;background:#FFF;"></div>
                    <div class="tp-remove-wrap" style="position:absolute;left:56.1%;top:${45 + index * 10.7}%;width:27.2%;font-size:11px;color:#262126;text-align:center;">
                        ${editable("bullet", text, { index: bulletIndex, placeholder: "비교 항목", className: "tp-editable tp-b-edit" })}
                        <button class="tp-remove" data-bullet-remove-index="${bulletIndex}" type="button">×</button>
                    </div>
                `;
            }).join("")}
        `);
    }

    function renderCanvasPreview(context) {
        ensureStyles();
        const slide = context.slide || {};
        if (slide.kind === "image") {
            return `
                <div class="tp-template" style="background:#fff;">
                    <img alt="slide preview" src="${escapeHtml(slide.image_url || "")}" style="width:100%;height:100%;object-fit:contain;" />
                </div>
            `;
        }

        const template = context.template === "modern-b" ? "modern-b" : "modern-a";
        const assets = (context.assetUrls && context.assetUrls[template]) || {};
        if (template === "modern-b") {
            return renderModernB({
                slide: slide,
                previewItems: context.previewItems || [],
                selectedIndex: context.selectedIndex || 0,
                deckTitle: context.deckTitle || "",
                assets: assets,
            });
        }
        return renderModernA({
            slide: slide,
            previewItems: context.previewItems || [],
            selectedIndex: context.selectedIndex || 0,
            deckTitle: context.deckTitle || "",
            assets: assets,
        });
    }

    window.PresentationResultTemplatePreview = {
        renderCanvasPreview: renderCanvasPreview,
    };
})();
