import json
from playwright.sync_api import sync_playwright
B="http://localhost:3001"
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page()
    pg.goto(B+"/login"); pg.fill("#email","nicolas@bitaller.co"); pg.fill("#password","bitaller123"); pg.click("button:has-text('Ingresar')"); pg.wait_for_selector("h1:has-text('Resumen')",timeout=60000)
    def reg(placa, cel):
        pg.goto(B+"/registrar"); pg.fill("#placa",placa); pg.wait_for_selector("text=Vehículo nuevo"); pg.fill("#cel",cel); pg.click("button:has-text('Frenos')"); pg.fill("#mano","25000"); pg.click("button:has-text('Guardar y enviar')"); pg.wait_for_selector("[data-testid=registro-ok]"); return pg.inner_text("[data-testid=registro-ok]")
    t1=reg("TPL12A","3155550000"); print("UI1:", t1.replace("\n"," | "))
    t2=reg("ERR12B","3999999999"); print("UI2:", t2.replace("\n"," | "))
    b.close()
reqs=[json.loads(l) for l in open("/home/claude/e2e/graph_requests.jsonl")]
t=[r for r in reqs if r["body"]["to"]=="573155550000"][-1]["body"]
print("PASS plantilla fuera de ventana" if t["type"]=="template" and t["template"]["name"]=="bitaller_comprobante" else "FAIL", json.dumps(t["template"]["components"][0]["parameters"],ensure_ascii=False))
print("PASS error de Meta mostrado" if "No se pudo enviar" in t2 and "131030" in t2 else "FAIL error")
