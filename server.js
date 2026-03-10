const http = require('http');
const fs = require('fs');
const path = require('path');

// Array para armazenar conexões WebSocket
const clients = [];

const server = http.createServer((req, res) => {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Endpoint para Server-Sent Events (live reload)
    if (req.url === '/reload') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
        });
        
        // Adicionar cliente à lista
        clients.push(res);
        
        // Enviar evento de conexão
        res.write('data: connected\n\n');
        
        // Remover cliente quando desconectar
        req.on('close', () => {
            const index = clients.indexOf(res);
            if (index > -1) {
                clients.splice(index, 1);
            }
        });
        
        return;
    }

    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    
    // Verificar se o arquivo existe
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end('<h1>404 - Arquivo não encontrado</h1>');
            return;
        }
        
        // Determinar o tipo de conteúdo
        const ext = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (ext) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
        }
        
        // Ler e servir o arquivo
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/html' });
                res.end('<h1>500 - Erro interno do servidor</h1>');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

// Watch para monitorar mudanças nos arquivos
const watchFiles = ['index.html', 'server.js'];
watchFiles.forEach(file => {
    fs.watchFile(path.join(__dirname, file), (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            console.log(`🔄 Arquivo ${file} foi modificado - Recarregando...`);
            // Notificar todos os clientes conectados
            clients.forEach(client => {
                try {
                    client.write('data: reload\n\n');
                } catch (err) {
                    // Cliente desconectado, remover da lista
                    const index = clients.indexOf(client);
                    if (index > -1) {
                        clients.splice(index, 1);
                    }
                }
            });
        }
    });
});

const PORT = 3016;
server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    console.log('📝 Aplicação de postagem do Quatro Takes pronta!');
    console.log('🔄 Live reload ativado - Modificações serão detectadas automaticamente');
});
