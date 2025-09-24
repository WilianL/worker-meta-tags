/**
 * Cloudflare Worker para Meta Tags Dinâmicas
 * Detecta bots de redes sociais e serve meta tags personalizadas por subdomínio
 */

// Lista de User-Agents de bots conhecidos (baseado no prerender-node)
const BOT_USER_AGENTS = [
  'googlebot',
  'yahoo',
  'bingbot',
  'baiduspider',
  'facebookexternalhit',
  'twitterbot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'applebot',
  'whatsapp',
  'flipboard',
  'tumblr',
  'bitlybot',
  'skypeuripreview',
  'nuzzel',
  'discordbot',
  'google page speed',
  'qwantify',
  'pinterestbot',
  'bitrix link preview',
  'xing-contenttabreceiver',
  'chrome-lighthouse',
  'telegrambot'
];

// Função para detectar se é um bot
function isBot(userAgent) {
  if (!userAgent) return false;
  
  const ua = userAgent.toLowerCase();
  return BOT_USER_AGENTS.some(botUA => ua.includes(botUA));
}

// Função para extrair subdomínio
function extractSubdomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}

// Função para buscar dados da loja
async function fetchStoreData(subdomain) {
  try {
    const response = await fetch(`https://mevendeai.com/api/stores/by-subdomain/${subdomain}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'CloudflareWorker/1.0'
      },
      cf: {
        timeout: 5000 // 5 segundos timeout
      }
    });

    if (!response.ok) {
      console.log(`API Error: ${response.status} for subdomain: ${subdomain}`);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log(`Fetch Error for subdomain ${subdomain}:`, error.message);
    return null;
  }
}

// Função auxiliar para verificar se uma imagem existe
async function checkImageExists(url) {
  try {
    console.log(`[DEBUG] checkImageExists - Verificando: ${url}`);
    const response = await fetch(url, { method: 'HEAD' });
    
    console.log(`[DEBUG] checkImageExists - Status: ${response.status}`);
    
    // Verificar se a resposta é OK e se o Content-Type é realmente de uma imagem
    if (!response.ok) {
      console.log(`[DEBUG] checkImageExists - Resposta não OK: ${response.status}`);
      return false;
    }
    
    const contentType = response.headers.get('content-type') || '';
    const isImage = contentType.startsWith('image/');
    
    console.log(`[DEBUG] checkImageExists - Content-Type: ${contentType}, isImage: ${isImage}`);
    
    return isImage;
  } catch (error) {
    console.log(`[DEBUG] checkImageExists - Erro: ${error.message}`);
    return false;
  }
}

// Função para obter a URL da imagem da loja
async function getStoreImageUrl(storeData, subdomain) {
  const baseUrl = 'https://mevendeai.com/store-logos/';
  
  console.log(`[DEBUG] getStoreImageUrl - subdomain: ${subdomain}, storeData:`, storeData);
  
  // Como o domínio é o próprio nickname, usamos diretamente o subdomain
  // O PHP sempre salva as imagens como PNG
  const imageUrl = `${baseUrl}${subdomain}.png`;
  console.log(`[DEBUG] Testando URL: ${imageUrl}`);
  
  const exists = await checkImageExists(imageUrl);
  if (exists) {
    console.log(`[DEBUG] Imagem encontrada: ${imageUrl}`);
    return imageUrl;
  }
  
  // Se nenhuma imagem for encontrada, retornar fallback
  console.log(`[DEBUG] Nenhuma imagem encontrada, usando fallback: metalogo.png`);
  return 'https://mevendeai.com/metalogo.png';
}

// Função para gerar HTML com meta tags dinâmicas
async function generateMetaHTML(storeData, subdomain, fullUrl) {
  const storeName = storeData?.name || `${subdomain} Store`;
  const storeDescription = storeData?.description || `Descubra produtos incríveis na ${storeName}. Compre com segurança e receba em casa.`;
  
  // Nova lógica de imagem: usar nickname da loja primeiro, depois subdomain
  const storeImage = await getStoreImageUrl(storeData, subdomain);
  
  const storeColor = storeData?.primary_color || '#4F46E5';
  const storeUrl = fullUrl;

  return `<!DOCTYPE html>
<html lang="pt-BR" prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <!-- Meta Tags Básicas -->
    <title>${storeName} - Loja Online</title>
    <meta name="description" content="${storeDescription}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="${storeName} - Loja Online">
    <meta property="og:description" content="${storeDescription}">
    <meta property="og:image" content="${storeImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${storeUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${storeName}">
    <meta property="og:locale" content="pt_BR">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${storeName} - Loja Online">
    <meta name="twitter:description" content="${storeDescription}">
    <meta name="twitter:image" content="${storeImage}">
    <meta name="twitter:url" content="${storeUrl}">
    
    <!-- WhatsApp Meta Tags -->
    <meta property="og:image:alt" content="Logo da ${storeName}">
    
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="${storeImage}">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, ${storeColor}15, ${storeColor}05);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 500px;
            margin: 2rem;
        }
        .logo {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            object-fit: cover;
            margin: 0 auto 1.5rem;
            border: 4px solid ${storeColor};
            display: block;
        }
        h1 {
            color: ${storeColor};
            margin: 0 0 1rem;
            font-size: 2rem;
            font-weight: 700;
        }
        p {
            color: #666;
            margin: 0 0 2rem;
            line-height: 1.6;
        }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid ${storeColor}30;
            border-radius: 50%;
            border-top-color: ${storeColor};
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .redirect-info {
            font-size: 0.9rem;
            color: #888;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <img src="${storeImage}" alt="${storeName}" class="logo" onerror="this.style.display='none'">
        <h1>${storeName}</h1>
        <p>${storeDescription}</p>
        <div class="loading"></div>
        <div class="redirect-info">
            Redirecionando para a loja...
        </div>
    </div>
    
    <script>
        // Redireciona usuários normais após 2 segundos
        setTimeout(function() {
            window.location.href = '/';
        }, 2000);
    </script>
</body>
</html>`;
}

// Worker principal
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const userAgent = request.headers.get('User-Agent') || '';
      const hostname = url.hostname;
      
      // Log para debug
      console.log(`Request: ${hostname} - UA: ${userAgent}`);
      
      // Verifica se é uma requisição para API PHP
      if (url.pathname.startsWith('/api/')) {
        console.log(`API request detected: ${url.pathname}`);
        
        // Para requisições de API PHP, retorna erro informativo
        // pois Cloudflare Workers não executa PHP
        return new Response(JSON.stringify({
          success: false,
          error: 'API PHP não disponível no Cloudflare Workers. Use Supabase Storage ou configure um servidor PHP separado.'
        }), {
          status: 501,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
          }
        });
      }
      
      // Verifica se é um bot
      const isBotRequest = isBot(userAgent);
      
      // Se não for bot, passa a requisição adiante (para a aplicação React)
      if (!isBotRequest) {
        return fetch(request);
      }
      
      // Extrai o subdomínio
      const subdomain = extractSubdomain(hostname);
      
      // Se não há subdomínio, passa a requisição adiante
      if (!subdomain || subdomain === 'www') {
        return fetch(request);
      }
      
      console.log(`Bot detected for subdomain: ${subdomain}`);
      
      // Busca dados da loja
      const storeData = await fetchStoreData(subdomain);
      
      // Gera HTML com meta tags (sempre usando generateMetaHTML)
      const html = await generateMetaHTML(storeData, subdomain, request.url);
      console.log(`Generated meta HTML for subdomain: ${subdomain}`);
      
      // Retorna HTML com headers apropriados
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300', // Cache por 5 minutos
          'X-Robots-Tag': 'index, follow',
          'X-Bot-Detected': 'true',
          'X-Subdomain': subdomain
        },
        status: 200
      });
      
    } catch (error) {
      console.error('Worker Error:', error);
      
      // Em caso de erro, passa a requisição adiante
      return fetch(request);
    }
  }
};