import os
from playwright.sync_api import sync_playwright
OUT=r"C:\repositories\Fotostudio Light-Style\Client_Andi-Moeller\07_site\site\scratchpad\review3\02_ux"
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={"width":390,"height":844})
    pg=ctx.new_page()
    pg.goto("http://127.0.0.1:8899/index.html", wait_until="networkidle")
    pg.evaluate("document.querySelectorAll('.reveal').forEach(e=>e.classList.add('reveal--in'));")
    pg.wait_for_timeout(500)
    # scroll to gallery and report natural sizes
    info=pg.eval_on_selector_all(".gallery__item img","els=>els.map(i=>({src:i.getAttribute('src'),nat:i.naturalWidth+'x'+i.naturalHeight,box:Math.round(i.getBoundingClientRect().width)+'x'+Math.round(i.getBoundingClientRect().height)}))")
    print(info)
    el=pg.query_selector(".gallery")
    el.scroll_into_view_if_needed()
    pg.wait_for_timeout(400)
    el.screenshot(path=os.path.join(OUT,"index_m_gallery.png"))
    b.close()
