# Portal ODS Racial UFPB
Portal ODS Racial PB

NPM Node JS
```bash
node -v
npm -v

#  Iniciar o Projeto NPM
npm init -y

# Instalar o Vite: dependência de desenvolvimento, fornecerá o servidor local e a ferramenta para gerar os arquivos de produção.
npm install vite --save-dev

npm install glob --save-dev
```

```bash
# 2. Construa a nova imagem Docker com o código atualizado
docker build --no-cache -t odsr-app .
# 3. Pare o container antigo que está em execução
docker stop odsr
docker rm odsr
# 4. Crie e inicie um NOVO container a partir da NOVA imagem
docker run -d -p 8091:80 --name odsr --restart always odsr-app

```bash
# Rodar a aplicação Python no terminal
python3 -m http.server 8090 --bind 0.0.0.0

```
Este projeto consiste em um web interativo de página única que apresenta os principais módulos do ODS Racial.

---

# 📊 Guia: Como Servir o APP em um Servidor Ubuntu

Este guia descreve o processo completo para configurar um servidor Linux Ubuntu (`srv02`) para hospedar o infográfico one-page. Ele aborda o deploy da aplicação Python, sua persistência com `systemd`, a configuração do firewall `UFW`, e a configuração do Apache como proxy reverso com HTTPS usando Certbot.

---

## ✅ Requisitos

* Servidor Ubuntu (físico ou virtual, ex: `srv02` com IP `150.165.130.85`).
* Acesso `sudo` no servidor.
* Python 3.8+ instalado.
* `pip` e `virtualenv` (ou `python3-venv`) instalados.
* Subdomínio `odsr.ufpb.br` (ou similar) apontando para o IP público do `srv02` (`150.165.130.85`), configurado pela STI.
* Portas 80 (HTTP) e 443 (HTTPS) liberadas no firewall da rede externa (STI).

---

## 0. Manutenção e Atualização do Projeto
O Fluxo de Atualização Correto é:

```bash
ssh usuario@IP_DO_SERVIDOR

sudo git clone https://github.com/alessiotony/mir-odsr.git odsr
sudo chown -R codeinfo:codeinfo /var/www/html/odsr 
sudo chmod -R 755 /var/www/html/odsr

# 1. Baixe as últimas atualizações do código
cd /var/www/html/odsr
git pull

# 2. Construa a nova imagem Docker com o código atualizado
sudo docker build --no-cache -t odsr-app .
# 3. Pare o container antigo que está em execução
sudo docker stop odsr
sudo docker rm odsr
# 4. Crie e inicie um NOVO container a partir da NOVA imagem
sudo docker run -d -p 8091:80 --name odsr --restart always odsr-app

# No seu servidor
docker run --rm -it odsr-app sh
# Dentro do container
ls -la /usr/share/nginx/html

Abra outra sessão SSH no servidor e execute:
```bash
curl http://localhost:8091
```
- Acesse no browser para checar: http://localhost:8091/
- Acesse no browser para checar: http://150.165.130.85:8091/


## 🔄 NOVO: Docker + Nginx na provisão do Site
Instale o Docker no seu servidor, se ainda não tiver.

```bash
cd /var/www/html/odsr
sudo docker build -t odsr-app .

# Inicie o container
sudo docker run -d -p 8091:80 --name odsr --restart always odsr-app
```

## 🌐 A Arquitetura: Apache como "Porteiro", Nginx como "Roteador"
### 🔒 Configurar Apache como Proxy Reverso (HTTP e HTTPS)

O Apache será o ponto de entrada principal para o domínio `odsr.ufpb.br`, encaminhando as requisições para sua aplicação Python.

1.  **Instale o Apache2:**
    ```bash
    sudo apt update
    sudo apt install apache2
    sudo systemctl status apache2 # Verifique se está rodando
    ```

2.  **Ative os módulos necessários para proxy e SSL:**
    ```bash
    sudo a2enmod proxy
    sudo a2enmod proxy_http
    sudo a2enmod ssl
    sudo systemctl restart apache2 # Reinicie o Apache para que os módulos sejam carregados
    ```

3.  **Crie o arquivo de configuração do VirtualHost para o seu domínio:**
```bash
sudo nano /etc/apache2/sites-available/sigov.ufpb.br.conf
```
    
1.  **Cole o seguinte conteúdo no arquivo. **Mantenha as linhas SSL COMENTADAS neste momento** (o Certbot as preencherá depois):**

```apache
# Este bloco VirtualHost lida com requisições HTTP (porta 80)
<VirtualHost *:80>
    ServerName sigov.ufpb.br
    ServerAlias www.sigov.ufpb.br

    # Ativa o módulo de reescrita de URLs
    RewriteEngine on
    # Condições para o redirecionamento: se o ServerName for sigov.ufpb.br ou www.sigov.ufpb.br
    RewriteCond %{SERVER_NAME} =sigov.ufpb.br [OR]
    RewriteCond %{SERVER_NAME} =www.sigov.ufpb.br
    # Regra de reescrita: redireciona para HTTPS com o mesmo host e URI
    RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]

    ErrorLog ${APACHE_LOG_DIR}/sigov.ufpb.br-error.log
    CustomLog ${APACHE_LOG_DIR}/sigov.ufpb.br-access.log combined
</VirtualHost>

# Este bloco VirtualHost é para requisições HTTPS (porta 443)
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName sigov.ufpb.br
    ServerAlias www.sigov.ufpb.br

    # As diretivas SSL são INSERIDAS AQUI PELO CERTBOT.
    # Elas NÃO devem estar comentadas e NÃO devem ser duplicadas.
    # Se você já rodou o Certbot, ele já deve ter preenchido essas linhas corretamente.
    SSLEngine On
    SSLCertificateFile /etc/letsencrypt/live/sigov.ufpb.br/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/sigov.ufpb.br/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # Configurações gerais de proxy
    ProxyPreserveHost On
    ProxyRequests Off

    # REGRAS MAIS ESPECÍFICAS PRIMEIRO
    #ODSR
    ProxyPass /odsr/ http://127.0.0.1:8091/
    ProxyPassReverse /odsr/ http://127.0.0.1:8091/

    # Encaminha https://sigov.ufpb.br/uen/ para o serviço Python na porta 8080
    ProxyPass /uen/ http://127.0.0.1:8080/
    ProxyPassReverse /uen/ http://127.0.0.1:8080/

    # REGRA MAIS GENÉRICA DEPOIS: Para a aplicação da raiz do domínio (porta 8081)
    # Encaminha https://sigov.ufpb.br/ (e qualquer outra coisa não pega por /uen/)
    # para o serviço Python na porta 8081
    ProxyPass / http://127.0.0.1:8081/
    ProxyPassReverse / http://127.0.0.1:8081/

    ErrorLog ${APACHE_LOG_DIR}/sigov.ufpb.br-error.log
    CustomLog ${APACHE_LOG_DIR}/sigov.ufpb.br-access.log combined

    # Garante que o Apache permita o proxy para todos os caminhos
    <Location />
        Require all granted
    </Location>

</VirtualHost>
</IfModule>
```


5.  **Salve o arquivo e ative a configuração do site:**
```bash
systemctl reload apache2 # Recarrega as configurações do Apache
sudo systemctl status apache2.service # Verifique se está ativo
sudo a2ensite sigov.ufpb.br.conf # Ativa seu novo VirtualHost
sudo a2dissite 000-default.conf # Desative o site padrão do Apache (se ainda estiver ativo e causar conflito)
```

1.  **Teste a sintaxe do Apache e reinicie:**
    ```bash
    sudo systemctl restart apache2 # Reinicie o Apache para aplicar as mudanças
    sudo apachectl configtest # Deve retornar "Syntax OK"
    
    ```
2. **Reiniciar** o Container Docker
    ```bash
    # Inicie o container
    sudo docker run -d -p 8081:80 --name odsr --restart always odsr-app

    # No servidor
    cd /var/www/html/odsr
    docker stop odsr
    docker build -t odsr .
    docker start odsr

     # Reinicia o serviço do Docker (isso reiniciará seu container se ele estiver com --restart always)
     docker restart odsr
     # Reinicia o Apache para garantir que ele leu a configuração mais recente
     sudo systemctl restart apache2
    
    # Reinicia o Apache para garantir que ele leu a configuração mais recente
    sudo systemctl restart apache2
   ```

3.  **Teste o acesso HTTP (verifique se retorna a página padrão "It Works!" ou um 404):**
    ```bash
    curl http://odsr.ufpb.br/
    ```
    *O importante é que o Apache esteja respondendo na porta 80 para o domínio.*

---

## 🔒 6. Configurar HTTPS (SSL/TLS) com Certbot

Agora que o Apache está respondendo na porta 80 para seu domínio, vamos obter e instalar o certificado SSL.


```bash
# 1.  **Instale o Certbot e o plugin Apache:**
sudo apt install certbot python3-certbot-apache

# 2.  **Execute o Certbot para obter e configurar o certificado:**
sudo certbot --apache -d odsr.ufpb.br 
# *Siga as instruções do Certbot (e-mail, concordar com termos, escolha de redirecionamento HTTP para HTTPS - escolha '2' para redirecionar).*

# 3.  **Verifique a renovação automática:**
# O Certbot configura automaticamente um `cron job` ou um timer do `systemd` para renovar seu certificado antes que ele expire (geralmente a cada 90 dias). Você pode testar o agendamento com:
```bash
sudo certbot renew --dry-run
```

---

## ✅ 7. Verificação Final

1.  **Acesse o painel no navegador:**
    `https://odsr.ufpb.br/`

    *Você deverá ver seu painel interativo com o cadeado de segurança.*

2.  **Verifique o redirecionamento (opcional):**
    Tente acessar `http://odsr.ufpb.br/odsr/` no navegador. Ele deve ser automaticamente redirecionado para a versão HTTPS.

3.  **Monitore os logs do Apache:**
    ```bash
    sudo tail -f /var/log/apache2/odsr.ufpb.br-access.log
    sudo tail -f /var/log/apache2/odsr.ufpb.br-error.log
    ```
    *Isso ajuda a depurar se houver problemas.*

## Guia de Implementação: Automação com Webhooks
### Passo A: Atualize seu Script auto_deploy.sh
Vamos primeiro corrigir o script de deploy com a lógica de git fetch/reset.

```bash
#!/bin/bash
# Arquivo: /var/www/html/odsr/autodeploy.sh
set -e

echo ">>> Acessando o diretório do projeto..."
cd /var/www/html/odsr || exit

echo ">>> Buscando atualizações do Git (com reset)..."
git fetch origin main
git reset --hard origin/main

echo ">>> Construindo nova imagem Docker..."
docker build -t odsr-app .

echo ">>> Parando e removendo container antigo (se existir)..."
docker stop odsr || true
docker rm odsr || true

echo ">>> Iniciando novo container..."
docker run -d -p 8081:80 --name odsr --restart always odsr-app

echo ">>> Deploy concluído com sucesso!"
```

### Passo B: Crie o "Ouvinte" Webhook com Flask
```bash
# Instale Flask e Gunicorn no seu ambiente virtual Python:
cd /var/www/html/odsr
source venv/bin/activate
pip install Flask Gunicorn
```

Criar o arquivo `webhook_server.py`

```python
# Arquivo: /var/www/html/odsr/webhook_server.py
from flask import Flask, request, abort
import subprocess
import hmac
import hashlib
import os

app = Flask(__name__)

# IMPORTANTE: Crie um "segredo" forte e o configure no GitHub.
# Ex: openssl rand -hex 20
WEBHOOK_SECRET = 'SEU_SEGREDO_SUPER_SECRETO_AQUI'
DEPLOY_SCRIPT_PATH = '/var/www/html/odsr/autodeploy.sh'

@app.route('/webhook-deploy', methods=['POST'])
def webhook_deploy():
    # 1. Validar a assinatura do GitHub
    signature = request.headers.get('X-Hub-Signature-256')
    if not signature:
        abort(403)

    sha_name, signature_hash = signature.split('=')
    if sha_name != 'sha256':
        abort(501)

    mac = hmac.new(WEBHOOK_SECRET.encode(), msg=request.data, digestmod=hashlib.sha256)
    if not hmac.compare_digest(mac.hexdigest(), signature_hash):
        abort(403)

    # 2. Executar o script de deploy em segundo plano
    print("Webhook validado. Iniciando script de deploy...")
    try:
        # Usamos Popen para não bloquear a resposta do webhook
        subprocess.Popen([DEPLOY_SCRIPT_PATH], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        print(f"Erro ao iniciar o script de deploy: {e}")
        abort(500)

    return 'Deploy iniciado.', 202

if __name__ == '__main__':
    app.run()
```

### Configure o Webhook no GitHub
1. Vá para o seu repositório no GitHub > Settings > Webhooks > Add webhook.
2. Payload URL: https://odsr.ufpb.br/webhook-deploy (precisaremos configurar isso no Apache).
3. Content type: application/json.
4. Secret: Cole o mesmo segredo que você definiu no arquivo webhook_server.py.
5. Which events would you like to trigger this webhook? Selecione "Just the push event".
6. Clique em "Add webhook".

### Passo D: Configure o Apache para o Webhook
```bash
sudo nano /etc/apache2/sites-available/odsr.ufpb.br.conf
```

Adicione esta regra ao seu arquivo de configuração do Apache, antes da regra genérica ProxyPass /:
```Apache
# Este bloco VirtualHost é para requisições HTTPS (porta 443)
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerName odsr.ufpb.br
    ServerAlias www.odsr.ufpb.br

    # As diretivas SSL devem estar aqui (geradas pelo Certbot)
    SSLEngine On
    SSLCertificateFile /etc/letsencrypt/live/odsr.ufpb.br/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/odsr.ufpb.br/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf

    # --- INÍCIO DAS REGRAS DE REESCRITA E PROXY ---

    # Configurações gerais de proxy
    ProxyPreserveHost On
    ProxyRequests Off

    # Adicione estas duas linhas para garantir que os cookies e cabeçalhos sejam tratados corretamente
    ProxyPassReverseCookieDomain 127.0.0.1 odsr.ufpb.br
    ProxyPassReverseCookiePath / /

    # 1. Regra para o webhook de deploy (porta 5000)
    ProxyPass /webhook-deploy http://127.0.0.1:5000/webhook-deploy
    ProxyPassReverse /webhook-deploy http://127.0.0.1:5000/webhook-deploy

    # 2. Regra para o painel "UFPB em Números" (porta 8080)
    ProxyPass /uen/ http://127.0.0.1:8080/
    ProxyPassReverse /uen/ http://127.0.0.1:8080/

    # 3. REGRA GENÉRICA PARA TODO O RESTO (site principal no Docker)
    # Esta deve ser a ÚLTIMA regra de proxy.
    # Qualquer pedido que não seja para /webhook-deploy ou /uen/ será enviado para a porta 8081.
    ProxyPass / http://127.0.0.1:8081/
    ProxyPassReverse / http://127.0.0.1:8081/


    # --- FIM DAS REGRAS DE REESCRITA E PROXY ---

    ErrorLog ${APACHE_LOG_DIR}/odsr.ufpb.br-error.log
    CustomLog ${APACHE_LOG_DIR}/odsr.ufpb.br-access.log combined

</VirtualHost>
</IfModule>
```

### Passo E: Crie um Serviço Systemd para o Servidor Webhook
Faremos um http.server para rodar o webhook_server.py de forma profissional com Gunicorn.
Crie o arquivo `sudo nano /etc/systemd/system/odsr-webhook.service`
```ini, TOML
[Unit]
Description=ODS Racial Webhook Listener
After=network.target

[Service]
WorkingDirectory=/var/www/html/odsr

# Carrega as variáveis de ambiente do arquivo que criamos
EnvironmentFile=/home/codeinfo/odsr.env

ExecStart=/var/www/html/odsr/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 webhook_server:app
Restart=always
User=codeinfo
Group=codeinfo

[Install]
WantedBy=multi-user.target

```
Ative e inicie o serviço:
```bash
sudo systemctl daemon-reload
sudo systemctl enable odsr-webhook
sudo systemctl start odsr-webhook
sudo systemctl restart apache2 # Para o Apache ler a nova regra de proxy
```
