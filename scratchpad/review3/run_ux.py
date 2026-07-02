import os, json, re
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8899"
OUT = r"C:\repositories\Fotostudio Light-Style\Client_Andi-Moeller\07_site\site\scratchpad\review3\02_ux"
os.makedirs(OUT, exist_ok=True)

PAGES = ["index","leistungen","ueber-mich","kontakt","gutscheine","aktionen","buchung",
         "impressum","datenschutz","cookies",
         "leistung-babybauch","leistung-neugeborene-babys","leistung-familie","leistung-paar",
         "leistung-hochzeit","leistung-boudoir","leistung-portrait","leistung-tier",
         "leistung-bewerbung","leistung-business","leistung-branding","leistung-werbung",
         "leistung-event","leistung-akt","leistung-pass"]

BREAKPOINTS = [("m",390,844),("t",768,1024),("d",1440,900)]
REVEAL = "document.querySelectorAll('.reveal').forEach(e=>e.classList.add('reveal--in'));"

results = {"http":{}, "notes":[]}

with sync_playwright() as p:
    browser = p.chromium.launch()

    # 1) HTTP status for all pages
    ctx = browser.new_context()
    pg = ctx.new_page()
    for name in PAGES:
        r = pg.goto(f"{BASE}/{name}.html", wait_until="domcontentloaded")
        results["http"][name] = r.status if r else None
    pg.goto(f"{BASE}/")
    results["http"]["root/"] = pg.evaluate("()=>document.title")
    ctx.close()

    # 2) Screenshots at 3 breakpoints for key pages (full page)
    shot_pages = ["index","leistungen","ueber-mich","kontakt","gutscheine","aktionen","buchung","leistung-babybauch"]
    for name in shot_pages:
        for tag,w,h in BREAKPOINTS:
            ctx = browser.new_context(viewport={"width":w,"height":h}, device_scale_factor=1)
            pg = ctx.new_page()
            pg.goto(f"{BASE}/{name}.html", wait_until="networkidle")
            pg.evaluate(REVEAL)
            pg.wait_for_timeout(400)
            pg.screenshot(path=os.path.join(OUT,f"{name}_{tag}.png"), full_page=True)
            ctx.close()

    # 3) INTERACTIVITY TESTS ------------------------------------------------
    tests = {}

    # 3a) Cookie banner shows + accept persists + map loads after accept
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/index.html", wait_until="networkidle")
    banner = pg.query_selector("[data-cookie-banner]")
    tests["cookie_banner_visible_initial"] = bool(banner and not banner.get_attribute("hidden") is not None and pg.is_visible("[data-cookie-banner]"))
    tests["cookie_banner_is_visible"] = pg.is_visible("[data-cookie-banner]")
    pg.click("[data-cookie-action='accepted']")
    pg.wait_for_timeout(200)
    tests["cookie_banner_hidden_after_accept"] = not pg.is_visible("[data-cookie-banner]")
    tests["consent_stored"] = pg.evaluate("()=>localStorage.getItem('ls-cookie-consent')")
    # reload: banner should NOT reappear
    pg.goto(f"{BASE}/index.html", wait_until="networkidle")
    tests["cookie_banner_suppressed_on_reload"] = not pg.is_visible("[data-cookie-banner]")
    ctx.close()

    # 3b) Kontakt: map "Karte laden" loads iframe (no consent yet)
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html", wait_until="networkidle")
    tests["map_iframe_before"] = pg.query_selector("[data-map] iframe") is not None
    if pg.is_visible("[data-cookie-banner]"):
        pg.click("[data-cookie-action='declined']")
    pg.click("[data-map-load]")
    pg.wait_for_timeout(500)
    tests["map_iframe_after_klick"] = pg.query_selector("[data-map] iframe") is not None
    tests["map_placeholder_hidden_after"] = not pg.is_visible("[data-map-placeholder]")
    ctx.close()

    # 3c) Form prefill ?leistung=hochzeit
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html?leistung=hochzeit", wait_until="networkidle")
    tests["prefill_leistung_hochzeit"] = pg.eval_on_selector("[name=leistung]","el=>el.value")
    ctx.close()

    # 3d) Form prefill ?leistung=neugeborene-babys -> newborn-baby
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html?leistung=neugeborene-babys", wait_until="networkidle")
    tests["prefill_newborn_map"] = pg.eval_on_selector("[name=leistung]","el=>el.value")
    ctx.close()

    # 3e) Voucher prefill ?leistung=gutschein&betrag=200
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html?leistung=gutschein&betrag=200", wait_until="networkidle")
    tests["prefill_gutschein_select"] = pg.eval_on_selector("[name=leistung]","el=>el.value")
    tests["prefill_gutschein_msg"] = pg.eval_on_selector("[name=nachricht]","el=>el.value")
    ctx.close()

    # 3f) Aktion prefill ?leistung=familie&aktion=Sommer im Atelier
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html?leistung=familie&aktion=Sommer%20im%20Atelier", wait_until="networkidle")
    tests["prefill_aktion_select"] = pg.eval_on_selector("[name=leistung]","el=>el.value")
    tests["prefill_aktion_msg"] = pg.eval_on_selector("[name=nachricht]","el=>el.value")
    ctx.close()

    # 3g) GDPR required + German validation message on empty submit
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(f"{BASE}/kontakt.html", wait_until="networkidle")
    tests["gdpr_required_attr"] = pg.eval_on_selector("[name=datenschutz]","el=>el.required")
    # try to submit empty -> first invalid field validation message
    pg.eval_on_selector("[data-contact-form]","f=>f.requestSubmit ? f.requestSubmit() : f.submit()")
    pg.wait_for_timeout(150)
    tests["validation_vorname_msg"] = pg.eval_on_selector("#f-vorname","el=>el.validationMessage")
    # fill required text fields, leave checkbox unchecked, check checkbox message
    pg.fill("#f-vorname","Anna"); pg.fill("#f-nachname","Test"); pg.fill("#f-email","a@b.de")
    pg.eval_on_selector("[data-contact-form]","f=>f.requestSubmit()")
    pg.wait_for_timeout(150)
    tests["validation_checkbox_msg"] = pg.eval_on_selector("[name=datenschutz]","el=>el.validationMessage")
    # invalid email
    pg.fill("#f-email","not-an-email")
    pg.eval_on_selector("[data-contact-form]","f=>f.requestSubmit()")
    pg.wait_for_timeout(150)
    tests["validation_email_msg"] = pg.eval_on_selector("#f-email","el=>el.validationMessage")
    ctx.close()

    # 3h) External booking link target/rel
    ctx = browser.new_context()
    pg = ctx.new_page()
    pg.goto(f"{BASE}/index.html", wait_until="networkidle")
    tests["book_cta_target"] = pg.eval_on_selector(".nav__cta","a=>a.target+'|'+a.rel+'|'+a.href")
    tests["wa_float_present"] = pg.query_selector(".wa-float") is not None
    tests["wa_float_target"] = pg.eval_on_selector(".wa-float","a=>a.target+'|'+a.href")
    ctx.close()

    # 3i) Slider on leistung page: dots created, next advances scrollLeft
    ctx = browser.new_context(viewport={"width":1440,"height":900})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/leistung-babybauch.html", wait_until="networkidle")
    pg.wait_for_timeout(300)
    tests["slider_dots_count"] = pg.eval_on_selector_all(".slider__dot","d=>d.length")
    sl0 = pg.eval_on_selector("[data-slider-track]","t=>t.scrollLeft")
    pg.click("[data-slider-next]")
    pg.wait_for_timeout(700)
    sl1 = pg.eval_on_selector("[data-slider-track]","t=>t.scrollLeft")
    tests["slider_scroll_before_after"] = f"{sl0}->{sl1}"
    tests["trust_badge_present"] = pg.query_selector(".trust-badge") is not None
    ctx.close()

    # 3j) Mobile nav toggle
    ctx = browser.new_context(viewport={"width":390,"height":844})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/index.html", wait_until="networkidle")
    if pg.is_visible("[data-cookie-banner]"):
        pg.click("[data-cookie-action='declined']")
    tests["nav_links_hidden_mobile_initial"] = pg.eval_on_selector(".nav__links","el=>getComputedStyle(el).display")
    pg.click("[data-nav-toggle]")
    pg.wait_for_timeout(300)
    tests["nav_expanded_after_toggle"] = pg.eval_on_selector("[data-nav-toggle]","b=>b.getAttribute('aria-expanded')")
    tests["nav_open_class"] = pg.eval_on_selector("[data-nav]","n=>n.classList.contains('is-open')")
    pg.screenshot(path=os.path.join(OUT,"index_m_navopen.png"))
    ctx.close()

    # 3k) console errors sweep on key pages
    console_errs = {}
    for name in ["index","kontakt","buchung","leistung-babybauch","gutscheine","aktionen"]:
        ctx = browser.new_context()
        pg = ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERROR:"+str(e)))
        pg.goto(f"{BASE}/{name}.html", wait_until="networkidle")
        pg.wait_for_timeout(400)
        console_errs[name]=errs
    results["console_errors"]=console_errs
    ctx.close()

    results["tests"]=tests
    browser.close()

with open(os.path.join(OUT,"..","results.json"),"w",encoding="utf-8") as fh:
    json.dump(results, fh, ensure_ascii=False, indent=2)
print("DONE")
