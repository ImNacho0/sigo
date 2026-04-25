// tor-proxy.js
// Este servidor actúa como un puente entre la aplicación web en React y la red Tor (SOCKS5).
// El navegador no puede conectarse directamente a un proxy SOCKS5 ni a dominios .onion,
// por tanto enviamos la petición a este script local, y este script usa el proxy Tor.

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Proxy agent apuntando al Tor Browser / Tor Service local
// Por defecto el puerto SOCKS5 de Tor es 9050, o 9150 en Tor Browser
const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050');

app.post('/gateway', async (req, res) => {
    const { target, data } = req.body;

    if (!target || !data) {
        return res.status(400).json({ error: 'Faltan parámetros: target o data' });
    }

    try {
        console.log(`[PROXY] Gateway request -> Target: ${target}`);

        const response = await axios.post(
            'http://uyqqfivvzvpolxnmbgbzqcxpu2k26fmhy5momm7ayuhmg7ic7w774qad.onion/gateway',
            req.body,
            {
                httpAgent: agent,
                httpsAgent: agent,
                headers: {
                    'Authorization': 'Bearer ACORTALAMECA',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        return res.json(response.data);
    } catch (error) {
        console.error('[PROXY ERROR]', error.message);
        if (error.response) {
            return res.status(error.response.status).json(error.response.data);
        }
        return res.status(500).json({ error: 'Fallo al conectar con la red Tor: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`🚀 SERVIDOR PROXY TOR INICIADO EN http://localhost:${PORT}`);
    console.log(`=============================================================`);
    console.log(`Instrucciones:`);
    console.log(`1. Asegúrate de tener Tor ejecutándose de fondo en el puerto 9050.`);
    console.log(`2. La app React se conectará a /api/search.`);
    console.log(`=============================================================\n`);
});
