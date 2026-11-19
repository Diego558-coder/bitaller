import json, hmac, hashlib, urllib.request, time
B="http://localhost:3001"; SECRET=b"supersecreto"
def post_webhook(payload, sign=True, secret=SECRET):
    raw=json.dumps(payload).encode()
    h={"Content-Type":"application/json"}
    if sign: h["X-Hub-Signature-256"]="sha256="+hmac.new(secret,raw,hashlib.sha256).hexdigest()
    req=urllib.request.Request(B+"/api/whatsapp/webhook",data=raw,headers=h,method="POST")
    try:
        r=urllib.request.urlopen(req); return r.status, r.read().decode()
    except urllib.error.HTTPError as e: return e.code, e.read().decode()
def msg(frm, text, mid):
    return {"object":"whatsapp_business_account","entry":[{"id":"WABA","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"1234567890"},"contacts":[{"wa_id":frm}],"messages":[{"from":frm,"id":mid,"timestamp":str(int(time.time())),"type":"text","text":{"body":text}}]}}]}]}
res=[]
def ok(n,c,x=""): res.append(c); print(("PASS " if c else "FAIL ")+n, x)
s,b=post_webhook(msg("573100000042","Hola","wamid.in1"),sign=False); ok("rechaza webhook sin firma", s==401, str(s))
s,b=post_webhook(msg("573100000042","Hola","wamid.in1"),secret=b"otro"); ok("rechaza firma incorrecta", s==401, str(s))
s,b=post_webhook(msg("573100000042","historial XYZ45F","wamid.in2")); ok("acepta webhook firmado", s==200, b)
s,b=post_webhook(msg("573100000042","historial XYZ45F","wamid.in2")); ok("ignora reintento duplicado de Meta", s==200)
time.sleep(0.5)
reqs=[json.loads(l) for l in open("/home/claude/e2e/graph_requests.jsonl")]
r=reqs[-1]
ok("responde por Graph API al número correcto", r["path"]=="/v21.0/1234567890/messages" and r["body"]["to"]=="573100000042" and r["auth"]=="Bearer EAAtest", r["path"])
ok("respuesta es texto (ventana de 24 h abierta) con historial", r["body"]["type"]=="text" and "Historial de XYZ45F" in r["body"]["text"]["body"])
ok("solo una respuesta pese al duplicado", len(reqs)==1, str(len(reqs)))
# estado de entrega
st={"object":"whatsapp_business_account","entry":[{"changes":[{"field":"messages","value":{"statuses":[{"id":"wamid.TEST1","status":"read","recipient_id":"573100000042"}]}}]}]}
s,b=post_webhook(st); ok("procesa estados de entrega", s==200)
print(f"{sum(res)}/{len(res)}")
