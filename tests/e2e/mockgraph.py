import json
from http.server import BaseHTTPRequestHandler, HTTPServer
LOG="/home/claude/e2e/graph_requests.jsonl"
open(LOG,"w").close()
n=[0]
class H(BaseHTTPRequestHandler):
    def do_POST(self):
        body=self.rfile.read(int(self.headers.get('Content-Length',0))).decode()
        with open(LOG,"a") as f: f.write(json.dumps({"path":self.path,"auth":self.headers.get("Authorization"),"body":json.loads(body)})+"\n")
        n[0]+=1
        b=json.loads(body)
        if b.get("to")=="573999999999":
            self.send_response(400); self.send_header("Content-Type","application/json"); self.end_headers()
            self.wfile.write(json.dumps({"error":{"message":"(#131030) Recipient phone number not in allowed list"}}).encode()); return
        self.send_response(200); self.send_header("Content-Type","application/json"); self.end_headers()
        self.wfile.write(json.dumps({"messaging_product":"whatsapp","messages":[{"id":f"wamid.TEST{n[0]}"}]}).encode())
    def log_message(self,*a): pass
HTTPServer(("127.0.0.1",4010),H).serve_forever()
