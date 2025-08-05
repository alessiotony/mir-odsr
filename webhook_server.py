from flask import Flask, request, abort
import subprocess
import hmac
import hashlib
import os

app = Flask(__name__)

# 1. Carrega o segredo da variável de ambiente
WEBHOOK_SECRET = os.environ.get('WEBHOOK_SECRET')

# Validação: Garante que o segredo foi configurado no ambiente
if not WEBHOOK_SECRET:
    # Lança um erro se a variável de ambiente não estiver definida ao iniciar o app
    raise ValueError("A variável de ambiente 'WEBHOOK_SECRET' não foi definida.")

DEPLOY_SCRIPT_PATH = '/var/www/html/odsr/autodeploy.sh'

@app.route('/webhook-deploy', methods=['POST'])
def webhook_deploy():
    # Validar a assinatura do GitHub
    signature = request.headers.get('X-Hub-Signature-256')
    if not signature:
        abort(403)

    sha_name, signature_hash = signature.split('=')
    if sha_name != 'sha256':
        abort(501)

    # Usa o segredo carregado do ambiente
    mac = hmac.new(WEBHOOK_SECRET.encode(), msg=request.data, digestmod=hashlib.sha256)
    if not hmac.compare_digest(mac.hexdigest(), signature_hash):
        abort(403)

    # Executar o script de deploy em segundo plano
    print("Webhook validado. Iniciando script de deploy...")
    try:
        subprocess.Popen([DEPLOY_SCRIPT_PATH], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        print(f"Erro ao iniciar o script de deploy: {e}")
        abort(500)

    return 'Deploy iniciado.', 202

if __name__ == '__main__':
    # Nota: para produção, use um servidor WSGI como Gunicorn ou uWSGI
    app.run(host='0.0.0.0', port=5000)