## Criar o Arquivo de Ambiente Seguro
Vamos criar um arquivo para armazenar nosso segredo. É uma boa prática colocá-lo em um local seguro, como o diretório home do usuário que roda o serviço.

```Bash
# Substitua 'codeinfo' pelo nome do seu usuário de serviço, se for diferente
sudo nano /home/codeinfo/odsr.env
Dentro deste arquivo, cole o seguinte conteúdo, substituindo SEU_SEGREDO_GERADO_AQUI pelo segredo que você copiou no passo anterior:

# Arquivo: /home/codeinfo/odsr.env
```ini, TOML
# openssl rand -hex 20
WEBHOOK_SECRET=SEU_SEGREDO_GERADO_AQUI
```

Passo de Segurança Crucial: Altere as permissões do arquivo para que apenas o proprietário (o usuário codeinfo) possa ler e escrever nele. Isso impede que outros usuários no servidor vejam seu segredo.

```Bash
# Garante que o proprietário do arquivo é o usuário correto
sudo chown codeinfo:codeinfo /home/codeinfo/odsr.env
# Define as permissões: apenas o proprietário pode ler/escrever (600)
sudo chmod 600 /home/codeinfo/odsr.env
```

### Passo 3: Atualizar o Serviço systemd
Agora, vamos dizer ao serviço do seu webhook para carregar as variáveis deste novo arquivo antes de iniciar o aplicativo Python.



```Bash
# Edite o arquivo de serviço do webhook:
sudo nano /etc/systemd/system/odsr-webhook.service
```

Adicione a diretiva EnvironmentFile na seção [Service], logo antes da linha ExecStart.

```Ini, TOML
[Unit]
Description=ODS Racial Webhook Listener
After=network.target

[Service]
WorkingDirectory=/var/www/html/odsr

# >>> ADICIONE ESTA LINHA <<<
# Carrega as variáveis de ambiente do arquivo que criamos
EnvironmentFile=/home/codeinfo/odsr.env

ExecStart=/var/www/html/odsr/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:5000 webhook_server:app
Restart=always
User=codeinfo
Group=codeinfo

[Install]
WantedBy=multi-user.target
```

### Passo 4: Recarregar e Reiniciar o Serviço
Para que as mudanças tenham efeito, precisamos que o systemd releia os arquivos de configuração e reinicie o serviço.

```Bash

# Informa ao systemd que os arquivos de serviço foram alterados
sudo systemctl daemon-reload

# Reinicia o serviço do webhook para que ele carregue a nova variável de ambiente
sudo systemctl restart odsr-webhook

# Define 'codeinfo' como o dono e grupo do arquivo
sudo chown codeinfo:codeinfo /var/www/html/odsr/autodeploy.sh

# Define as permissões para "ler, escrever e executar" para o dono (7)
# e "ler e executar" para o grupo e outros (5)
sudo chmod 755 /var/www/html/odsr/autodeploy.sh

# Adiciona o usuário 'codeinfo' ao grupo 'docker'
sudo usermod -aG docker codeinfo

# Reinicia o serviço do Docker
sudo systemctl restart docker
```

### Verificação Final
Para ter certeza de que tudo está funcionando, você pode verificar os logs do serviço:

```Bash
sudo systemctl status odsr-webhook
sudo systemctl status dockergi
sudo journalctl -u odsr-webhook -f
```

