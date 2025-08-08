// js/app.js - PONTO DE ENTRADA PRINCIPAL (VERSÃO CORRIGIDA)

import { iniciarAplicacao } from './core/inicializacao.js';
import { setupMobileMenuAndNav } from './core/navegacao.js';
// ALTERADO: Importa a CLASSE MapController em vez da função initMap
import { MapController } from './map.js';

// --- FUNÇÕES DE EFEITOS VISUAIS ---

function setupHeaderScroll() {
    const header = document.querySelector('header');
    if (!header) return;

    const isHomepage = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html');

    const handleScroll = () => {
        if (isHomepage) {
            header.classList.toggle('bg-fundo-escuro', window.scrollY > 50);
            header.classList.toggle('bg-transparent', window.scrollY <= 50);
        }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
}

function setupParticles() {
    const particleContainer = document.getElementById('particles-hero');
    if (particleContainer && window.tsParticles) { // Verifica se tsParticles está disponível
        tsParticles.load("particles-hero", {
            fullScreen: {enable: false},
            background: { color: { value: "transparent" } },
            fpsLimit: 60,
            particles: {
                number: { value: 80, density: { enable: true, area: 800 } },
                color: { value: ["#ffffffff", "#783C00","#e4ca05ff", 
                    "#202adeff", "#e67f12ff", "#19c249ff","#c21919ff"] }, 
                opacity: {
                    value: 0.6,
                    animation: { enable: true, speed: 1, minimumValue: 0.3, sync: false }
                },
                size: {
                    value: { min: 2, max: 8 },
                    animation: { enable: true, speed: 2, minimumValue: 1, sync: false }
                },
                move: {
                    enable: true,
                    speed: { min: 0.2, max: 1 },
                    direction: "none",
                    outModes: { default: "out" },
                    random: true,
                    straight: false
                },
                links: {
                    enable: true,
                    distance: 500,
                    color: "#FFDCC5",
                    opacity: 0.2,
                    width: 1
                }
            },
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    onClick: { enable: true, mode: "push" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 },
                    push: { quantity: 4 }
                }
            },
            detectRetina: true
        });
    }
}

// --- INICIALIZAÇÃO DA APLICAÇÃO ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado. Iniciando aplicação...");

    setupParticles();

    iniciarAplicacao().then(success => {
        if (success) {
            console.log("Conteúdo renderizado. Configurando listeners...");
            setupMobileMenuAndNav();
            setupHeaderScroll();

            // ALTERADO: Lógica de inicialização do mapa usando a nova classe
            if (document.getElementById('map-container')) {
                console.log("Container do mapa encontrado. Tentando inicializar MapController...");
                try {
                    const mapApp = new MapController('map-container');
                    mapApp.init();
                    console.log("Controlador do mapa inicializado com sucesso.");
                } catch (error) {
                    // Este bloco agora só será acionado por erros DENTRO da classe MapController
                    console.error("Erro durante a inicialização da classe MapController:", error);
                    alert("Ocorreu um erro crítico ao tentar renderizar o mapa.");
                }
            }
        } else {
            console.error("A função iniciarAplicacao() falhou e retornou false.");
        }
    }).catch(error => {
        // Captura erros que possam ocorrer dentro da própria função iniciarAplicacao
        console.error("Erro crítico na promessa de iniciarAplicacao():", error);
    });
});